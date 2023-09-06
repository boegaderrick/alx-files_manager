// eslint-disable-next-line no-useless-rename
import { ObjectId as ObjectId } from 'mongodb';
import fs from 'fs';
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
}

export default FilesController;
