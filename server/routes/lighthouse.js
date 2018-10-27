import 'babel-polyfill';
import Router from 'koa-router';
import LighthouseControllers from '../controllers/lighthouse';

LighthouseControllers.startSync();

const router = new Router();

// GET /api/lighthouse
router.get('/', LighthouseControllers.info);

/**
 * @oas [get] /search
 * description: "Returns all the searches matching the search query."
 * tags:
 *  - Search API
 * parameters:
 *   - (query) s* {String} The search text
 *   - (query) channel {String} The channel to search, if none, will return all search results
 *   - (query) size {Integer} The amount of results to return at max
 *   - (query) from {Integer} The number to start from, good for pagination
 *   - (query) nsfw {Boolean} If search should return nsfw content or not.
 * responses:
 *   200:
 *     description: The search API returns an array of the found matching search items.
 *     content:
 *        application/json:
 *          schema:
 *            type: array
 *            items:
 *              type: object
 *              required:
 *                - name
 *                - claimId
 *              properties:
 *                name:
 *                  type: integer
 *                  description: The name of the claim.
 *                  example: "LBRY"
 *                claimId:
 *                  type: string
 *                  description: The claimId of the claim.
 *                  example: "3db81c073f82fd1bb670c65f526faea3b8546720"
 *                value:
 *                  type: object
 *                  description: Here is the decoded claimdata/metadata from the claim in an object.
 *
 */
router.get('/search', LighthouseControllers.search);

/**
 * @oas [get] /autocomplete
 * tags:
 *  - Autocomplete API
 * description: "Returns an array of autocompleted strings."
 * parameters:
 *   - (query) s* {String} The string to be autocompleted.
 * responses:
 *   200:
 *     description: The autocomplete API returns an array of the found matching autocompleted strings.
 *     content:
 *        application/json:
 *          schema:
 *            type: array
 *            items:
 *              type: string
 *              description: A autocompleted string
 *              example: "lbryisawesome"
 *
 */
router.get('/autocomplete', LighthouseControllers.autoComplete);

/**
 * @oas [get] /status
 * tags:
 *  - Status API
 * description: "Returns the current status of the lighthouse instance."
 * responses:
 *   200:
 *     description: Returns the current status of the lighthouse instance.
 *     content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - spaceUsed
 *              - claimsInIndex
 *              - totSearches
 *            properties:
 *              spaceUsed:
 *                type: string
 *                description: The size of the elasticsearch database.
 *                example: "632.3MB"
 *              claimsInIndex:
 *                type: integer
 *                description: The amount of claims in the search index.
 *                example: 97615085
 *              totSearches:
 *                type: integer
 *                description: The amount of searches since the start of the lighthouse instance.
 *                example: 100000
 *
 */
router.get('/status', LighthouseControllers.status);

/**
 * @oas [get] /autoupdate
 * tags:
 *  - Auto Update API
 * description: "Checks signature of travis webhook and calls deploy script to get the latest master branch to deploy."
 * responses:
 *   200:
 *     description: Successful if script called.
 *
 */

router.post('/autoupdate', LighthouseControllers.autoUpdate);

export default router;
