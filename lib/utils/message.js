/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

const Assert = require('assert');
const Secp256k1 = require('secp256k1');
const {crypto, http, primitives} = require('wmcc-core');

const {ccmp, digest} = crypto;
//const {RPCBase} = http;
const {Address} = primitives;

class Message {
  constructor(message, address, options) {
    this.i18n = options.i18n;

    if (!this.i18n) {
      this.i18n = {
        _: {
          message: {
            message_required: `Message is required`,
            address_required: `Address is required`,
            signature_required: `Signature is required`,
            privkey_required: `Private key is required`,
            unable_to_sign: `Unable to sign message`,
            exceed_maximum_nonce: `Exceed maximum nonce to sign message`,
            invalid_signature_len: `Invalid signature length`,
            invalid_signature_param: `Invalid signature parameter`
          }
        }
      }
    }

    Assert(message, this.i18n._.message.message_required);
    Assert(address, this.i18n._.message.address_required);

    this._message = message;
    this._address = Address.fromString(address);

    this._nonce = 0;

    this._initOptions(options);
  }

  _initOptions(options) {
    this._privKey = options.privKey;
    this._compressed = options.compressed;
    this._enableNonce = options.enableNonce;

    this._hashMessage(this._message, options.magic);

    if (options.nonce) {
      Assert(typeof options.nonce === 'number');
      for (let i=0; i<nonce; i++)
        this._hashMessage(this._hash);
    }

    if (options.signature) {
      if (!Buffer.isBuffer(options.signature))
        options.signature = Buffer.from(options.signature, 'base64');

      this._decode(options.signature);
    }
  }

  sign() {
    Assert(this._privKey, this.i18n._.message.privkey_required);

    const sig = Secp256k1.sign(this._hash, this._privKey);
    this._encode(sig.signature, sig.recovery, this._compressed);

    const verify = this.verify();

    if (!this._enableNonce && !verify)
      throw new Error(this.i18n._.message.unable_to_sign);

    if (this._enableNonce && !verify) {
      if (this._nonce > Message.MAX_NONCE)
        throw new Error(this.i18n._.message.exceed_maximum_nonce);

      this._hashMessage(this._hash);
      this._nonce++;
      return this.sign();
    }

    return {
      signature: this._encoded,
      nonce: this._nonce
    }
  }

  verify() {
    Assert(this._decoded, this.i18n._.message.signature_required);

    const pubKey = Secp256k1.recover(
      this._hash,
      this._decoded.signature,
      this._decoded.recovery,
      this._decoded.compressed
    );

    const actual = digest.hash160(pubKey);
    return ccmp(actual, this._address.hash);
  }

  _encode(signature, recovery, compressed) {
    if (compressed) recovery += 4;
    this._encoded = Buffer.concat([Buffer.from([recovery + 27]), signature]);
    this._decode(this._encoded);
  }

  _decode(buffer) {
    if (buffer.length !== 65)
      throw new Error(this.i18n._.message.invalid_signature_len);

    const flagByte = buffer.readUInt8(0) - 27;
    if (flagByte > 7)
      throw new Error(this.i18n._.message.invalid_signature_param);

    this._decoded = {
      signature: buffer.slice(1),
      recovery: flagByte & 3,
      compressed: !!(flagByte & 4)
    }
  }

  _hashMessage(message, magic = '') {
    if (this.isHashMessage(message)) {
      this._hash = Buffer.from(message, 'hex');
      return;
    }

    if (!Buffer.isBuffer(message))
      message = Buffer.from(message, 'utf8');

    if (!Buffer.isBuffer(magic))
      magic = Buffer.from(magic, 'utf8');

    this._hash = Buffer.from(digest.hash256(Buffer.concat([magic, message])));
  }

  isHashMessage(message) {
    if (!Buffer.isBuffer(message)) {
      try {
        message = Buffer.from(message, 'hex');
      } catch (e) {
        return false;
      }
    }

    if (message.length !== 32)
      return false;

    for (let i=0; i< 8 ;i++) {
      const slice = message.slice(i*4, i*4+4);
      const int = parseInt(slice.toString('hex'),16);

      if (int !== slice.readUInt32BE())
        return false;
    }

    return true;
  }
}

Message.MAX_NONCE = 1024; //2**10; Math.pow(2, 10);

module.exports = Message;