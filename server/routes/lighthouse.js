import 'babel-polyfill';
import Router from 'koa-router';
import LighthouseControllers from '../controllers/lighthouse';

LighthouseControllers.startSync();

const router = new Router();

router.get('/', LighthouseControllers.info);

/**
 * @swagger
 * definitions:
 *   SearchItem:
 *     type: object
 *     required:
 *       - name
 *     properties:
 *       name:
 *         type: string
 *         description: The name of the claim.
 *         example: 'lbry-testclaim'
 *       channel:
 *         type: string
 *         description: The name of the channel that claimed this item.
 *         example: '@lbrytestclaim'
 *       value:
 *         type: object
 *         description: The decoded value of the metadata for the item.
 *         example: 'Here is the decoded claimdata/metadata from the claim in an object.'
 *   AutocompleteItem:
 *     type: string
 *     description: A matching search string.
 *     example: 'LBRY is amazing'
 */

/**
 * @swagger
 * /search:
 *   get:
 *     tags:
 *       - 'Lighthouse API'
 *     description: Make a lighthouse search.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: s
 *         description: The search text.
 *         in: query
 *         required: true
 *         type: string
 *         example: 'Why crypto is good!'
 *       - name: channel
 *         description: The specific channel you want to search.
 *         in: query
 *         required: false
 *         type: string
 *         example: 'CryptoLovers'
 *       - name: size
 *         description: The amount of items to get back at a maximum.
 *         in: query
 *         required: false
 *         type: integer
 *         example: 10
 *       - name: from
 *         description: The number to start from, good for pagination.
 *         in: query
 *         required: false
 *         type: integer
 *         example: 10
 *     responses:
 *       200:
 *         description: The search returns all the found matching items.
 *         schema:
 *          type: array
 *          items:
 *            $ref: '#/definitions/SearchItem'
 */
router.get('/search', LighthouseControllers.search);

/**
 * @swagger
 * /autocomplete:
 *   get:
 *     tags:
 *       - 'Lighthouse API'
 *     description: The autocomplete API.
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: s
 *         description: The string to be autocompleted.
 *         in: query
 *         required: true
 *         type: string
 *         example: 'LBRY is'
 *     responses:
 *       200:
 *         description: The search returns all the found matching items.
 *         schema:
 *          type: array
 *          items:
 *            $ref: '#/definitions/AutocompleteItem'
 */
router.get('/autocomplete', LighthouseControllers.autoComplete);

/**
 * @swagger
 * /status:
 *   get:
 *     tags:
 *       - 'Lighthouse API'
 *     description: Gets the status of lighthouse.
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Returns the current status of lighthouse
 *         schema:
 *          type: object
 *          required:
 *            - spaceUsed
 *            - claimsInIndex
 *            - totSearches
 *          properties:
 *            spaceUsed:
 *              type: string
 *              description: The amount of space used for the search db.
 *            claimsInIndex:
 *              type: integer
 *              description: The amount of claims in the index.
 *            totSearches:
 *              type: integer
 *              description: The total amount of searches since the start.
 */
router.get('/status', LighthouseControllers.status);

export default router;
