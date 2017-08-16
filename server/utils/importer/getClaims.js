'use strict';

const Promise = require('bluebird');
const rp = require('request-promise');

let client;

async function getClaims (height, gclient) {
  return new Promise(async (resolve, reject) => {
    try {
      client = gclient;
      let blockHash = await client.getBlockHash(height).then(blockHash => { return blockHash }).catch(err => reject(err));
      let block = await client.getBlock(blockHash).then(block => { return block }).catch(err => reject(err));
      let claims = await getClaimsForTxes(block.tx, height); // should return an array of claims, decoded if possible.
      resolve(claims);
    } catch (err) {
      return reject(err);
    }
  });
}
async function getClaimsForTxes (txes, height) {
  return new Promise(async (resolve, reject) => {
    try {
      let claimsArr = [];
      for (let tx of txes) {
        let claimsTx = await client.getClaimsForTx(tx).then(claims => { return claims }).catch(err => reject(err));
        if (claimsTx != null) {
          for (let claim of claimsTx) {
            claim['height'] = height;
            let dClaim = await getValue(tx, claim['nOut']);
            if (dClaim !== 'error when decoding claims' && claim['value']) {
              claim['value'] = JSON.parse(dClaim);
              claimsArr.push(claim);
            } else {
              claim['value'] = { error: 'non_decodable' };
              claimsArr.push(claim);
            }
          }
        }
      }
      resolve(claimsArr);
    } catch (err) {
      return reject(err);
    }
  });
}

async function getValue (tx, i) {
  return new Promise(async (resolve, reject) => {
    rp(`http://localhost:5000/claim_decode/${tx}/${i}`)
    .then(function (htmlString) {
      resolve(htmlString);
    })
    .catch(function (err) {
      reject(err);
    });
  });
}

module.exports = exports = getClaims;
