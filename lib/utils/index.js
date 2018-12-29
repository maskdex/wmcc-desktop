/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

/**
 * @module wmcc-desktop.UTILS
 */
const UTILS = exports;

UTILS.define = function define(name, path) {
  let cache = null;
  Object.defineProperty(UTILS, name, {
    get() {
      if (!cache)
        cache = require(path);
      return cache;
    }
  });
};

UTILS.define('Message', './message');
UTILS.define('Updater', './updater');
UTILS.define('Zlib', './zlib');