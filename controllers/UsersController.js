// eslint-disable-next-line no-useless-rename
import { ObjectId as ObjectId } from 'mongodb';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(request, response) {
    /* eslint-disable quote-props */
    /* eslint-disable prefer-destructuring */
    const email = request.body.email;
    const password = request.body.password;
    if (!email || !password) {
      response
        .status(400)
        .send({ error: !email ? 'Missing email' : 'Missing password' });
      return;
    }
    if (await dbClient.findOne('users', { 'email': email })) {
      response
        .status(400)
        .send({ error: 'Already exist' });
      return;
    }
    const insertResponse = await dbClient.insertOne('users', {
      'email': email, 'password': sha1(password),
    });
    response
      .status(201)
      .send({ 'email': email, 'id': insertResponse.insertedId });
  }

  static async getMe(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    const user = await dbClient.findOne('users', { _id: ObjectId(userId) });
    if (!userId || !user) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    response
      .status(200)
      .send({ email: user.email, id: user._id });
  }
}

export default UsersController;
