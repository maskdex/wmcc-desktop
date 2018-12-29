/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

/**
 * @module wmcc-desktop.VENDOR
 */
const VENDOR = exports;

VENDOR.define = function define(name, path) {
  let cache = null;
  Object.defineProperty(VENDOR, name, {
    get() {
      if (!cache)
        cache = require(path);
      return cache;
    }
  });
};

VENDOR.define('BigNum', '../source/vendor/bignumber.min.js');
VENDOR.define('Calendar', '../source/vendor/calendar.min.js');
VENDOR.define('JQuery', '../source/vendor/jquery-3.2.1.min.js');