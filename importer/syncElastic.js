const Promise = require('bluebird')
const ora = require('ora');
const chalk = require('chalk');
const bitcoin = require('bitcoin-promise');
const request = require('request');
const sleep = require('sleep');
var elasticsearch = require('elasticsearch');
var eclient = new elasticsearch.Client({
  host: 'http://elastic:changeme@localhost:9200',
  log: 'info'
});
const client = new bitcoin.Client({
    host: 'localhost',
    port: 9245,
    user: 'lbry',
    pass: 'lbry',
    timeout: 30000
});
let claimsSynced=0;

async function sync (currentHeight) {
  try {
    let maxHeight = await client.getBlockCount().then(blockHash => {return blockHash}).catch( err => reject(err));
    if( currentHeight <= maxHeight ) {
      let claims = await require('./getClaims')(currentHeight, client);
      send(claims);
      claimsSynced += claims.length;
      spinner.color = 'green';
      spinner.text = `Current block: ${currentHeight}/${maxHeight} | TotalClaimsImported: ${claimsSynced} `
      sync(currentHeight+1);
    } else {
      process.exit(0);
      spinner.color = 'yellow'; 
      spinner.text = `Waiting for new blocks...`;
      sync(currentHeight); 
      
    }
  } catch (err) {
    spinner.color = 'red';
    spinner.text = ('Error with block: %s, %s', currentHeight, err);
  }
}

function send(arr){ // Modular change output here :)
arr.forEach(function(claim) { 
    claim['id'] = claim['claimId'];
    //Check if our value is a object, else make it a object...
    claim['value'] = (typeof claim.value == "object" ? claim.value : JSON.parse(claim.value));
    //claim['value'] = JSON.stringify(claim['value']);
    console.log(claim.value.metadata);
    if(claim.name && claim.value){
        claim.suggest_name ={
        input: claim.name,
        weight: 20
      } 
      if(claim.value.claimType == "streamType" && claim.value.stream.metadata && claim.value.stream.metadata.description){
        claim.suggest_desc ={
        input: claim.value.stream.metadata.description.split(" "),
        weight: 10
      }
      }
    }
    eclient.create({
  index: 'claims',
  type: 'claim',
  id: claim.claimId,
  body: claim
}, function (error, response) {
  console.log(response);
});
});
}

console.log(chalk.green.underline.bold('Running LBRYSync v0.0.1rc1'))
const spinner = ora('Loading LBRYsync..').start();
sync(0)// Block to start from... :)
