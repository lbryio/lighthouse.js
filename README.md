# Lighthouse - A lightning fast search for the LBRY blockchain

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/c73f0c5eba1f4389894d0a0fdd31486f)](https://app.codacy.com/app/fillerix/lighthouse?utm_source=github.com&utm_medium=referral&utm_content=lbryio/lighthouse&utm_campaign=badger)
[![MIT licensed](https://img.shields.io/dub/l/vibe-d.svg?style=flat)](https://github.com/lbryio/lighthouse/blob/master/LICENSE)

Lighthouse is a lightning-fast advanced search engine API for publications on the lbrycrd with autocomplete capabilities.
The official lighthouse instance is live at https://lighthouse.lbry.com

### What does Lighthouse consist of?

1. Elasticsearch as a backend database server.
2. LBRYimport, an importer that imports the claims into the Elasticsearch database.
3. Lighthouse API server, which serves the API and does all calculations about what to send to the end user. 
### API Documentation / Usage example
To make a simple search by string:
```
https://lighthouse.lbry.com/search?s=stringtosearch
```
To get autocomplete suggestions:
```
https://lighthouse.lbry.com/autocomplete?s=stringtocomp
```
[The full API documentation](https://lbryio.github.io/lighthouse/)

## Installation
### Prerequisites
* [Node v8](https://nodejs.org/en/download/)
* [Yarn](https://yarnpkg.com/en/docs/install)
* [Elasticsearch](https://www.elastic.co/downloads/elasticsearch)


>To get started you should clone the git:
```
git clone https://github.com/lbryio/lighthouse
```
>Make sure elasticsearch is running and run (from the lighthouse dir):
```
./gendb.sh
```
>Install dependencies:
```
npm run install --production=false
```
>Build and run Lighthouse:
```
npm run prod
```
>You are now up and running! You can connect to lighthouse at http://localhost:50005, API documentation is [here](https://lbryio.github.io/lighthouse/).
Lighthouse will continue syncing in the background. It usually takes ~15 minutes before all claims are up to date in the database.

## Contributing

Contributions to this project are welcome, encouraged, and compensated. For more details, see [lbry.com/faq/contributing](https://lbry.com/faq/contributing)

## License
This project is MIT Licensed &copy; [LBRYio, Filip Nyquist](https://github.com/lbryio)

## Security

We take security seriously. Please contact security@lbry.com regarding any security issues. Our PGP key is [here](https://keybase.io/lbry/key.asc) if you need it.

## Contact

The primary contact for this project is [@tiger5226](https://github.com/tiger5226) (beamer@lbry.com)
