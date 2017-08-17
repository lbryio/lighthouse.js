/*
 *  Importer code, handles all the syncing with the blockchain into elasticsearch.
 */
const bitcoin = require('bitcoin-promise');
const elasticsearch = require('elasticsearch');
var eclient = new elasticsearch.Client({
  host: 'http://elastic:changeme@localhost:9200',
  log : 'info',
});
const client = new bitcoin.Client({
  host   : 'localhost',
  port   : 9245,
  user   : 'lbry',
  pass   : 'lbry',
  timeout: 30000,
});
let claimsSynced = 0;
let status = {};

export async function sync (currentHeight) {
  try {
    let maxHeight = await client.getBlockCount().then(blockHash => { return blockHash }).catch(err => { throw err });
    if (currentHeight <= maxHeight) {
      let claims = await require('./getClaims')(currentHeight, client);
      send(claims);
      claimsSynced += claims.length;
      // currentHeight / maxHeight / claimsSynced
      status.message = `Running,${currentHeight} / ${maxHeight} done, ${claimsSynced} claims imported.`;
      sync(currentHeight + 1);
    } else {
      await sleep(2000);
      status.message = `All claims imported, waiting for new blocks at ${maxHeight}`;
      sync(currentHeight); // eslint-disable-line no-unreachable
    }
  } catch (err) {
    console.log(err);
    status.err = err;
  }
}

export function getStats () {
  return status;
}

function send (arr) { // Modular change output here :)
  arr.forEach(function (claim) {
    claim['id'] = claim['claimId'];
    // Check if our value is a object, else make it a object...
    claim['value'] = (typeof claim.value === 'object' ? claim.value : JSON.parse(claim.value));
    // claim['value'] = JSON.stringify(claim['value']);
    if (claim.name && claim.value) {
      claim.suggest_name = {
        input : claim.name,
        weight: 30,
      };
      if (claim.value.claimType === 'streamType' && claim.value.stream.metadata && claim.value.stream.metadata.description) {
        claim.suggest_desc = {
          input : claim.value.stream.metadata.description.split(' '),
          weight: 10,
        };
      }
    }
    eclient.create({
      index: 'claims',
      type : 'claim',
      id   : claim.claimId,
      body : claim,
    }, function (error, response) {
      if (error) { status.err = error; console.log(error) }
    });
  });
}

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
