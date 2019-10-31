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
import * as util from './util';
import {logErrorToSlack} from '../../index';
import mysql from 'mysql';
import chainqueryConfig from '../../../chainquery-config.json';

let connection = null;

const esLogLevel = 'info';
const MaxClaimsToProcessPerIteration = 100000;
const BatchSize = 5000;
const loggerStream = winstonStream(winston, esLogLevel);
const eclient = new elasticsearch.Client({
  host: 'http://localhost:9200',

  log: {
    level : esLogLevel,
    type  : 'stream',
    stream: loggerStream,
  },
});

const queue = new ElasticQueue({elastic: eclient});
queue.on('drain', function () {
  console.log('elasticsearch queue is drained');
});

// Check that our syncState file exist.
fileExists(path.join(appRoot.path, 'syncState.json'), (err, exists) => {
  if (err) {
    throw err;
  }
  if (!exists) {
    fs.writeFileSync(path.join(appRoot.path, 'syncState.json'), '{}');
  }
});

let status = {info: 'startup successful'};

export async function claimSync () {
  try {
    let syncState = await getJSON(path.join(appRoot.path, 'syncState.json')); // get our persisted state
    if (!syncState.LastSyncTime) {
      syncState.LastSyncTime = '0001-01-01 00:00:00';
    }
    if (!syncState.LastID) {
      syncState.LastID = 0;
    }
    if (!syncState.StartSyncTime || syncState.LastID === 0) {
      syncState.StartSyncTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    status.info = 'gettingClaimsToUpdate';
    let finished = false;
    let lastID = syncState.LastID;
    let iteration = 0;
    while (!finished) {
      let claims = await getClaimsSince(syncState.LastSyncTime, lastID, BatchSize);
      status.info = 'addingClaimsToElastic';
      for (let claim of claims) {
        if (claim.value === null) {
          console.log(claim);
          // await logErrorToSlack('Failed to process claim ' + claim.claimId + ' due to missing value');
          console.error('Failed to process claim ' + claim.claimId + ' due to missing value');
          continue;
        }
        claim.value = claim.value.Claim;
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
        lastID = claim.id;
      }
      winston.log('info', '[Importer] Pushed ' + claims.length + ' claims to elastic search [LastID]' + lastID);
      finished = claims.length < BatchSize || (iteration * BatchSize + BatchSize >= MaxClaimsToProcessPerIteration);
      iteration++;
    }
    await deleteBlockedClaims();
    // If not finished, store last id to run again later where we left off, otherwise update last sync time.
    if (iteration * BatchSize + BatchSize >= MaxClaimsToProcessPerIteration) {
      syncState.LastID = lastID;
    } else {
      syncState.LastID = 0;
      syncState.LastSyncTime = syncState.StartSyncTime;
    }
    await saveJSON(path.join(appRoot.path, 'syncState.json'), syncState);
    status.info = 'upToDate';
    status.syncState = syncState;
    await sleep(600000);
    await claimSync();
  } catch (err) {
    await logErrorToSlack(err);
    status.err = err;
    await sleep(600000);
    await claimSync();
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

function deleteFromElastic (claimid) {
  queue.push({
    index: 'claims',
    type : 'claim',
    id   : claimid,
    body : {},
  });
}

function pushElastic (claim) {
  queue.push({
    index: 'claims',
    type : 'claim',
    id   : claim.claimId,
    body : claim,
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
    rp(`https://api.lbry.com/file/list_blocked`)
      .then(function (htmlString) {
        resolve(htmlString);
      })
      .catch(function (err) {
        logErrorToSlack('[Importer] Error getting blocked outpoints. ' + err);
        reject(err);
      });
  });
}

function getChainqueryConnection () {
  if (connection === null) {
    connection = mysql.createConnection({
      host    : chainqueryConfig.host,
      user    : chainqueryConfig.user,
      password: chainqueryConfig.password,
      database: chainqueryConfig.db,
    });
    connection.connect();
  }
  return connection;
}

function getClaimsSince (time, lastID, MaxClaimsInCall) {
  return new Promise((resolve, reject) => {
    let query = `SELECT c.id,
     c.name,
     p.name as channel,
     p.claim_id as channel_id,
     c.bid_state,
     c.effective_amount,
     COALESCE(p.effective_amount,1) as certificate_amount,
     c.claim_id as claimId,
     c.value_as_json as value
     FROM claim c LEFT JOIN claim p
     on p.claim_id = c.publisher_id
     WHERE c.id >${lastID} AND
     c.modified_at >='${time}'
     ORDER BY c.id LIMIT ${MaxClaimsInCall}`;
    // Outputs full query to console for copy/paste into chainquery (debugging)
    console.log(query);
    getChainqueryConnection().query(query, function (err, results, fields) {
      if (err) {
        console.error(err);
        logErrorToSlack('[Importer] Error getting updated claims. ' + err);
        return reject(err);
      }
      let claims = [];
      for (let i = 0; i < results.length; i++) {
        let r = results[i];
        let value = null;
        try {
          value = JSON.parse(r.value);
        } catch (e) {
          console.error(e);
          console.error(r.value);
        }
        claims.push({
          id                : r.id,
          name              : r.name,
          channel           : r.channel,
          channel_claim_id  : r.channel_id,
          bid_state         : r.bid_state,
          effective_amount  : r.effective_amount,
          certificate_amount: r.certificate_amount,
          claimId           : r.claimId,
          value             : value,
        });
      }
      resolve(claims);
    });
  });
}
