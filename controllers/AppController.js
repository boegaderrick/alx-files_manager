import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AppController {
  static getStatus(request, response) {
    const dbStatus = dbClient.isAlive();
    const redisStatus = redisClient.isAlive();
    response
      .status(200)
      .send({ redis: redisStatus, db: dbStatus });
  }

  static async getStats(request, response) {
    const fileCount = await dbClient.nbFiles();
    const userCount = await dbClient.nbUsers();
    response
      .status(200)
      .send({ users: userCount, files: fileCount });
  }
}

export default AppController;
