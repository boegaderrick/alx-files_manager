import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(request, response) {
    const authHeader = request.headers.authorization;
    if (!authHeader.startsWith('Basic ')) {
      response
        .statuc(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    const base64String = authHeader.split(' ')[1];
    const [
      email,
      password,
    ] = Buffer.from(base64String, 'base64').toString('utf-8').split(':');
    if (!email || !password) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    const user = await dbClient.findOne('users', { email, password: sha1(password) });
    if (!user) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    const token = uuidv4();
    redisClient.set(`auth_${token}`, user._id, 86400);
    response
      .status(200)
      .send({ token });
  }

  static async getDisconnect(request, response) {
    const token = request.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      response
        .status(401)
        .send({ error: 'Unauthorized' });
      return;
    }
    redisClient.del(`auth_${token}`);
    response
      .status(204)
      .send();
  }
}

export default AuthController;
