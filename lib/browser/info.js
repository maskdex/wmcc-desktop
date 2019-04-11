/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */
'use strict';

const HTTPS = require('https');
const {http, net, primitives, protocol, utils, wmcc} = require('wmcc-core');
//--
const Render = require('./render');
//--
const {
  Client
} = http;
const {
  external
} = net;
const {
  Address
} = primitives;
const {
  consensus,
  policy
} = protocol;
const {
  encoding,
  util
} = utils;
const {
  Amount
} = wmcc;

class Info {
  constructor(options) {
    this.node = options.node;
    this.render = options.render;
    this.walletdb = options.walletdb;
    this.fees = options.fees;
    this.miner = options.miner;
    this.chain = options.chain;
    this.mempool = options.mempool;
    this.stratum = options.stratum;
    this.exchange = options.exchange;

    this._wallet = null;
    this._account = null;
    this._explorer = {
      isHome: true
    };
  }

  setWallet(wallet) {
    this._wallet = wallet;
    this._account = wallet.account;
  }

  getWallet() {
    return this._wallet;
  }

  getWalletID() {
    return this._wallet.id;
  }

  getAccounts() {
    return this._wallet.getAccounts();
  }

  getAccount() {
    return this._account;
  }

  getAccountName() {
    return this._account.name;
  }

  getAccountID() {
    return this._account.id;
  }

  getTempReceive() {
    return this._wallet.getTempReceive().toString();
  }

  async createReceive() {
    const account = await this.getAccountName();
    await this._wallet.createReceive(account);
    return this.getTempReceive();
  }

  async estimateFee() {
    let fee = await this.walletdb.estimateFee();
    return Amount.wmcc(fee);
  }

  async estimatePriority() {
    let priority = await this.fees.estimatePriority();
    if (priority === 0) priority = this.fees.minTrackedPri;
    return Amount.wmcc(priority);
  }

  /* Miner */
  isMinerStarted() {
    return this.miner.cpu.running;
  }

  async startMining() {
    try {
      return await this.miner.cpu.start();
    } catch (e) {;}
  }

  async stopMining() {
    try {
      return await this.miner.cpu.stop();
    } catch (e) {
      this.miner.reset(false);
    }
  }

  getMinerAddress() {
    return this.miner.getAddress().toString();
  }

  /* Wallet */
  getWalletInfo() {
    const details = this._wallet.toJSON(true);
    return this.render.walletInfo(details);
  }

  getWalletDetails() {
    const details = this._wallet.toJSON(true);
    return this.render.walletDetails(details);
  }

  async getWalletHistory(limit = 10, offset = 0) {
    limit = parseInt(limit);
    offset = parseInt(offset);
    const txs = await this._wallet.getTransactions(this.getAccountName(), limit, offset);
    return await this.getWalletHistoryTable(txs, {limit: limit, offset: offset});
  }

  async getWalletPendingTx() {
    const txs = await this._wallet.getPendingDetails(this.getAccountName());
    return await this.getWalletHistoryTable(txs, {pending: true});
  }

  async getWalletHistoryTable(txs, options) {
    if (!txs.length)
      return this.render.txHistoryNotFound(this.getWalletID(), this.getAccountName());

    const table = this.render.createTxHistoryTable(options.pending);

    for (let tx of txs) {
      const date = new Date(tx.mtime * 1000).format("M j, Y, g:i a");
      const hasInput = tx.inputs[0].address;

      let status, value = 0, send = false, amount = 0;
      if (hasInput) {
        for (let input of tx.inputs) {
          if (!input.path)
            continue;

          value += input.value;
          send = true;
          status = 'Sent';
          if (tx.time === 0)
            status = 'Sending';
        }
      }

      for (let output of tx.outputs) {
        if (!output.path)
          continue;

        if (!send)
          value += output.value;
        else
          value -= output.value;

        if (status) continue;

        status = 'Received';
        if (tx.time === 0)
          status = 'Receiving';

        if (tx.tx.isCoinbase())
          status = options.pending ? 'Staled': 'Mined';
      }

      try {
        amount = Amount.wmcc(value);
      } catch (e) {
        console.log(e);
        //console.log(tx);
        //console.log(value);
        amount = 'unknown';
      }

      this.render.appendTxHistoryTable(table, tx, date, status, amount, options.pending);
    }

    if (!options.limit)
      return table.join('');

    const pending = await this._wallet.getPending(this.getAccountName());
    const total = await this._wallet.getTotal(this.getAccountName());

    const page = this.render.paging(total - pending.length, options.offset, options.limit, 'r_wallet_get_history');

    table.push(page);
    return table.join('');
  }

  /* Adress book */
  async setGeneralSearchAddress(addr) {
    let address = null;
    try {
      address = Address.fromString(addr);
    } catch(e) {
      return this.render.addressBookInvalidFormat(addr);
    }

    const path = await this._wallet.getPath(address);
    if (!path)
      return this.render.addressBookNotFound(addr, this._wallet.id);

    await this.setExplorerAddress(addr);

    const {metatx, coins} = this._explorer.details;

    let balance = 0, received = 0;
    for (let coin of coins)
      balance += coin.value;

    for (let meta of metatx) {
      for (let output of meta.tx.outputs) {
        let out = output.getAddress() ? output.getAddress().hash: Buffer.alloc(0);
        if (address.hash.equals(out))
          received += output.value;
      }
    }

    return this.render.addressBook(addr, address.hash.toString('hex'), balance, received, metatx.length);
  }

  async getGeneralAddress(limit = 10, offset = 0) {
    limit = parseInt(limit);
    offset = parseInt(offset);

    const paths = await this._wallet.getAccountPaths(this.getAccountName());
    const end = (limit+offset) > paths.length ? paths.length : offset+limit;

    const table = this.render.createAddressTable();

    for (let i=offset; i<end; i++) {
      const address = paths[i].toAddress();
      this.render.appendAddressList(table, paths[i].hash, address);
    }

    const page = this.render.paging(paths.length, offset, limit, 'r_general_goto_addrs');

    table.push(page);
    return table.join('');
  }

  async getExplorerLatestBlocks(max = 5) {
    if (!this._explorer.isHome)
      return '';

    const tip = this.chain.height;
    const end = tip - parseInt(max);

    const table = this.render.createLatestBlockTable();

    for (let i=tip; i>end && i>-1; i--) {
      const entry = await this.chain.getEntry(i);
      const block = await this.chain.getBlock(entry.hash);

      this.render.appendLatestBlock(table, entry, block);
    }

    return table.join('');
  }

  getExplorerLatestTxs(max = 10) {
    if (!this._explorer.isHome)
      return '';

    if (!this.mempool.map.size)
      return this.render.latestTxNotFound();

    const end = parseInt(max);
    const table = this.render.createLatestTxTable();

    let count = 0;
    this.mempool.map.forEach((item, hash) => {
      if (end > count) {
        this.render.appendLatestTx(table, item, util.revHex(hash));
        count++;
      } else return;
    });

    return table.join('');
  }

  async setExplorerBlockByHeight(height) {
    try {
      const value = parseInt(height, 10);
      const entry = await this.chain.getEntry(value);
      const block = await this.chain.getBlock(entry.hash);
      this._explorer.details = {entry: entry, block: block};
      return entry.height || false;
    } catch (e) {
      return false;
    }
  }

  async setExplorerBlockByHash(hash) {
    try {
      const entry = await this.chain.getEntry(util.revHex(hash));
      const block = await this.chain.getBlock(util.revHex(hash));
      this._explorer.details = {entry: entry, block: block};
      return entry.rhash() || false;
    } catch (e) {
      return false;
    }
  }

  getExplorerBlockByHeight(height) {
    const {entry} = this._explorer.details;
    return (entry) ? entry.height : this.setExplorerBlockByHeight(height || this.chain.tip.height);
  }

  async getExplorerBlockSummary() {
    const {block, entry} = this._explorer.details;

    let total = 0;
    for (let tx of block.txs) {
      for (let vout of tx.outputs)
        total += vout.value;
    }

    let fee;
    if (entry.height === 0)
      fee = `0 wmcc`;

    for (let tx of block.txs) {
      if(tx.isCoinbase()) {
        const reward = consensus.getReward(entry.height);
        const output = tx.outputs[0].value;
        fee = `${Amount.wmcc((output-reward), true)} wmcc`;
      }
    }

    let prevHash = null;
    if (entry.prevBlock !== encoding.NULL_HASH)
      prevHash = util.revHex(entry.prevBlock);

    let nextHash = await this.chain.getNextHash(entry.hash) || null;
    if (nextHash)
      nextHash = util.revHex(nextHash);

    const details = {
      txLen: block.txs.length,
      height: entry.height,
      ts: new Date(entry.time * 1000).format("F j, Y, h:i:s A"),
      total: Amount.wmcc((total), true),
      confirm: this.chain.height - entry.height + 1,
      fee: fee,
      version: `0x${util.hex32(entry.version)}`,
      hash: entry.rhash(),
      bits: entry.bits,
      merkleRoot: util.revHex(entry.merkleRoot),
      size: `${block.getVirtualSize()} bytes`,
      weight: `${block.getWeight()} bytes`,
      chainWork: entry.chainwork.toString('hex', 64),
      nonce: entry.nonce,
      prevHash: prevHash,
      nextHash: nextHash
    }

    const table = this.render.blockTable(details);

    return table.join('');
  }

  async getExplorerTxs() {
    const {time, txs} = this._explorer.details.block;

    const tables = [];
    for (let tx of txs) {
      const date = new Date(time * 1000).format("M d, Y, g:i:s A");
      //const txid = util.revHex(tx.txid());

      const table = this.render.createTxsTable(tx.txid(), date, false);
      const {details, tin, tout} = await this.toTxDetails(tx);
      this.render.appendTxBody(table, details);
      this.render.appendTxFooter(table, tx, tin, tout);

      tables.push(...table);
    }

    return tables.join('');
  }

  async setExplorerAddress(address) {
    try {
      const addr = Address.fromString(address);
      const metatx = await this.chain.getMetaByAddress(address);
      const coins = await this.chain.getCoinsByAddress(address);
      const memtx = await this.mempool.getAllMetaByAddress(addr);

      metatx.push.apply(metatx, filtermeta(memtx));
      metatx.sort(compare);
      this._explorer.details = {address: addr, metatx: metatx, coins: coins};

      return addr || false;
    } catch (e) {
      return false;
    }
  }

  getExplorerAddress() {
    return `(${this._explorer.details.address})`;
  }

  getExplorerAddressSummary() {
    const {address, metatx, coins} = this._explorer.details;

    let balance = 0, received = 0;
    for (let coin of coins)
      balance += coin.value;

    for (let meta of metatx) {
      for (let output of meta.tx.outputs) {
        let out = output.getAddress() ? output.getAddress().hash: Buffer.alloc(0);
        if (address.hash.equals(out))
          received += output.value;
      }
    }

    return this.render.addressSummary(address.toString(), address.hash.toString('hex'), balance, received, metatx.length);
  }

  async getExplorerAddressTxs(limit = 50, offset = 0) {
    limit = parseInt(limit);
    offset = parseInt(offset);

    const {metatx, address} = this._explorer.details;
    const end = (limit+offset) > metatx.length ? metatx.length : offset+limit;

    const tables = [];
    for (let i=offset; i<end; i++) {
      const date = new Date((metatx[i].time||metatx[i].mtime) * 1000).format("M d, Y, g:i:s A");
      const txid = metatx[i].tx.txid();

      const table = this.render.createTxsTable(txid, date, metatx[i].block?false:true);
      const {details, tin, tout} = await this.toTxDetails(metatx[i].tx);
      this.render.appendTxBody(table, details, address.toString());
      this.render.appendTxFooter(table, metatx[i].tx, tin, tout);

      tables.push(...table);
    }

    if (!tables.length)
      tables.push(this.render.addressTxNotFound(address));

    const page = this.render.paging(metatx.length, offset, limit, 'r_explorer_get_addr_tx');

    tables.push(page);
    return tables.join('');
  }

  async setExplorerTransaction(hash) {
    try {
      this._explorer.details = await this.chain.getMeta(util.revHex(hash));
      return this._explorer.details || false;
    } catch (e) {
      return false;
    }
  }

  getExplorerTransaction() {
    return `(${this._explorer.details.tx.txid()})`;
  }

  async getExplorerTxSummary() {
    const {tx, time, mtime, height, block} = this._explorer.details;
    const {tin, tout} = await this.toTxDetails(tx);

    let totalinput = 0, fee = 0;
    if (!tx.isCoinbase())
      totalinput = Amount.wmcc(tin, true),
      fee = tin-tout;

    const rate = fee > 0 ? Amount.wmcc(policy.getRate(tx.getVirtualSize(), fee), true) : 0;
    const wrate = fee > 0 ? Amount.wmcc(policy.getRate(tx.getWeight(), fee), true) : 0;
    const blkheight = height < 0 ? 'N/A': height;
    const blktitle = height < 0 ? '': util.revHex(block);
    const confirm = height < 0 ? false: this.chain.height - height + 1;

    const details = {
      totalinput: totalinput,
      totaloutput: Amount.wmcc(tout, true),
      fee: Amount.wmcc(fee, true),
      size: tx.getVirtualSize(),
      weight: tx.getWeight(),
      rate: rate,
      wrate: wrate,
      date: new Date((time||mtime) * 1000).format("M d, Y, g:i:s A"),
      height: height,
      blktitle: blktitle,
      blkheight: blkheight,
      confirm: confirm
    }

    return this.render.txSummary(details);
  }

  async getExplorerTxTable() {
    const {tx} = this._explorer.details;
    //const txid = util.revHex(tx.txid());

    const table = this.render.createTxTable(tx.txid());
    const {details} = await this.toTxDetails(tx);

    this.render.appendTxBody(table, details);
    this.render.appendTxFooter(table);

    return table.join('');
  }

  getExplorerScripts() {
    const {inputs, outputs} = this._explorer.details.tx;

    const body = this.render.createScriptBody(inputs[0].getType());

    for (let input of inputs) {
      const script = input.script.toJSON();
      const witness = input.witness.toString();
      const commitment = input.script.getCommitment();

      if (script)
        this.render.appendScriptInput(body, input.script.getInputTypeVal(), script);

      if (commitment)
        this.render.appendScriptInput(body, null, commitment.toString('hex'));

      if (witness)
        this.render.appendScriptInput(body, input.witness.getInputTypeVal(), witness);
    }

    this.render.appendScriptOutputTitle(body);
    for (let output of outputs) {
      const commitment = output.script.getCommitment();

      this.render.appendScriptOutput(body, output.getType(), output.script.toString());

      if (commitment)
        this.render.appendScriptOutput(body, null, commitment.toString('hex'));
    }

    return body.join('');
  }

  async setExplorerPending(hash) {
    try {
      this._explorer.details = await this.mempool.getMeta(util.revHex(hash));
      return this._explorer.details || false;
    } catch (e) {
      return false;
    }
  }

  getExplorerPending() {
    return `(${this._explorer.details.tx.txid()})`;
  }

  setExplorerHome(bool) {
    this._explorer.isHome = bool;
  }

  resetExplorer() {
    this._explorer.details = false;
  }

  getInfoUpdate() {
    const {major, minor, patch} = require("../information.json").update;
    return this.render.updateInformation(major, minor, patch);
  }

  getInfoClient() {
    return this.render.clientInformation();
  }

  async getInfoServer() {
    const client = Client();
    const info = await client.getInfo();

    const sysdate = new Date(info.time.system * 1000).format("M j, Y, g:i a");
    const lastblk = new Date(this.chain.tip.time * 1000).format("M j, Y, g:i a");

    return this.render.serverInformation(info, sysdate, lastblk, this.chain.db.options.prefix);
  }

  async getInfoPublicIP() {
    return await external.getIPv4();
  }

  async exchangeList() {
    const list = await this._getContent('https://raw.githubusercontent.com/WorldMobileCoin/wmcc-exchangelist/master/list.json')
    if (list.error)
      return this.render.exhangeError(list.error)

    const template = await this._getContent('https://raw.githubusercontent.com/WorldMobileCoin/wmcc-exchangelist/master/template.js')
    if (template.error)
      return this.render.exhangeError(template.error)

    try {
      const json = JSON.parse(list)
      return this.render.exchangeList(template, json)
    } catch(err) {
      console.error(err)
      return this.render.exhangeError(err)
    }
  }

  async _getContent(url) {
    return new Promise(resolve => {
      const request = HTTPS.get(url, (res) => {
        let chunk = ''
        res.on("data", data => {
          chunk += data
        })

        res.on("end", () => {
          resolve(chunk)
        })
      }).on('error', err => {
        resolve({error: err})
      })
    })
  }

  isExchangeConnected() {
    if (!this.exchange.isConnected())
      return '';

    this.render.removeExchangeAccountType(this.exchange.body());
  }

  getExchangeLatestVersion() {
    return this.exchange.latestVersion();
  }

  getConfigBasic() {
    const config = this.node.config;
    const _default = config.getDefault();

    const body = [];
    for (let cls of Object.keys(_default)) {
      if (!cls) continue;
      this.render.appendConfigHeader(body, cls);

      for (let opt in _default[cls]){
        const _opt = _default[cls][opt];
        const val = _opt[0];
        const datatype = _opt[1];
        const disabled = _opt[2] ? '' : ' disabled';
        const clses = _opt[3] ? ` ${_opt[3]}` : '';
        const key = opt.replace(/-/g, '').toLowerCase();
        const value = config.data[key] || val;
        const checked = (value==='true') ? ' checked': '';

        let input;
        if (datatype === 'bool')
          input = this.render.getConfigCheckBox(checked, disabled, opt);
        else
          input = this.render.getConfigInput(datatype, clses, value, disabled, opt);

        this.render.appendConfigDefault(body, val, input, opt);
      }
    }

    this.render.appendConfigSubmit(body);

    return body.join('');
  }

  getStratumInfo() {
    const info = this.stratum.options;
    const connected = this.stratum.inbound.size;
    const active = new Date(this.stratum.lastActive * 1000).format("M j, Y, g:i a");

    return this.render.stratumInformation(info, connected, active);
  }

  getStratumUsers() {
    const userdb = this.stratum.userdb;

    if (!userdb.size)
      return this.render.stratumUserNotFound();

    return this.render.stratumUser(userdb);
  }

  async toTxDetails(tx) {
    let tin = 0, tout = 0, outputs = null;

    const details = {
      output: {},
      input: {},
      pending: []
    }

    for (let vin of tx.inputs) {
      if (tx.isCoinbase())
        continue;

      const chaintx = await this.chain.getTX(vin.prevout.hash);
      if (chaintx)
        outputs = chaintx.outputs;
      else {
        outputs = await this.mempool.getTX(vin.prevout.hash).outputs;
        details.pending.push(`${outputs[vin.prevout.index].getAddress()}`);
      }

      const input = outputs[vin.prevout.index].value;
      const inaddr = `${outputs[vin.prevout.index].getAddress()}`;

      if (details.input[inaddr])
        details.input[inaddr] += input;
      else
        details.input[inaddr] = input;

      tin += input;
    }

    for (let vout of tx.outputs) {
      const outaddr = vout.script.getAddress() ? `${vout.script.getAddress()}`: 'unknown';
      if (details.output[outaddr])
        details.output[outaddr] += vout.value;
      else
        details.output[outaddr] = vout.value;

      tout += vout.value;
    }

    return {
      details: details,
      tin: tin,
      tout: tout
    }
  }
}

/**
 * Helper
 */
function compare(a, b) {
  const atime = a.time ? a.time: a.mtime;
  const btime = b.time ? b.time: b.mtime;
  return (atime < btime) ? 1 : ((btime < atime) ? -1 : 0);
}
/*
function filtermeta(meta) {
  return meta.filter( function(e,i,s) {
    return s[i].tx._hhash !== e.tx._hhash;
  });
}
*/
function filtermeta(meta) {
  let d = [];
  return meta.filter( function(e) {
    if (d.indexOf(e.tx._hhash) === -1) {
      d.push(e.tx._hhash);
      return true;
    }
    return false;
  });
}

/**
 * Expose
 */
module.exports = Info;