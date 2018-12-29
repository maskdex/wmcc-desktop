/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

const Assert = require('assert');
const Crypto = require('crypto');
const FS = require('fs');
const Path = require('path');
const {PassThrough} = require('stream');
const ZLib = require('zlib');

class Zlib {
  constructor(options) {
    this.options = new ZlibOptions(options);

    this.input = this.options.input;
    this.output = this.options.output;
    this.level = this.options.level;
    this.password = this.options.password;
    this.files = this.options.files;
  }

  addFiles(files) {
    Assert(files instanceof Array);
    for (let file of files)
      this.addFile(file);
  }

  addFile(file) {
    Assert(typeof file === 'string');
    if (file === 'LOCK') return;

    if (!this.files.includes(file))
      this.files.push(file);
  }

  removeFiles(files) {
    Assert(files instanceof Array);
    for (let file of files)
      this.removeFile(file);
  }

  removeFile(file) {
    Assert(typeof file === 'string');
    this.files = this.files.filter(e => e !== file);
  }

  compress() {
    return new Promise(async (resolve) => {
      const files = await this.readDir(this.input);

      if (files.length)
        this.addFiles(files);

      const inputs = this.compile();
      const zipped = this.zip(inputs);
      resolve(zipped);
    });
  }

  decompress() {
    return new Promise(async (resolve) => {
      const data = await this.readFile(this.input);
      const inputs = this.unzip(data);
      this.mkdirp(this.output);
      this.readBuffer(inputs, resolve);
    });
  }

  writeFile(output, data) {
    const path = Path.join(this.output, output);
    return new Promise((resolve, reject) => {
      FS.writeFile(path, data, (e) => {
        if (e)
          reject(e);
        else
          resolve();
      });
    });
  }

  readFile(input) {
    return new Promise((resolve, reject) => {
      FS.readFile(input, (e, d) => {
        if (e)
          reject(e);
        else
          resolve(d);
      });
    });
  }

  readDir(input) {
    return new Promise((resolve, reject) => {
      FS.readdir(input, (e, f) => {
        if (e)
          reject(e);
        else
          resolve(f);
      });
    });
  }

  mkdirp(path, backup) {
    const dir = Path.dirname(path);
    if (!FS.existsSync(dir))
      this.mkdirp(dir);
    
    if (FS.existsSync(path) && !backup)
      this.backup(path);

    try {
      FS.mkdirSync(path);
    } catch (e) {
      ;
    }
  }

  readBuffer(inputs, resolve) {
    let data = Buffer.alloc(0);

    inputs.on('error', (err) => {
      const error = {
        type: Locale.get('Wrong Password'),
        message: Locale.get('The password you have entered is incorrect. Please try again.')
      };

      resolve(error);
    });

    inputs.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);
    });

    inputs.on('end', async() => {
      let offset = 0 + 1, //  +1 version
          len = 0;
      const total = data.readInt16LE(offset);
      try {
        for (let i=0; i<total; i++) {
          // fname
          offset = (i === 0) ? 1 + 2: len + offset + 4;
          len = data.readInt8(offset);
          const fname = data.slice(offset + 1, len + offset + 1);
          // data
          offset = len + offset + 1;
          len = data.readInt32LE(offset);
          const d = data.slice(offset + 4, len + offset + 4);
          await this.writeFile(fname.toString('utf8'), d);
          if (i === total-1)
            resolve();
        }
      } catch (e) {
        const error = {
          type: Locale.get('File Corrupted'),
          message: Locale.get('The file is corrupted and cannot be opened.')
        };

        resolve(error);
      }
    });
  }

  async backup(path) {
    const tempOut = this.output;
    const tempIn = this.input;
    const name = path.split(Path.sep);
    const date = new Date(Date.now()).toISOString().replace(/:/g,'-');
    name[name.length-1] = date + '-' + name[name.length-1];
    name.splice(name.length-1, 0, 'backup');
    const newfile = Path.join.apply(null, name);
    name.splice(name.length-1, 1);
    const newpath = Path.join.apply(null, name);

    this.mkdirp(newpath, true);
    this.output = newfile;
    this.input = path;
    await this.compress();
    this.output = tempOut;
    this.input = tempIn;
    this.mkdirp(path, true);
  }

  compile() {
    const version = Encoding.U8(1); // add this to options
    const length = Encoding.U16(this.files.length);
    let inputs = Buffer.concat([version, length]);

    for (let file of this.files) {
      const path = Path.join(this.input, file);
      const input = FS.readFileSync(path);
      const len = Encoding.U32(input.length);
      const fname = Buffer.from(file, 'utf8');
      inputs = Buffer.concat([inputs, Buffer.from([fname.length]), fname]);
      inputs = Buffer.concat([inputs, len, input]);
    }
    return inputs;
  }

  zip(inputs) {
    Assert(inputs instanceof Buffer);
    const zipped = ZLib.gzipSync(inputs, {level: this.level});
    const cipher = Crypto.createCipher('aes128', this.password);
    const output = FS.createWriteStream(this.output);
    const stream = new PassThrough();
    stream.end(zipped);
    return stream.pipe(cipher).pipe(output);
  }

  unzip(data) {
    const decipher = Crypto.createDecipher('aes128', this.password);
    const stream = new PassThrough();
    const unzip = ZLib.createGunzip();
    stream.end(data);
    return stream.pipe(decipher).pipe(unzip);
  }
}

class ZlibOptions {
  constructor(options) {
    this.input = null;
    this.output = null;
    this.level = 5;
    this.password = null;
    this.files = [];

    if (options)
      this.fromOptions(options);
  }

  fromOptions(options) {
    if (options.input != null) {
      Assert(typeof options.input === 'string');
      this.input = options.input;
    }

    if (options.output != null) {
      Assert(typeof options.output === 'string');
      this.output = options.output;
    }

    if (options.level != null) {
      if (typeof options.level === 'string')
        options.level = parseInt(options.level);

      Assert(typeof options.level === 'number');
      this.level = options.level;
    }

    if (options.password != null) {
      Assert(typeof options.password === 'string');
      this.password = options.password;
    }

    if (options.files != null) {
      if (options.files instanceof Array) {
        for (let file of options.files) {
          Assert(typeof file === 'string');
          if (this.files.includes(file))
            this.files.push(file);
        }
      } else {
        Assert(typeof options.files === 'string');
        this.files.push(options.files);
      }
    }

    return this;
  }
}

class Encoding {
  static U8(num) {
    const data = Buffer.allocUnsafe(1);
    data[0] = num >>> 0;
    return data;
  }

  static U16(num) {
    const data = Buffer.allocUnsafe(2);
    data.writeUInt16LE(num, 0, true);
    return data;
  }

  static U32(num) {
    const data = Buffer.allocUnsafe(4);
    data.writeUInt32LE(num, 0, true);
    return data;
  }
}

module.exports = Zlib;