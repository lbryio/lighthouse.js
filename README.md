# Lighthouse - A lightning fast search for the LBRY blockchain 
**Created by _filipnyquist_ <filip@lbry.io> and _billbitt_ <bill@lbry.io>**

## What is Lighthouse?
>Lighthouse is a lightning-fast advanced search engine API for publications on the lbrycrd with autocomplete capabilities.

## What does Lighthouse consist of?
>1. Elasticsearch as a backend db server.
>2. LBRYimport, a importer that imports the claims into the Elasticsearch database.
>3. Lighthouse API server, which serves the API and does all calculations about what to send to the end user. 

## DEVELOPMENT NOTES:
> Stuff needed to be worked on(in order):
>1. Importer needs to add the block that the claim was made in as depth wont work in a a plain-non-updating-all-claims database.
>2. Lighthouse API server needs to be rebuilt in node.js with Koa.JS, this api server will query the elasticsearch autosuggest api, this will need some score balance between searching names,titles and description and some logic to only send the standing claims to the clients.(Bill can help with this part as this will take the longest)
>3. Ansible configuration and documentation 
