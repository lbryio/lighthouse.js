#!/bin/bash
if [ "$(curl -IHEAD -w '%{http_code}' 'localhost:9200/claims' -o /dev/null --connect-timeout 3 --max-time 5)" == "200" ] ;
then
   echo "Index already exists." ;
   exit 1;
else
   echo "Index did not exist, creating..." ;
   curl -X PUT http://localhost:9200/claims -H '"Content-Type: application/json"'-d '{ "settings" : { "number_of_shards" : 1 }, "mappings" : { "claim" : { "properties" : { "value" : { "type" : "nested" }, "suggest_name": { "type": "completion" }, "suggest_desc": { "type": "completion" } } } } }';
   exit 0;
fi
