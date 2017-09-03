/*
 *  Importer code, handles all the syncing with the blockchain into elasticsearch.
 */
import bitcoin from 'bitcoin-promise';
import elasticsearch from 'elasticsearch';
import ElasticQueue from 'elastic-queue';
import winston from 'winston';
import winstonStream from 'winston-stream';
import jsonfile from 'jsonfile';
import path from 'path';
import rp from 'request-promise';
import appRoot from 'app-root-path';

const loggerStream = winstonStream(winston, 'info');
const eclient = new elasticsearch.Client({
  host: 'http://elastic:changeme@localhost:9200',
  log : {
    level : 'info',
    type  : 'stream',
    stream: loggerStream,
  },
});
const queue = new ElasticQueue({elastic: eclient});
const client = new bitcoin.Client({
  host   : 'localhost',
  port   : 9245,
  user   : 'lbry',
  pass   : 'lbry',
  timeout: 30000,
});
let status = {};

export async function sync () {
  try {
    status.info = 'Grabbing the claimTrie...';
    let claimTrie = await client.getClaimsInTrie().then(claimtrie => { return claimtrie }).catch(err => { throw err });
    let txList = [];
    let latestClaimTrie = [];
    for (let i in claimTrie) {
      for (let o in claimTrie[i].claims) {
        txList.push({
          txid   : claimTrie[i].claims[o].txid,
          nOut   : claimTrie[i].claims[o].n,
          claimId: claimTrie[i].claims[o].claimId,
        });
        latestClaimTrie.push(claimTrie[i].claims[o].claimId);
      }
    }
    let oldClaimTrie = await getJSON(path.join(appRoot.path, 'claimTrieCache.json')); // get our old claimTrieCache....
    let added = await getAddedClaims(oldClaimTrie, latestClaimTrie); // get all new that should be added
    let removed = await getRemovedClaims(oldClaimTrie, latestClaimTrie); // get all old that should be removed
    status.info = 'Adding/Removing Claims, please wait...';
    for (let claimId of added) { // for all new get their tx info and add to database
      let tx = txList.find(x => x.claimId === claimId);
      if (typeof tx !== 'undefined') {
        let value = await getValue(tx.txid, tx.nOut);
        if ((value !== 'error when decoding claims')) {
          value = JSON.parse(value);
          if (value['is controlling'] && value['name'] !== '') {
            if (value.name && value.value) {
              value.suggest_name = {
                input : value.name,
                weight: 30,
              };
            }
            pushElastic(value);
          }
        }
      }
    }
    for (let claimId of removed) { // Call elastic and remove claim by id if it exists.
      eclient.delete({
        index: 'claims',
        type : 'claim',
        id   : claimId,
      }, function (error, response) {
        if (error) {
          winston.log(error);
        }
      });
    }
    // Done adding, update our claimTrie cache to latest and wait a bit...
    await saveJSON(path.join(appRoot.path, 'claimTrieCache.json'), latestClaimTrie);
    status.info = 'Done updating the claimTrieCache, waiting 5 minutes before doing a recheck..';
    await sleep(300000);
    sync();
  } catch (err) {
    winston.log(err);
    status.err = err;
  }
}

export function getStats () {
  return status;
}

function getAddedClaims (oldClaimTrie, newClaimTrie) {
  return new Promise((resolve, reject) => {
    let a = new Set(oldClaimTrie);
    let b = new Set(newClaimTrie);
    resolve(new Set([...b].filter(x => !a.has(x))));
  });
}

function getRemovedClaims (oldClaimTrie, newClaimTrie) {
  return new Promise((resolve, reject) => {
    let a = new Set(oldClaimTrie);
    let b = new Set(newClaimTrie);
    resolve(new Set([...a].filter(x => !b.has(x))));
  });
}

function getValue (tx, i) {
  return new Promise((resolve, reject) => {
    rp(`http://localhost:5000/claim_decode/${tx}/${i}`)
      .then(function (htmlString) {
        resolve(htmlString);
      })
      .catch(function (err) {
        reject(err);
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
