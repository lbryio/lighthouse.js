# Lighthouse - A lightning fast search for the LBRY blockchain 
**Created by _filipnyquist_ <filip@lbry.io> and _billbitt_ <bill@lbry.io>**

## What is Lighthouse?
>Lighthouse is a lightning-fast advanced search engine API for publications on the lbrycrd with autocomplete capabilities.

## What does Lighthouse consist of?
>1. Elasticsearch as a backend db server.
>2. LBRYimport, a importer that imports the claims into the Elasticsearch database.
>3. Lighthouse API server, which serves the API and does all calculations about what to send to the end user. 

## DEVELOPMENT NOTES:
> Stuff needed to be worked on are located in issues or in the project board.


## Running
Install dependencies
```
yarn install --production=false
```

Start a Local Server
```
npm start
```

Run Test
```
npm test
```

Building and Running Production Server
```
npm run prod
```

**Note : Please make sure your elasticsearch server is running before using ```npm start``` or ```npm run prod```**

## License
MIT &copy; [LBRYio, Filip Nyquist, Bill Bittner](https://github.com/lbryio)
