'use strict';

const Assert = require('assert');
const FS = require('fs');
const Path = require('path');
const Util = require('util');

class Locale {
  constructor(options = {}) {
    this._ = {};

    this._opened = false;
    this._default = {};
    this._locales = new Map();
    this._current = options.default || 'default';
    this._prefix = options.prefix;
    this._init();
  }

  _init() {
    ;
  }

  async open() {
    Assert (!this._opened);
    this._ = this._default = await this._load('i18n', __dirname);

    if (this._current !== 'default')
      await this.set(this._current, this._prefix);

    this._opened = true;
  }

  async set(locale) {
    if (locale === this._current)
      return;

    this._ = await this._load(locale, this._prefix);
  }

  async _load(locale, prefix) {
    Assert(typeof locale === 'string');

    if (!this._locales.has(locale)) {
      this._require(Path.resolve(prefix, `${locale}.js`), locale);
    }

    return this._locales[locale];
  }

  _require(path, locale) {
    try {
      this._locales[locale] = require(path);
    } catch (e) {
      throw new Error(this.format(`Locale file not found, path: %s`, path));
    }
  }

  _write(buffer, path) {
    ;
  }

  _parse(buffer) {
    const br = new Reader(buffer);

    if (br.u8() === 1)
      return this._parseDefault(br);

    const count = buffer.readUInt32LE();
  }

  _parseDefault(br) {
   // const 
  }

  format(str, ...args) {
    return Util.format(str, ...args);
  }

  replace(data, module, category) {
    return data.replace(/\{\{(.*?)\}\}/g, (match, contents) => {
      const arr = toUnderScore(module, contents, category);
      return (category) ? this._.module[arr[2]][arr[0]][arr[1]]:this._.module[arr[0]][arr[1]];
    });
  }
}

function toUnderScore(...strings) {
  let arr = [];
  for (let string of strings) {
    if (string)
      arr.push(string.replace(/-/g, '_'));
  }

  return arr;
}

class Reader {
  constructor(buffer) {
    this._offset = 0;
    this._buffer = buffer;
  }

  u8() {
    return this._buffer.readUInt8(this._read(1)[0]);
  }

  read(size, enc) {
    return this._buffer.slice(...this._read(size), enc);
  }

  _read(size) {
    const curr = this._offset;
    this._offset+=size;
    return [curr, this._offset];
  }
}

module.exports = Locale;
/**
FORMAT
// default
01 << boolean isDefault
01 << version
0000 << category count
[array]
00 << category size
category << category name
0000 << category childs count
0000 << constant size
constant << constant string
0000 << text size
Text << text string
[/array]

// locale
00 << boolean isDefault
01 << version
0000 << text count
00000000 << constant checksum
0000 << text size
Text << text string
*/