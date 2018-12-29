/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

/**
 * @module wmcc-desktop.BROWSER
 */
const BROWSER = exports;

BROWSER.define = function define(name, path) {
  let cache = null;
  Object.defineProperty(BROWSER, name, {
    get() {
      if (!cache)
        cache = require(path);
      return cache;
    }
  });
};

BROWSER.define('Browser', './browser');
BROWSER.define('Events', './events');
BROWSER.define('Hook', './hook');
BROWSER.define('Listener', './listener');
BROWSER.define('Loader', './loader');
BROWSER.define('Render', './render');
BROWSER.define('Window', './window');