import 'babel-polyfill';

class LighthouseControllers {
  /* eslint-disable no-param-reassign */

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
    ctx.body = 'Status...';
  }

  /* eslint-enable no-param-reassign */
}

export default new LighthouseControllers();
