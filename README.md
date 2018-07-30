# Lighthouse - A lightning fast search for the LBRY blockchain

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/c73f0c5eba1f4389894d0a0fdd31486f)](https://app.codacy.com/app/fillerix/lighthouse?utm_source=github.com&utm_medium=referral&utm_content=lbryio/lighthouse&utm_campaign=badger)

Lighthouse is a lightning-fast advanced search engine API for publications on the lbrycrd with autocomplete capabilities.
The official lighthouse instance is live at https://lighthouse.lbry.io

### What does Lighthouse consist of?

1. Elasticsearch as a backend db server.
2. LBRYimport, an importer that imports the claims into the Elasticsearch database.
3. Lighthouse API server, which serves the API and does all calculations about what to send to the end user. 
### API Documentation

[The full API documentation](https://lbryio.github.io/lighthouse/)

## Installation
### Prerequisites
* Node v8
* Yarn 
* Python2.7
* [Elasticsearch](https://www.elastic.co/downloads/elasticsearch)


>To get started you should clone the git:
```
git clone https://github.com/lbryio/lighthouse
```
>Grab the latest release of lbrycrd here:

[Download lbrycrd](https://github.com/lbryio/lbrycrd/releases)
>Create a lbrycrd config file at ~/.lbrycrd/lbrycrd.conf which contains rpcuser,rpcpassword and rpcport. Then run lbrycrd in the background with that config file.

>Make sure elasticsearch is running and run (from the lighthouse dir):
```
./gendb.sh
```
>Install dependencies:
```
yarn install --production=false
```
>Start an instance of the decoder:
```
cd decoder && pip install -r requirements.txt && python decoder.py
```
>Build and run Lighthouse:
```
yarn run prod
```
>You are now up and running! You can connect to lighthouse at http://localhost:50005, api documentation is [here](https://lbryio.github.io/lighthouse/).
Lighthouse will continue syncing in the background. It usually takes ~15 minutes before all claims are up to date in the database.

## Contributing

Contributions to this project are welcome, encouraged, and compensated. For more details, see [lbry.io/faq/contributing](https://lbry.io/faq/contributing)

## License
This project is MIT Licensed &copy; [LBRYio, Filip Nyquist](https://github.com/lbryio)

## Security

We take security seriously. Please contact security@lbry.io regarding any security issues. Our PGP key is [here](https://keybase.io/lbry/key.asc) if you need it.

## Contact

The primary contact for this project is [@filipnyquist](https://github.com/filipnyquist) (filip@lbry.io)
