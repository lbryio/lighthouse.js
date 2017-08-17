import 'babel-polyfill';
import Router from 'koa-router';
import { baseApi } from '../config';
import LighthouseControllers from '../controllers/lighthouse';

LighthouseControllers.startSync();

const api = 'lighthouse';

const router = new Router();

router.prefix(`/${baseApi}/${api}`);

// GET /api/lighthouse
router.get('/', LighthouseControllers.info);

// GET /api/search
router.get('/search', LighthouseControllers.search);

// GET /api/ligthouse/status
router.get('/status', LighthouseControllers.status);

export default router;
