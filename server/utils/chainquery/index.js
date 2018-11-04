/*
 *  Importer code, handles all the syncing with chainquery into elasticsearch.
 */
import elasticsearch from 'elasticsearch';
import ElasticQueue from 'elastic-queue';
import winston from 'winston';
import winstonStream from 'winston-stream';
import jsonfile from 'jsonfile';
import path from 'path';
import rp from 'request-promise';
import appRoot from 'app-root-path';
import fs from 'fs';
import fileExists from 'file-exists';
import * as util from '../../utils/importer/util';
import {logErrorToSlack} from '../../index';

const elasticsearchloglevel = 'info';
const loggerStream = winstonStream(winston, elasticsearchloglevel);
const eclient = new elasticsearch.Client({
  host: 'http://localhost:9200',

  log: {
    level : elasticsearchloglevel,
    type  : 'stream',
    stream: loggerStream,
  },
});
const queue = new ElasticQueue({elastic: eclient});

// Check that our syncState file exist.
fileExists(path.join(appRoot.path, 'syncState.json'), (err, exists) => {
  if (err) { throw err }
  if (!exists) {
    fs.writeFileSync(path.join(appRoot.path, 'syncState.json'), '{}');
  }
});

let status = {};

export async function claimSync () {
  try {
    let syncState = await getJSON(path.join(appRoot.path, 'syncState.json')); // get our persisted state
    if (!syncState.LastSyncTime) {
      syncState.LastSyncTime = '0001-01-01 00:00:00';
    }
    status.info = 'gettingClaimsToUpdate';
    let claimsResponse = await getClaimsSince(syncState.LastSyncTime);
    let claims = JSON.parse(claimsResponse).data;
    status.info = 'addingClaimsToElastic';
    for (let claim of claims) {
      claim.value = JSON.parse(claim.value).Claim;
      if (claim.name && claim.value) {
        claim.suggest_name = {
          input : '' + claim.name + '',
          weight: '30',
        };
      }
      if (claim.bid_state === 'Spent' || claim.bid_state === 'Expired') {
        deleteFromElastic(claim.claimId);
      } else {
        pushElastic(claim);
      }
    }
    winston.log('info', '[Importer] Pushed ' + claims.length + ' claims to elastic search');
    deleteBlockedClaims();
    syncState.LastSyncTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await saveJSON(path.join(appRoot.path, 'syncState.json'), syncState);
    status.info = 'upToDate';
    await sleep(600000);
    claimSync();
  } catch (err) {
    logErrorToSlack(err);
    status.err = err;
    await sleep(600000);
    claimSync();
  }
}

export function getStats () {
  return status;
}

async function deleteBlockedClaims () {
  winston.log('info', '[Importer] Removing blocked claims from search!');
  let blockedOutputsResponse = await getBlockedOutpoints();
  let outpointlist = JSON.parse(blockedOutputsResponse);
  for (let outpoint of outpointlist.data.outpoints) {
    let claimid = util.OutpointToClaimId(outpoint);
    deleteFromElastic(claimid);
  }
  winston.log('info', '[Importer] Done processing blocked claims!');
}

async function deleteFromElastic (claimid) {
  return new Promise(async(resolve, reject) => {
    queue.push({
      index: 'claims',
      type : 'claim',
      id   : claimid,
      body : {},
    });
  });
}

async function pushElastic (claim) {
  return new Promise(async(resolve, reject) => {
    queue.push({
      index: 'claims',
      type : 'claim',
      id   : claim.claimId,
      body : claim,
    });
  });
}

function getJSON (path) {
  return new Promise((resolve, reject) => {
    jsonfile.readFile(path, function (err, jsoncontent) {
      if (err) {
        logErrorToSlack(err);
        reject(err);
      } else {
        resolve(jsoncontent);
      }
    });
  });
}
function saveJSON (path, obj) {
  return new Promise((resolve, reject) => {
    jsonfile.writeFile(path, obj, function (err, jsoncontent) {
      if (err) {
        logErrorToSlack(err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getBlockedOutpoints () {
  return new Promise((resolve, reject) => {
    rp(`https://api.lbry.io/file/list_blocked`)
      .then(function (htmlString) {
        resolve(htmlString);
      })
      .catch(function (err) {
        logErrorToSlack('[Importer] Error getting blocked outpoints. ' + err);
        reject(err);
      });
  });
}

function getClaimsSince (time) {
  return new Promise((resolve, reject) => {
    let query =  `` +
      `SELECT ` +
      `c.name,` +
      `p.name as channel,` +
      `c.bid_state,` +
      `c.effective_amount,` +
      `c.claim_id as claimId,` +
      `c.value_as_json as value ` +
      // `,transaction_by_hash_id, ` + // txhash and vout needed to leverage old format for comparison.
      // `vout ` +
      `FROM claim c ` +
      `LEFT JOIN claim p on p.claim_id = c.publisher_id ` +
      `WHERE c.modified_at >='` + time + `'`;
    // Outputs full query to console for copy/paste into chainquery (debugging)
    // console.log(query);
    rp(`https://chainquery.lbry.io/api/sql?query=` + query)
      .then(function (htmlString) {
        resolve(htmlString);
      })
      .catch(function (err) {
        logErrorToSlack('[Importer] Error getting updated claims. ' + err);
        reject(err);
      });
  });
}
