
// taken from https://github.com/crypto-browserify/buffer-reverse/blob/master/inplace.js
function reverseInplace (buffer) {
  for (var i = 0, j = buffer.length - 1; i < j; ++i, --j) {
    var t = buffer[j];

    buffer[j] = buffer[i];
    buffer[i] = t;
  }

  return buffer;
}

function ripemd160 (bytearray) {
  const crypto = require('crypto');

  const secret = 'abcdefg';
  const hash = crypto.createHash('ripemd160', secret)
    .update(bytearray, 'binary', 'binary')
    .digest();
  return hash;
}

function sha256 (bytearray) {
  const crypto = require('crypto');

  const secret = 'abcdefg';
  const hash = crypto.createHash('sha256', secret)
    .update(bytearray, 'binary', 'binary')
    .digest();
  return hash;
}

export function OutpointToClaimId (outpointstr) {
  var outpointsplit = outpointstr.split(':');
  var outpoint = {txid: outpointsplit[0], vout: outpointsplit[1]};
  // Assuming endianess is LittleEndian - Javacsript endianess depends on hardware.
  // Can check with os.endianness(). Possible values are "BE" or "LE" as of Node.js v0.10.0
  // convert txid to byte array then reverse bytes to get BigEndian
  var txidbytes = Buffer.from(outpoint.txid, 'hex');
  var txidrevbytes = reverseInplace(txidbytes);
  // Get big endian of vout(uint32)
  var voutbytes = Buffer.allocUnsafe(4);
  voutbytes.writeInt32BE(outpoint.vout);
  // Merge arrays
  var claimidbytes = Buffer.concat([txidrevbytes, voutbytes]);
  // Hash - Sha256
  claimidbytes = sha256(claimidbytes);
  // Hash - RipeMD160
  claimidbytes = ripemd160(claimidbytes);
  // Return to little endian.
  claimidbytes = reverseInplace(claimidbytes);
  // Encode to hex string
  var claimid = claimidbytes.toString('hex');

  return claimid;
}
