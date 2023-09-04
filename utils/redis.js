#!/usr/bin/node

import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  _connected = true;
  constructor() {
    this._client = createClient()
      .on('error', (error) => {
        console.log(error);
        this._connected = false;
      });
      //.on('connect', () => {
      //  this._connected = true;
      //});
  }

  isAlive() {
    return this._connected;
  }

  get(key) {
    const get = promisify(this._client.get).bind(this._client);
    return get(key);
  }

  set(key, value, exp) {
    this._client.set(key, value, (error, reply) => {
      if (!error) {
        this._client.expire(key, exp);
      }
    });
  }

  del(key) {
    this._client.del(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
