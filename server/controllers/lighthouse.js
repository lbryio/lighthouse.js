import 'babel-polyfill';
import winston from 'winston';
import winstonStream from 'winston-stream';
import { sync, getStats } from '../utils/importer';
import elasticsearch from 'elasticsearch';

const loggerStream = winstonStream(winston, 'info');

const eclient = new elasticsearch.Client({
  host: 'http://localhost:9200',

  log: {
    level: 'info',
    type: 'stream',
    stream: loggerStream,
  },
});

function getResults(input) {
  return eclient.search({
    index: "claims",
    body: {
      "query": {
        "bool": {
          "must": {
            "query_string": {
              "query": input.trim(),
              "fields": [
                "name",
                "value.stream.metadata.author",
                "value.stream.metadata.title",
                "value.stream.metadata.description"
              ]
            }
          }
        }
      }
    }
  });
}

function getAutoComplete(input) {
  return eclient.search({
    index: "claims",
    _source: ["name", "value.stream.metadata.title", "value.stream.metadata.author"],
    body: {
      "query": {
        "bool": {
          "must": {
            "query_string": {
              "query": input.trim(),
              "fields": [
                "name",
                "value.stream.metadata.title",
                "value.stream.metadata.author"
              ]
            }
          }
        }
      }
    }
  });
}

class LighthouseControllers {
  /* eslint-disable no-param-reassign */
  // Start syncing blocks...
  startSync() {
    winston.log('info', '[Importer] Started importer, indexing claims.');
    sync();
  }
  /**
   * Search API Endpoint.
   * @param {ctx} Koa Context
   */
  async search(ctx) {
    await getResults(ctx.query.s).then(function (result) {
      let results = result.hits.hits;
      let cResults = [];
      for (let pResult of results) {
        cResults.push(pResult._source);
      }
      ctx.body = cResults;
    });
  }


 /**
 * Autocomplete API Endpoint.
 * @param {ctx} Koa Context
 */
  async autoComplete(ctx) {
    await getAutoComplete(ctx.query.s).then(function (result) {
      let results = result.hits.hits;
      let cResults = [];
      for (let pResult of results) {
        cResults.push(pResult._source);
      }
      ctx.body = cResults;
    });
  }
  /**
   * Info about the api here
   * @param {ctx} Koa Context
   */
  async info(ctx) {
    ctx.body = 'Info...';
  }

  /**
   * Status of the api here
   * @param {ctx} Koa Context
   */
  async status(ctx) {
    ctx.body = getStats();
  }

  /* eslint-enable no-param-reassign */
}

export default new LighthouseControllers();
