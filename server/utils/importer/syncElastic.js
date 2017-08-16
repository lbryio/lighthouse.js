const bitcoin = require('bitcoin-promise');
var elasticsearch = require('elasticsearch');
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

async function sync (currentHeight) {
  try {
    let maxHeight = await client.getBlockCount().then(blockHash => { return blockHash }).catch(err => console.log(err));
    if (currentHeight <= maxHeight) {
      let claims = await require('./getClaims')(currentHeight, client);
      send(claims);
      this.claimsSynced += claims.length;
      // currentHeight / maxHeight / claimsSynced
      sync(currentHeight + 1);
    } else {
      process.exit(0);
      // Waiting for new blocks logic here
      sync(currentHeight); // eslint-disable-line no-unreachable
    }
  } catch (err) {
    // Catch errors here
  }
}

function send (arr) { // Modular change output here :)
  arr.forEach(function (claim) {
    claim['id'] = claim['claimId'];
    // Check if our value is a object, else make it a object...
    claim['value'] = (typeof claim.value === 'object' ? claim.value : JSON.parse(claim.value));
    // claim['value'] = JSON.stringify(claim['value']);
    console.log(claim.value.metadata);
    if (claim.name && claim.value) {
      claim.suggest_name = {
        input : claim.name,
        weight: 20,
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
      if (error) { console.log(error) }
      console.log(response);
    });
  });
}

module.exports = exports = sync;
