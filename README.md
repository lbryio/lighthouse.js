# Lighthouse - A lightning fast search for the LBRY blockchain 
**Created by _filipnyquist_ <filip@lbry.io> and the community!**

## What is Lighthouse?
>Lighthouse is a lightning-fast advanced search engine API for publications on the lbrycrd with autocomplete capabilities.
>The official lighthouse instance is live at https://lighthouse.lbry.io

## What does Lighthouse consist of?
>1. Elasticsearch as a backend db server.
>2. LBRYimport, a importer that imports the claims into the Elasticsearch database.
>3. Lighthouse API server, which serves the API and does all calculations about what to send to the end user. 
## API Documentation

[The full API documentation](https://lbryio.github.io/lighthouse/)

## Running Lighthouse
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

>Make sure elasticsearch is running and run(from the lighthouse dir):
```
./gendb.sh
```
>Install dependencies:
```
yarn install --production=false
```
>Start a instance of the decoder:
```
cd decoder && pip install -r requirements.txt && python decoder.py
```
>Build and run Lighthouse:
```
yarn run prod
```
>WOO! You are now up and running! You can connect to lighthouse at http://localhost:50005, api documentation is [here](https://lbryio.github.io/lighthouse/).
Lighthouse will continue syncing in the background so it could take approx 10-15minutes before all claims are up to date in database.

## License
MIT &copy; [LBRYio, Filip Nyquist](https://github.com/lbryio)
