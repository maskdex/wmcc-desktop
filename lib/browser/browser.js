/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */
'use strict';

const Asset = require('assert');
const FS = require('fs');
const Path = require('path');
//--
const {FullNode} = require('wmcc-node');
const Exchange = require('wmcc-exchange-client');
//--
const Events = require('./events');
const Hook = require('./hook');
const Info = require('./info');
const Listener = require('./listener');
const Loader = require('./loader');
const Locale = require('./locale');
const Render = require('./render');
//--
const Message = require('../utils/message');
//--
//const Submit = require('./submit');

/**
 * @module BROWSER.Browser
 */
class Browser {
  /**
   * @param {Object} browser document
   */
  constructor(options = {}) {
    this.node = new FullNode({
      config: true,
      argv: true,
      env: true,
      logFile: true,
      logConsole: true,
      logBrowser: true,
      logLevel: 'debug',
      db: 'leveldb',
      persistent: true,
      workers: true,
      listen: true,
      loader: eval('require')
    });

    this.i18n = new Locale({
      prefix: this.node.prefix
    });

    this.render = new Render(this.i18n);

    this.exchange = new Exchange({
      config: this.node.config,
      logger: this.node.logger,
      auth: this.node.auth,
      message: Message
    });

    this.info = new Info({
      node: this.node,
      render: this.render,
      chain: this.node.chain,
      walletdb: this.node.walletdb,
      miner: this.node.miner,
      stratum: this.node.stratum,
      mempool: this.node.mempool,
      fees: this.node.fees,
      exchange: this.exchange
    });

    this.exchange.info = this.info;

    this.listener = new Listener({
      node: this.node,
      render: this.render,
      info: this.info,
      mempool: this.node.mempool,
      chain: this.node.chain
    });

    this.loader = new Loader({
      node: this.node,
      logger: this.node.logger,
      i18n: this.i18n,
      info: this.info,
      render: this.render,
      listener: this.listener,
      auth: this.node.auth,
      walletdb: this.node.walletdb
    });

    this.events = new Events({
      node: this.node,
      i18n: this.i18n,
      render: this.render,
      info: this.info,
      loader: this.loader,
      exchange: this.exchange,
      auth: this.node.auth,
      chain: this.node.chain,
      http: this.node.http,
      walletdb: this.node.walletdb,
      miner: this.node.miner,
      miningpool: this.node.plugins.miningpool,
      stratum: this.node.stratum
    });

    this.hook = new Hook({
      node: this.node,
      i18n: this.i18n,
      //logger: this.logger,
      info: this.info,
      render: this.render,
      loader: this.loader,
      exchange: this.exchange,
      events: this.events,
      auth: this.node.auth
    });

    this._init(options);
  }

  /**
   * Initiate browser
   * @private
   */
  _init(options) {
    this._loadPlugin(options);
  }

  async start() {
    await this.i18n.open();
    await this.node.logger.open();

    this.render.body(false);
    this.loader.start();
  }

  /**
   * Load plugins
   * @private
   */
  _loadPlugin(options) {
    try {
      const path = Path.resolve(__dirname, options.pluginPath || '../../../plugin');
      FS.readdirSync(path).forEach( (file) => {
        if (Path.extname(file) === '.asar') {
          const plugin = eval('require')(Path.join(path, file));
          this.node.use(plugin);
        }
      });
    } catch (e) {;}
  }
};

/**
 * Expose
 */
module.exports = Browser;