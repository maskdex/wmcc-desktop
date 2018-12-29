/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

/**
 * @module wmcc-desktop
 */
const wmcc_desktop = exports;

wmcc_desktop.define = function define(name, path) {
  let cache = null;
  Object.defineProperty(wmcc_desktop, name, {
    get() {
      if (!cache)
        cache = require(path);
      return cache;
    }
  });
};

wmcc_desktop.define('VENDOR', './vendor');
wmcc_desktop.define('UTILS', './utils');
wmcc_desktop.define('BROWSER', './browser');