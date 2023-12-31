// eslint-disable-next-line no-useless-rename
import { ObjectId as ObjectId } from 'mongodb';
import fs from 'fs';
import mimeTypes from 'mime-types';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
    if (!userId || !user) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    const {
      name,
      type,
      parentId = 0,
      isPublic = false,
      data,
    } = request.body;
    if (!name) {
      response
        .status(400)
        .send({ error: 'Missing name' });
      return;
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      response
        .status(400)
        .send({ error: 'Missing type' });

      return;
    }
    if (!data && type !== 'folder') {
      response
        .status(400)
        .send({ error: 'Missing data' });
      return;
    }
    if (parentId !== 0) {
      const parent = await dbClient.findOne('files', { _id: ObjectId(parentId) });
      if (!parent) {
        response
          .status(400)
          .send({ error: 'Parent not found' });
        return;
      }
      if (parent.type !== 'folder') {
        response
          .status(400)
          .send({ error: 'Parent is not a folder' });
        return;
      }
    }
    if (type === 'folder') {
      const file = await dbClient.insertOne('files', {
        name,
        type,
        isPublic,
        userId: ObjectId(userId),
        parentId: (parentId !== 0 ? ObjectId(parentId) : parentId.toString()),
      });
      response
        .status(201)
        .send(file.ops[0]);
    } else {
      const decodedData = Buffer.from(data, 'base64').toString('utf-8');
      const folderPath = (
        process.env.FOLDER_PATH ? process.env.FOLDER_PATH : '/tmp/files_manager'
      );
      const fileName = uuidv4();
      const localPath = path.join(folderPath, fileName);
      fs.mkdirSync(path.dirname(localPath), { recursive: true });
      fs.writeFile(localPath, decodedData, (error) => {
        if (error) { throw error; }
      });
      const file = await dbClient.insertOne('files', {
        name,
        type,
        isPublic,
        localPath,
        userId: ObjectId(userId),
        parentId: (parentId !== 0 ? ObjectId(parentId) : parentId.toString()),
      });
      response
        .status(201)
        .send(file.ops[0]);
    }
  }

  static async getShow(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
    if (!userId || !user) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    const fileId = request.params.id;
    const file = await dbClient.findOne('files', {
      _id: ObjectId(fileId), userId: ObjectId(userId),
    });
    if (!file) {
      response
        .status(404)
        .send({ error: 'Not found' });
      return;
    }
    response
      .status(200)
      .send(file);
  }

  static async getIndex(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
    if (!userId || !user) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    const {
      parentId = '0',
      page = 0,
    } = request.query;
    const list = await dbClient.getPage('files', page, {
      userId: ObjectId(userId),
      parentId: parentId === '0' ? parentId : ObjectId(parentId),
    });
    response
      .status(200)
      .send(list);
  }

  static async putPublish(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
    if (!userId || !user) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    const fileId = request.params.id;
    const file = await dbClient.findOne('files', {
      userId: ObjectId(userId), _id: ObjectId(fileId),
    });
    if (!file) {
      response
        .status(404)
        .send({ error: 'Not found' });
      return;
    }
    await dbClient.updateOne('files', file, { isPublic: true });
    file.isPublic = true;
    response
      .status(200)
      .send(file);
  }

  static async putUnpublish(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
    if (!userId || !user) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    const fileId = request.params.id;
    const file = await dbClient.findOne('files', {
      userId: ObjectId(userId), _id: ObjectId(fileId),
    });
    if (!file) {
      response
        .status(404)
        .send({ error: 'Not found' });
      return;
    }
    await dbClient.updateOne('files', file, { isPublic: false });
    file.isPublic = false;
    response
      .status(200)
      .send(file);
  }

  static async getFile(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const fileId = request.params.id;
    const file = await dbClient.findOne('files', { _id: ObjectId(fileId) });
    if (!file || (!file.isPublic && !userId)) {
      response
        .status(404)
        .send({ error: 'Not found' });
      return;
    }
    if (file.type === 'folder') {
      response
        .status(400)
        .send("A folder doesn't have content");
      return;
    }
    fs.readFile(file.localPath, 'utf-8', (error, data) => {
      if (error) {
        response
          .status(404)
          .send({ error: 'Not found' });
      } else {
        response
          .setHeader('Content-Type', mimeTypes.lookup(file.name))
          .status(200)
          .send(data);
      }
    });
  }
}

export default FilesController;
