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

/**
 * @api {get} /search Main Search API
 * @apiGroup Search
 * @apiParam {String} s The search text (Required)
 * @apiParam {Integer} size Amount of results to return as max
 * @apiParam {Integer} from The number to start from, good for pagination.
 * @apiParamExample {url} Example
 *    http://localhost/api/lighthouse/search?s=fillerino
 * @apiSuccess {Array[]}  array List of search response, each containing the value below.
 * @apiSuccess {Object[]}  result A search result
 * @apiSuccess {String}   result.name The name of the claim.
 * @apiSuccess {String}   result.claimId The claimId of the claim.
 * @apiSuccess {Object[]}   result.value The decoded value of the metadata
 * @apiSuccessExample {json} Success
 *    HTTP/1.1 200 OK
[
  {
    "name":"fillerino-js-test",
    "claimId":"7bfed722c678a0e0ceb9fb90974bfcc65f528813",
    "value":{
      "version":"_0_0_1",
      "claimType":"streamType",
      "stream":{
        "source":{
          "source":"7ded8c9c7527fce26ced886adcd2eab9fc424c0126eff6572f0615ab66ec3bfbdbbfc1603d95cecd81c9b93fa8ecfbf8",
          "version":"_0_0_1",
          "contentType":"text/html",
          "sourceType":"lbry_sd_hash"
        },
        "version":"_0_0_1",
        "metadata":{
          "license":"Public Domain",
          "description":"A test file which tries to communicate with the daemon(from inside the app).",
          "language":"en",
          "title":"Text Javascript Injection",
          "author":"",
          "version":"_0_1_0",
          "nsfw":false,
          "licenseUrl":"",
          "preview":"",
          "thumbnail":""
        }
      }
    }
  },
  {...},
  {...}
]
 */
router.get('/search', LighthouseControllers.search);

/**
 * @api {get} /autocomplete Autocomplete API
 * @apiGroup Search
 * @apiParam {String} s The text to be autocompleted (Required).
 * @apiParamExample {url} Example
 *    http://localhost/api/lighthouse/autocomplete?s=fillerino
 * @apiSuccess {Array[]}  array List of search response, each containing the value below.
 * @apiSuccessExample {json} Success
 *    HTTP/1.1 200 OK
 *
 *    ["@Fillerino","fillerino-js-test","Text Javascript Injection"]
 */
router.get('/autocomplete', LighthouseControllers.autoComplete);

/**
 * @api {get} /status Status
 * @apiGroup Search
 * @apiSuccess {Array[]}  array Will contain information about lighthouse.
 * @apiSuccessExample {json} Success
 *    HTTP/1.1 200 OK
 *
 *    {"err": "Not done yet, will be added"}
 */
router.get('/status', LighthouseControllers.status);

export default router;
