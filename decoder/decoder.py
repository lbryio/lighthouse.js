#!/usr/bin/python
# -*- coding: utf-8 -*-
import json, os
from bitcoinrpc.authproxy import AuthServiceProxy
from lbryschema.decode import smart_decode
from flask import Flask, url_for
app = Flask(__name__)

def get_lbrycrdd_connection_details(wallet_conf):
    settings = {"username": "lbry",
                "password": "lbry",
                "rpc_port": 9245}
    if wallet_conf and os.path.exists(wallet_conf):
        with open(wallet_conf, "r") as conf:
            conf_lines = conf.readlines()
        for l in conf_lines:
            if l.startswith("rpcuser="):
                settings["username"] = l[8:].rstrip('\n')
            if l.startswith("rpcpassword="):
                settings["password"] = l[12:].rstrip('\n')
            if l.startswith("rpcport="):
                settings["rpc_port"] = int(l[8:].rstrip('\n'))
    rpc_user = settings["username"]
    rpc_pass = settings["password"]
    rpc_port = settings["rpc_port"]
    rpc_url = "127.0.0.1"
    return "http://%s:%s@%s:%i" % (rpc_user, rpc_pass, rpc_url, rpc_port)

@app.errorhandler(500)
def internal_error(error):

    return 'error when decoding claims'


@app.route('/claim_decode/<txid>/<nout>')
def api_decode(txid, nout):
    connection_string = get_lbrycrdd_connection_details(os.path.expanduser("~")+"/.lbrycrd/lbrycrd.conf")
    rpc = AuthServiceProxy(connection_string)
    result = rpc.getclaimsfortx(txid)
    claim = None
    for claim_out in result:
        if claim_out['nOut'] == int(nout):
            claim = claim_out
            break
    if claim:
        converted = ''.join([chr(ord(i)) for i in claim['value']])
        decoded = smart_decode(converted)
        claim['value'] = decoded.claim_dict
        return json.dumps(claim)


@app.route('/claim_decodeinv/<claimid>')
def api_decodebyclaim(claimid):
    connection_string = get_lbrycrdd_connection_details(os.path.expanduser("~")+"/.lbrycrd/lbrycrd.conf")
    rpc = AuthServiceProxy(connection_string)
    claim = rpc.getvalueforname(claimid)
    if claim:
        converted = ''.join([chr(ord(i)) for i in claim['value']])
        decoded = smart_decode(converted)
        claim['value'] = decoded.claim_dict
        return json.dumps(claim)

if __name__ == '__main__':
    app.run(host='127.0.0.1')


			
