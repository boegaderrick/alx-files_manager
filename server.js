#!/usr/bin/node
import { express } from 'express';
import { router } from './routes/index';

const port = process.env.PORT ? process.env.PORT : 5000;
const app = express();

app.use('/', router);
app.listen(port);

export default app;
