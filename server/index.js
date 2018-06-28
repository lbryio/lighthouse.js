import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Koa from 'koa';
import logger from 'koa-logger';
import helmet from 'koa-helmet';
import routing from './routes/';
import { port } from './config';
import winston from 'winston';
require('winston-daily-rotate-file');

// Setup logging
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { colorize: true, timestamp: true, prettyPrint: true });
winston.add(winston.transports.DailyRotateFile, {
  filename: 'lighthouse-%DATE%.log',
  dirname: './logs',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
})

// Create Koa Application
const app = new Koa();

app
  .use(logger())
  .use(bodyParser())
  .use(helmet())
  .use(cors());

routing(app);

// Start the application
app.listen(port, () => winston.log('info', `Lighthouse API server is running at http://localhost:${port}/`));

export default app;
