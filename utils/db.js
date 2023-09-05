#!/usr/bin/node
import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST ? process.env.DB_HOST : 'localhost';
const port = process.env.DB_PORT ? process.env.DB_PORT : '27017';
const database = process.env.DB_DATABASE ? process.env.DB_DATABASE : 'files_manager';
const url = `mongodb://${host}:${port}/${database}/`;

class DBClient {
  constructor() {
    this._connected = false;
    MongoClient.connect(url, { useUnifiedTopology: true }, (error, db) => {
      if (error) {
        console.log(error);
      } else {
        this._client = db.db(database);
        this._connected = true;
      }
    });
  }

  isAlive() {
    return this._connected;
  }

  nbUsers() {
    if (this.isAlive()) {
      return this._client.collection('users').countDocuments();
    }
    return undefined;
  }

  nbFiles() {
    if (this.isAlive()) {
      return this._client.collection('files').countDocuments();
    }
    return undefined;
  }
}

const dbClient = new DBClient();

export default dbClient;