/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

const Asset = require('assert');
const Path = require('path');
//--
const Core = require('wmcc-core');
const {Node} = require('wmcc-node');
const {HSM} = require('wmcc-credential');
const {remote} = require('electron');
//--
//const {UTILS, VENDOR} = require('../');
//--
const {
  common,
  http,
  protocol,
  wmcc
} = Core;
const {
  JQuery // << check this, should load from browser??
} = require('../vendor');;
const {
  Amount
} = wmcc;
const {
  policy
} = protocol;
const {
  RPCBase
} = http;
const {
  dialog
} = remote;
const {
  Message,
  Updater,
  Zlib
} = require('../utils');

/**
 * @module BROWSER.Events
 */
class Events {
  constructor(options) {
    this.updater = new Updater({
      render: options.render
    });

    this.node = options.node;
    this.i18n = options.i18n;
    this.render = options.render;
    this.info = options.info;
    this.loader = options.loader;
    this.exchange = options.exchange;
    this.auth = options.auth;
    this.chain = options.chain;
    this.http = options.http;
    this.walletdb = options.walletdb;
    this.miner = options.miner;
    this.miningpool = options.miningpool;
    this.stratum = options.stratum;

    this._hsm = null;
    this._wallet = null;
    this._walletdb = null;
    this._decrypt = null;
    this._secretNo = 0;

    this._init();
  }

  /**
   * Initiate internal event
   */
  _init() {
    this.bind(Events.EVENTS.CLICK, '.s_wallet_create', this._walletCreate.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_wallet_login', this._walletLogin.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_wallet_reset', this._walletReset.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_wallet_get_otp', this._walletGetOtp.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_wallet_change_secret', this._walletChangeSecret.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_wallet_update_secret', this._walletUpdateSecret.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_wallet_backup', this._walletBackup.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_wallet_restore', this._walletRestore.bind(this));
    this.bind(Events.EVENTS.DRAGDROP, '.s_wallet_dragdrop', this._walletDragDrop.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_secret_reset', this._secretReset.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_tx_create', this._txCreate.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_tx_request', this._txRequest.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_tx_rebroadcast', this._txRebroadcast.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_send_coin_reset', this._sendCoinReset.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_message_sign', this._messageSign.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_message_verify', this._messageVerify.bind(this));
    this.bind(Events.EVENTS.KEYPRESS, 'body', this._pressEnter.bind(this)); // s_press_enter
    this.bind(Events.EVENTS.KEYUP, 'body', this._pressEscape.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_config_save', this._configSave.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_stratum_remove_worker', this._stratumRemoveWorker.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_stratum_add_worker', this._stratumAddWorker.bind(this));
    this.bind(Events.EVENTS.CLICK, '.s_exchange_connect', this._exchangeConnect.bind(this));

    this.chain.db.on('rescan', () => {
      this.walletdb.rescan(0);
    });

    this.chain.db.on('block scan', (hash, height) => {
      JQuery('preload').show();
      JQuery('preloadcontent').html(this.render.scanningBlock(height, hash));
      if (this.chain.tip.height === height)
        JQuery('preload').hide();
    });
  }

  /**
   * Bind an event to window document event
   * @param {String} event name
   * @param {String} browser element
   * @param {Function} func
   * @param {Any} options
   */
  bind(event, element, fn, options) {
    Asset(typeof event === 'string');
    Asset(typeof element === 'string');
    Asset(typeof fn === 'function');

    JQuery(document).on(event, element, async (evt) => {
      await fn(JQuery(evt.target) || JQuery(evt), evt, options);
    });
  }

  /**
   * @param {Object} walletInfo {name, dob, secrets}
   * @param {Object} JQuery element
   * @param {Object} JQuery parent element
   */
  async walletCreate(walletInfo, el, parent) {
    const wallet = this.auth.hasWallet(walletInfo.name);

    if (wallet)
      return this.render.walletExists(parent, walletInfo.name);

    await this.node.ensure();
    await this.auth.create(walletInfo.name, walletInfo.dob, walletInfo.secrets);
    this._walletReset(el);
  }

  walletRestore(parent, file) {
    let wid, suffix;

    try {
      suffix = Path.parse(file).name.replace('DONT_RENAME_','');
      wid = this.auth.fromSuffix(suffix);
    } catch (e) {
      return this.render.invalidWalletBackup(parent, file);
    }

    const outpath = Path.join(this.walletdb.options.location, `${suffix}.ldb`);

    if (this.auth.hasWallet(wid))
      return this.render.walletOverwrite(parent, file, outpath, suffix, wid);

    this.render.zipPassword(parent, file, outpath, suffix, wid);
  }

  /**
   * @param {String} inputs
   * @param {Object} JQuery parent element
   * @return {JSON|Boolean} walletInfo
   */
  _walletInfo(inputs) {
    const walletInfo = {
      name: JQuery(inputs.name).val(),
      dob: JQuery(inputs.dob).val(),
      secrets: []
    };

    let secret = {};
    JQuery(`${inputs.question},${inputs.answer}`).each((idx, el) => {
      if (idx%2 === 0) {
        secret.question = JQuery(el).val();
      } else {
        secret.answer = JQuery(el).val();
        walletInfo.secrets.push(secret);
        secret = {};
      }
    });

    return walletInfo;
  }

  _mergeOutput(outputs) {
    const map = outputs.reduce((prev, curr) => {
      const count = prev.get(curr.address) || 0;
      prev.set(curr.address, curr.value + count);
      return prev;
    }, new Map());

    return [...map].map(([address, value]) => {
      return {address, value}
    });
  }

  _testLogin(inputs, el) {
    const elems = this.render.testInput(Object.values(inputs).join(', '));
    if (elems) {
      for (let elem of elems)
        this.render.tooltip(elem, this.i18n._.general.required);

      return false;
    }

    const name = JQuery(inputs.name).val();
    if (!common.isName(name)) {
      this.render.invalidWalletName(el);
      return false;
    }

    return true;
  }

  _testAmount(amount, el) {
    try {
      return Amount.wmcoin(amount);
    } catch (e) {
      this.render.invalidAmount(el);
      return false;
    }
  }

  async _processAnswer(el, answer) {
    this._decrypt = await this._hsm.setAnswer(answer);

    const question = this._decrypt.question;
    if (question) {
      this.render.renderHint(++this._secretNo, question.toString().replace(/"/g, '&quot;'));
      return;
    }

    if(this._wallet.chksum.toString() === this._decrypt.passphrase.slice(0, 4).toString()){
      if (this.miningpool)
        this.miningpool.payment.addWallet(this._wallet, this._decrypt.passphrase);

      if (this.miner.addresses.length === 0)
        this.miner.addAddress(this._wallet.getReceive('hex').toString());

      if (this.auth.otp.enable) {
        const otp = this.auth.getOTP(this._decrypt.passphrase);
        await this._renderOTP(el, otp);
      } else {
        await this._setupNode();
      }

      return;
    }

    const parent = el.parent();
    const html = [
      `<span>${this.i18n._.credential.err_invalid_credential[1]}<br>`,
      `${this.i18n._.credential.err_invalid_credential[2]}</span>`,
      `<a class="button">${this.i18n._.general.try_again}</a>`
    ];

    const opt = {
      transformZ: true,
      title: this.i18n._.credential.err_invalid_credential[0]
    };

    const modalbox = this.render.modalBox(parent, html.join(''), opt);
    const child = JQuery(modalbox).find("modalbox").find("i, a");

    for(let i=0; i<child.length;i++){
      JQuery(child[i]).unbind('click').on('click', () => {
        JQuery(modalbox).css('-webkit-transform', '');
        this._walletReset(el);
      });
    }
  }

  _renderOTP(el, otp) {
    if (this.auth.logged)
      this.render.fullModal();

    this.render.renderOtp(el.parent(), otp, this._setupNode.bind(this));
  }

  async _setupNode() {
    this.info.setWallet(this._wallet);
    this.node.walletdb = this._walletdb;

    this._walletdb.db.close();
    await this.node.close();

    for (let mount of this.http.mounts) {
      mount.ctx.walletdb = this.walletdb;
      mount.handler.walletdb = this.walletdb;
    }

    this.miner.address = this.miner.getAddress() || this._wallet.getMinerAddress();

    await this.node.ensure();
    await this.node.open();

    await this._hsm.destroy();
    await this.node.connect();

    this.auth.logged = true;
    this.render.body(true);

    this.loader.start();
    this.updater.start();

    // zap stale //abandon// tx
    try {
      // todo: catch array then notify
      await this._wallet.zap(this._wallet.account.name, policy.MAX_TX_SIGOPS_COST);
      //await wallet.abandon(pending[0]);
    } catch (e){
      ;
    }

    this.node.startSync();
  }

  async _walletLoad(inputs, parent) {
    const name = JQuery(inputs.name);
    const dob = JQuery(inputs.dob);
    const wid = name.find('option:selected').val();
    const suffix = this.auth.toSuffix(wid);

    const loading = this.render.createLoading(parent);
    await this.auth.close(suffix, false);

    this._walletdb = await this.auth.load(suffix);
    this._wallet = await this._walletdb.get(wid);

    this._hsm = this.auth.hsm;
    this._decrypt = await this._hsm.decrypt(wid, dob.val(), this._wallet.lock);

    const question = this._decrypt.question;
    if (question) {
      this._secretNo = 1;
      this.render.renderHint(this._secretNo, question.toString().replace(/"/g, '&quot;'));
      name.attr('disabled', 'disabled');
      dob.attr('disabled', 'disabled');
    }

    if (this.exchange.isConnected())
      this.exchange.disconnect();

    loading.remove();
  }

  /**
   * @param {Object} JQuery element
   */
  async _walletCreate(el) {
    const inputs = {
      name: 'input[name="name"]',
      dob: 'input[name="dob"]',
      question: 'input[name*="question_"]',
      answer: 'input[name*="answer_"]'
    };

    el.prop('disabled', true);

    if (!this._testLogin(inputs, el))
      return;

    const parent = el.parents('content, walletcontent');
    const walletInfo = this._walletInfo(inputs);

    if (walletInfo)
      await this.walletCreate(walletInfo, el, parent);

    el.prop('disabled', false);
  }

  async _walletLogin(el) {
    const inputs = {
      name: 'select[name="name"]',
      dob: 'input[name="dob"]',
      answer: 'input[name="answer"]'
    };

    el.prop('disabled', true);

    const elems = this.render.testInput(Object.values(inputs).join(', '));
    if (elems) {
      for (let elem of elems)
        this.render.tooltip(elem, this.i18n._.general.required);

      el.prop('disabled', false);
      return;
    }

    const answer = JQuery(inputs.answer);
    if (answer.length)
      await this._processAnswer(el, answer.val());
    else
      await this._walletLoad(inputs, el.parent());

    el.prop('disabled', false);
  }

  /**
   * @param {Object} JQuery element
   */
  _walletReset(el) {
    const prev = el.closest('h1 + holder').length ?
      el.closest('h1 + holder') :
      el.closest('menu + content');

    const button = prev.prev().find('tabbutton[active="true"], menubutton[active="true"]');
    button.removeAttr('active').trigger('click');
  }

  _walletGetOtp(el) {
    const parent = el.parent();
    const potp = parent.find('[name="otp"]').eq(0).val();
    const result = parent.find('result').eq(0);

    if (!potp) return;

    const {passphrase, otp} = this.auth.getPassphrase(potp, true);
    if (!passphrase)
      return this.render.invalidOtp(result, this.auth);

    el.remove();
    this.render.newOtp(result, otp, 's_wallet_change_secret');
  }

  _walletChangeSecret(el) {
    const parent = el.parent().parent().parent().parent();
    const name = parent.find('[name="name"]').eq(0);
    const dob = parent.find('[name="dob"]').eq(0);
    const salt = this.auth.hsm.salt.toString('utf8');
    const content = parent.find('walletcontent');
    content.eq(0).prop('hidden', true);
    content.eq(1).removeAttr('hidden');
    name.val(this._wallet.id);
    dob.val(salt);
  }

  async _walletUpdateSecret(el) {
    const parent = el.parent().parent().parent();
    const potp = parent.find('.s_wallet_change_secret').eq(0).attr("value");
    const passphrase = this.auth.getPassphrase(potp);
    const inputs = {
      name: 'input[name="name"]',
      dob: 'input[name="dob"]',
      question: 'input[name*="question_"]',
      answer: 'input[name*="answer_"]'
    };

    if (!this._testLogin(inputs, el))
      return;

    const walletInfo = this._walletInfo(inputs);
    const hsm = await this.auth.hsm.encrypt(walletInfo.name, walletInfo.dob, walletInfo.secrets);
    const {lock, chksum} = HSM.toObject(hsm);
    this._wallet.lock = lock;
    this._wallet.chksum = chksum;

    await this._wallet.setPassphrase(passphrase.toString('hex'), hsm.passphrase.toString('hex'));
    await this.auth.hsm.destroy();
    //this._hsm = {};
    this._walletReset(el);
  }

  _walletBackup(el) {
    const parent = el.parent().parent();
    const passwords = parent.find('input[type="password"]');
    const level = parent.find('input[name="compress-level"]:checked').val();

    parent.find('p').html('');
    parent.find('result').html('');
    parent.find('.error').removeClass('error');

    if (passwords.eq(0).val() !== passwords.eq(1).val()) {
      passwords.eq(1).addClass('error');
      passwords.eq(1).next().html(this.i18n._.general.password_dont_match);
      return;
    }

    dialog.showOpenDialog({
      properties: ["openDirectory"]
    }, async (folder) => {
      if (!folder) return;
      const options = {
        input: this._wallet.db.db.location,
        output: Path.join(folder[0], `DONT_RENAME_${this._walletdb.getSuffix()}.bak`),
        level: level,
        password: passwords.eq(0).val()
      }
      const zlib = new Zlib(options);
      const output = await zlib.compress();
      this.render.fileSaved(parent.find('result'), output.path);
    });
  }

  _walletRestore(el) {
    const parent = el.parent().parent().parent().parent();

    dialog.showOpenDialog({
      properties: ["openFile"]
    }, (file) => {
      if (!file) return;
      this.walletRestore(parent, file[0]);
    });
  }

  _walletDragDrop(el, event) {
    event.preventDefault();
    event.stopPropagation();
    const elem = el.closest('dragdrop');
    const parent = elem.parent().parent().parent();

    if (event.type === 'dragover')
      elem.css({'background-color': '#DDFFDD'});
    else if (event.type === 'dragleave')
      elem.css({'background-color': '#f9f9f9'});
    else if (event.type === 'drop') {
      elem.css({'background-color': '#f9f9f9'});
      const file = event.originalEvent.dataTransfer.files[0].path;
      this.walletRestore(parent, file);
    }
  }

  /**
   * @param {Object} JQuery element
   */
  _secretReset(el) {
    this._walletReset(el);
  }

  async _txCreate(el) {
    const outputs = [];
    const parent = el.parent().parent();
    const t_out = parent.find('table.outputs');
    const addr = parent.find('.address:first');
    const val = parent.find('input[coin="wmcc"]');

    let amount;
    if(addr.val() && val.val() && !addr.hasClass('error') && !val.hasClass('error')) {
      amount = this._testAmount(val.val().toString(), parent);
      if (!amount)
        return;

      outputs.push({value: amount, address: addr.val()});
    }

    if (t_out.length) {
      JQuery('tr:not(:first-child)', t_out).each((idx, el) => {
        const t_addr = JQuery(el).children('td:first').html();
        const t_val = JQuery(el).children('td:nth-child(2)').html();
        amount = this._testAmount(t_val, parent);
        if (!amount)
          return;

        outputs.push({value: amount, address: t_addr});
      });
    }

    if (!outputs.length)
      return;

    const outs = this._mergeOutput(outputs);
    const wmcc_rate = parent.find('input[coin="rate"]');

    let rate;
    try {
      rate = Amount.wmcoin(wmcc_rate.val());
    } catch(e) {
      wmcc_rate.addClass('error');
      wmcc_rate.next().next().next().html(this.i18n._.general.too_many_decimal_point);
      return;
    }

    const options = {
      outputs: outs,
      rate: rate
    }

    try {
      const mtx = await this._wallet.createTX(options);
      await this._wallet.sign(mtx, this._decrypt.passphrase.toString('hex'));
      if (!mtx.isSigned())
        throw new Error(this.i18n._.transaction.err_could_not_fully_signed);

      const tx = mtx.toTX();
      if (tx.getSigopsCost(mtx.view) > policy.MAX_TX_SIGOPS_COST)
        throw new Error(this.i18n._.transaction.err_exceeds_policy_sigops);

      if (tx.getWeight() > policy.MAX_TX_WEIGHT)
        throw new Error(this.i18n._.transaction.err_exceeds_policy_weight);

      const tout = (outs.length > 1) ?
        Object.values(outs).reduce((a, b) => {
          return {value: a.value + b.value}
        }) :
        outs[0];

      const fee = tx.getFee(mtx.view);
      const total = tout.value + fee;
      const rate = tx.getRate(mtx.view);

      if (tx.getMinFee() > fee)
        throw new Error(this.i18n.format(
          this.i18n._.transaction.err_fee_below_min_value,
          Amount.wmcc(tx.getMinFee()),
          Amount.wmcc(fee)
        ));

      this.render.txConfirmation({
        id: tx.txid(),
        tin_len: tx.inputs.length,
        tout_len: tx.outputs.length,
        tout_val: Amount.wmcc(tout.value),
        fee: Amount.wmcc(fee),
        rate: Amount.wmcc(rate),
        total: Amount.wmcc(total)
      }, this.auth, this._wallet, tx);
    } catch (err) {
      this.render.txError(err);
    }
  }

  _txRequest(el) {
    const parent = el.prop("tagName") === 'I' ?
      el.parent().parent().parent() :
      el.parent().parent();

    const val = parent.find('input[coin="wmcc"]').val();
    const desc = parent.find('textarea').val();

    this.render.txRequest(parent);
  }

  async _txRebroadcast(el) {
    if (el.hasClass('disabled'))
      return;

    el.addClass('disabled');
    const txid = el.parent().siblings('.txid').attr("title");
    if (txid) {
      const meta = await this.node.getMeta(txid);
      if (!meta)
        return;

      const tx = meta.tx;
      await this.node.broadcast(tx);
      el.html('Sent');
    }
  }

  _sendCoinReset() {
    const el = JQuery('menubutton[page="menu-top_send-receive-coin"]');
    el.removeAttr('active').trigger('click');
  }

  async _messageSign(el) {
    const parent = el.parent().parent();
    const addr = parent.find('.address').eq(0).val();
    const msg = parent.find('.message').eq(0).val();
    const potp = parent.find('.otp').eq(0).val();
    const sign = parent.find('.signature').eq(0);
    const result = parent.find('result').eq(0);

    result.html('');
    sign.val('');

    if (parent.find('.address').eq(0).hasClass('error'))
      return;

    if (!addr || !msg || !potp)
      return this.render.renderError(result, this.i18n._.message.err_addr_msg_otp_required);

    const passphrase = this.auth.getPassphrase(potp);
    if (!passphrase)
      return this.render.invalidOtp(result, this.auth);

    try {
      const key = await this._wallet.getPrivateKey(addr, passphrase.toString('hex'));
      if (!key)
        return this.render.renderError(result, this.i18n._.message.err_addr_not_owned_by_wallet);

      const options = {
        privKey: key.getPrivateKey(),
        magic: RPCBase.MAGIC_STRING,
        compressed: true,
        i18n: this.i18n
      }
      const message = new Message(msg, addr, options);
      const sig = message.sign();
      const {otp} = this.auth.getPassphrase(potp, true);

      sign.val(sig.signature.toString('base64'));

      this.render.newOtp(result, otp);
    } catch (err) {
      this.render.renderError(result, err.message || err);
    }
  }

  _messageVerify(el) {
    const parent = el.parent().parent();
    const addr = parent.find('.address').eq(0).val();
    const msg = parent.find('.message').eq(0).val();
    const sign = parent.find('.signature').eq(0).val();
    const result = parent.find('result').eq(0);

    result.html('');

    if (!addr || !msg || !sign)
      return this.render.renderError(result, this.i18n._.message.err_addr_msg_sig_required);

    try {
      const options = {
        signature: sign,
        magic: RPCBase.MAGIC_STRING,
        i18n: this.i18n
      }
      const message = new Message(msg, addr, options);

      if (!message.verify())
        return this.render.renderError(result, this.i18n._.message.err_verification_failed);

      this.render.render(result, 'span', this.i18n._.message.verification_success);
    } catch (err) {
      this.render.renderError(result, err.message || err);
    }
  }

  _pressEnter(el, event) {
    if (event.keyCode === 13) {
      const queue = function() {
        JQuery(this).removeClass("active").click().dequeue();
      }

      JQuery('.s_press_enter').addClass('active').delay(100).queue(queue);
    }
  }

  _pressEscape(el, event) {
    if (event.keyCode === 27)
      JQuery('.s_press_escape').click();
  }

  _configSave(el) {
    const parent = el.parent();
    const _default = this.node.config.getDefault();

    let data = `# Wmcc configuration file (wmcc.conf)\n`;
    for (let cls of Object.keys(_default)) {
      data += `\n#\n# ${cls}\n#\n\n`;
      for (let opt in _default[cls]){
        const val = _default[cls][opt][0];
        const datatype = _default[cls][opt][1];
        const item = parent.find(`input[name="${opt}"], checkbox[name="${opt}"]`).eq(0);

        let value;
        if (datatype === 'bool') {
          value = JQuery(item).prop("checked");
        } else {
          value = JQuery(item).val();
        }
        if (`${val}` === `${value}`)
          data += `# ${opt}: ${value}\n`;
        else
          data += `${opt}: ${value}\n`;
      }
    }

    this.node.config.write('wmcc.conf', data);
    el.prev().html(this.i18n._.general.config_updated).show();
  }

  _stratumRemoveWorker(el) {
    const parent = el.parent().parent();
    const user = parent.find('td').eq(0).text();

    this.stratum.userdb.remove(user);
    this._walletReset(el);
  }

  _stratumAddWorker(el) {
    const parent = el.parent().parent();
    const user = parent.find('.workername').val();
    const pass = parent.find('.workerpass').val();
    parent.find('p').removeClass().html('').hide();

    try {
      this.stratum.userdb.add({
        username: user,
        password: pass
      });
    } catch (err) {
      parent.find('p').eq(0).addClass('error').html(err.message).show();
      return;
    }
    this._walletReset(el);
  }

  _exchangeConnect(el) {
    if (el.hasClass('active'))
      return;

    const parent = el.parents('accounttype');
    const inputs = parent.find('input');

    setTimeout(async () => {
      let opened;
      for (let input of inputs) {
        if (opened)
          return;

        const server = JQuery(input).val();
        const type = JQuery(input).attr('name');

        if (!server || !type)
          continue;

        const [host, port] = server.split(':');
        if (!host || !port)
          continue;

        opened = true;
        const loading = this.render.createLoading(parent);
        el.html(this.i18n._.general.connecting);
        el.addClass('active');

        try {
          await this.exchange.connect(host, parseInt(port), type);
          this.render.removeExchangeAccountType(this.exchange.body());
        } catch (e) {
          parent.find('.error').html(e.message || e);
        }

        loading.remove();
        el.removeClass('active');
        el.html(this.i18n._.general.connect);
      }
    }, 500);
  }
}

/**
 * Constant
 */
Events.EVENTS = {
  CLICK: "click",
  CLICKKEYUP: "click keyup",
  DRAGDROP: "dragover dragleave dragenter drop",
  FOCUS: "focus",
  CHANGE: "change paste",
  FOCUSBLUR: "focus blur",
  KEYPRESS: "keypress",
  KEYUP: "keyup",
  KEYDNCHANGE: "keydown change paste",
  KEYUPCHANGE: "keyup change paste",
  MOUSE: "mouseenter mouseleave focus blur"
}

/**
 * Expose
 */
module.exports = Events;