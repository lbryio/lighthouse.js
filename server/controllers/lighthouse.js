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
  if(input.size == undefined) input.size = 10;
  if(input.from == undefined) input.from = 0;
  return eclient.search({
    index: "claims",
    _source: ["name", "value", "claimId"],
    body: {
      "query": {
        "bool": {
          "must": {
            "query_string": {
              "query": '*' + input.s.trim() + '*',
              "fields": [
                "name",
                "value.stream.metadata.author",
                "value.stream.metadata.title",
                "value.stream.metadata.description"
              ]
            }
          }
        }
      },
      size: input.size,
      from: input.from
    }
  });
}

function getAutoComplete(input) {
  if(input.size == undefined) input.size = 10;
  if(input.from == undefined) input.from = 0;
  return eclient.search({
    index: "claims",
    _source: ["name", "value.stream.metadata.title", "value.stream.metadata.author"],
    body: {
      "query": {
        "bool": {
          "must": {
            "query_string": {
              "query": "*" + input.s.trim() + "*",
              "fields": [
                "name",
                "value.stream.metadata.title",
                "value.stream.metadata.author"
              ]
            }
          }
        }
      },
      size: input.size,
      from: input.from
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
    await getResults(ctx.query).then(function (result) {
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
    await getAutoComplete(ctx.query).then(function (result) {
      let results = result.hits.hits;
      let cResults = [];
      for (let pResult of results) {
        cResults.push(pResult._source.name);
        if(pResult._source.value !== undefined){
          cResults.push(pResult._source.value.stream.metadata.title);
          cResults.push(pResult._source.value.stream.metadata.author);          
        }
      }

      var clean = new Array();
      for (var i = 0; i < cResults.length; i++) {
        if (cResults[i] && cResults[i].length > 3 && clean.indexOf(cResults[i]) == -1) {
          clean.push(cResults[i]);
        }
      }

      ctx.body = clean;
    });
  }
  /**
   * Info about the api here
   * @param {ctx} Koa Context
   */
  async info(ctx) {
    ctx.body = "Lighthouse";
  }

  /**
   * Status of the api here
   * @param {ctx} Koa Context
   */
  async status(ctx) {
    ctx.body =  eclient.getStats();
  }

  /* eslint-enable no-param-reassign */
}

export default new LighthouseControllers();
