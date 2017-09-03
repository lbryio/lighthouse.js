import 'babel-polyfill';
import winston from 'winston';
import winstonStream from 'winston-stream';
import { sync, getStats } from '../utils/importer';
import elasticsearch from 'elasticsearch';

const loggerStream = winstonStream(winston, 'info');

const eclient = new elasticsearch.Client({
  host: 'http://elastic:changeme@localhost:9200',
  log : {
    level : 'info',
    type  : 'stream',
    stream: loggerStream,
  },
});

function getSuggestions (input) {
  return eclient.suggest({
    index: 'claims',
    body : {
      'claim': {
        'text'      : input,
        'completion': {
          'field': 'suggest_name',
        },
      },
    },
  });
}

class LighthouseControllers {
  /* eslint-disable no-param-reassign */
  // Start syncing blocks...
  startSync () {
    winston.log('info', '[Importer] Started importer, indexing claims.');
    sync();
  }
  /**
   * Search api here
   * @param {ctx} Koa Context
   */
  async search (ctx) {
    await getSuggestions(ctx.query.s).then(function (result) {
      ctx.body = result;
    });
    // ctx.body = 'Search...';
  }

  /**
   * Info about the api here
   * @param {ctx} Koa Context
   */
  async info (ctx) {
    ctx.body = 'Info...';
  }

  /**
   * Status of the api here
   * @param {ctx} Koa Context
   */
  async status (ctx) {
    ctx.body = getStats();
  }

  /* eslint-enable no-param-reassign */
}

export default new LighthouseControllers();
