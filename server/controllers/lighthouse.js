import 'babel-polyfill';
import { sync, getStats } from '../utils/importer';
// import elasticSearch from 'elasticsearch';
/* const eclient = new elasticSearch.Client({
   host: 'http://elastic:changeme@localhost:9200',
   log : 'info',
   }); */
class LighthouseControllers {
  /* eslint-disable no-param-reassign */
  // Start syncing blocks...
  startSync () {
    sync(200000);
  }
  /**
   * Search api here
   * @param {ctx} Koa Context
   */
  async search (ctx) {
    ctx.body = 'Search...';
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
