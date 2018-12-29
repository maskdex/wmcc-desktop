/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */
'use strict';

const {wmcc} = require('wmcc-core');
//--
const {
  Amount
} = wmcc;

class Listener {
  constructor(options) {
    this.node = options.node;
    this.render = options.render;
    this.info = options.info;
    this.mempool = options.mempool;
    this.chain = options.chain;

    this._events = new Map();

    this._init();
  }

  _init() {
    this.add('mempool', 'tx', this._mempoolTx.bind(this));
    this.add('chain', 'block', this._chainBlock.bind(this));
    this.add('walletdb', 'hook balance', this._walletBalance.bind(this));
    this.add('miner', 'miner block', this._minerBlock.bind(this));
    this.add('miner', 'miner found', this._minerFound.bind(this));
  }

  /**
   * Add an event listener to wmcc-node events
   * @param {String} node module name
   * @param {String} node event name
   * @param {Function} callback on emitted event
   */
  add(module, event, callback) {
    const listeners = this.node[module].listeners(event).filter((evt) => {
      return evt.toString() === callback.toString();
    });

    if (listeners.length)
      this.node[module].removeListener(event, callback);

    this.node[module].on(event, callback);
  }

  _mempoolTx(tx, view) {
    this.filter('mempool', {tx: tx, view: view});
  }

  _chainBlock() {
    this.filter('chain');
  }

  _walletBalance() {
    this.filter('balance');
  }

  _minerBlock(attempt) {
    this.filter('miner', {attempt: attempt});
  }

  _minerFound(block, entry) {
    this.filter('notification', {block: block, entry: entry, prepend: true});
  }

  /**
   * @param {String} Listener event name
   * @param {Object|Any} options
   */
  filter(event, options) {
    const items = this._events.get(event);
    if (!items)
      return;

    items.forEach(async (item, idx) => {
      if (!item.el.length) {
        items.splice(idx, 1);
        return; //continue;
      }

      await this.fire(event, item.func, item.el, options);
    });
  }

  /**
   * Call a function to render element
   * @param {String} listener event name
   * @param {String} listener funcion name
   * @param {Object} JQuery element
   * @param {Object|Any} options
   */
  async fire(event, func, el, options = {}) {
    try {
      if (typeof options === 'object')
        options = Object.values(options);

      const value = await this[func](...options);

      if (!el)
        return value;

      if (options.append)
        return el.append(value);

      if (options.prepend)
        return el.prepend(value);

      return el.html(value);
    } catch (err) {
      console.log(err)
      //if (err.name === 'TypeError') console.log(`Unable to call 'on' event for ${event}::${func}`);
      //else throw err;
    }
  }

  /**
   * Bind client element to listener event
   * @param {String} listener event name
   * @param {String} listener funcion name
   * @param {Object} JQuery element
   * @param {Object|Any} options
   */
  bind(event, func, el, options) {
    let items = this._events.get(event)||[];

    const item = {
      func: func,
      el: el
    }

    items = items.filter(_item =>{
      return _item.func === func && _item.el === el;
    });

    items.push(item);
    this._events.set(event, items);

    this.filter(event, options);
  }

  async call(module, func, options = {}) {
    if (typeof options === 'object')
      options = Object.values(options);

    if (module === 'info')
      return await this[module][func](...options);

    return await this.node[module][func](...options);
  }

  async getBalance() {
    //const info = this.node.info;
    const wallet = this.info.getWallet();
    return await wallet.getBalanceDetails(this.info.getAccountName());
  }

  async getTotal(value) {
    const amount = value || await this.getBalance();
    return Amount.text(amount.total);
  }

  async getAvailable(value) {
    const amount = value || await this.getBalance();
    return Amount.text(amount.available);
  }

  async getPending(value) {
    const amount = value || await this.getBalance();
    return Amount.text(amount.pending);
  }

  async getImmature(value) {
    const amount = value || await this.getBalance();
    return Amount.text(amount.immature);
  }

  async getRecentTransactions() {
    let txs;
    const html = [];
    const wallet = this.info.getWallet();

    try {
      txs = await wallet.getLast(wallet.account.name, 5);
    } catch (e) {
      return `<h2>${e}</h2>`;
    }

    for (let tx of txs) {
      const detail = await wallet.toDetails(tx);
      const date = new Date(detail.mtime * 1000).format("d-m-Y");

      let value = 0, type = null;
      for (let input of detail.inputs) {
        if (input.path)
          value += input.value, type = 'out';
        if (detail.time === 0)
          type = 'out sending';
      }

      if (!value) {
        for (let output of detail.outputs)
          if (output.path)
            value += output.value, type = 'in';
          if (detail.time === 0)
            type = 'in receiving';
          if (detail.tx.isCoinbase())
            type = 'rig';
      } else {
        value = 0;
        for (let output of detail.outputs)
          if (!output.path)
            value += output.value, type = 'out';
      }

      html.push(this.render.recentTx(type, date, value, detail.hash));
    }

    if (!html.length)
      return this.render.recentTxNotFound();

    return html.join('');
  }

  getUnconfirmTxCount() {
    return this.mempool.getCount();
  }

  getUnconfirmTxSize() {
    const size = this.mempool.getSize();
    return this._bytesToKilo(size);
  }

  getLatestTxs(tx, view) {
    const html = [];

    if (tx) {
      const incoming = [tx.hash('hex'), tx.getOutputValue()];
      if (this._latesttxs.indexOf(incoming))
        this._latesttxs.push(incoming);
      else
        return;
    } else {
      this._latesttxs = [];
      this.mempool.map.forEach((value, hash) => {
        this._latesttxs.push([hash, value.value]);
      });
    }

    const pos = this._latesttxs.length;
    const txs = this._latesttxs.slice(Math.max(0, pos - 5), pos);

    if (!txs.length)
      return this.render.latestTxNotFound();

    return this.render.latestTxs(txs);
  }

  async getCurrentBlock() {
    const height = this.chain.height;
    const entry = await this.chain.getEntry(height);
    const block = await this.chain.getBlock(entry.hash);

    return this.render.currentBlock(
      this.chain,
      entry,
      block
    );
  }

  getMinerInfo(attempt) {
    if (this._minerInfo && !attempt)
      attempt = this._minerInfo;

    const html = [
      '<table>',
      `</table>`
    ];

    if (attempt)
      html.splice(1, 0, this.render.minerInfo(attempt));
    else
      html.splice(1, 0, this.render.minerAddress(this.info.getMinerAddress()));

    return html.join('');
  }

  minerFoundBlock(block, entry) {
    if (typeof block !== "object")
      return;

    return this.render.minerFoundBlock(
      entry.height,
      Amount.wmcc(block.txs[0].outputs[0].value)
    );
  }

  /**
   * Should move to helper
   */
  _bytesToKilo(bytes) {
    if(bytes < 1048576) return(bytes / 1024).toFixed(3);
    else if(bytes < 1073741824) return(bytes / 1024).toFixed(0);
  }
}

module.exports = Listener;