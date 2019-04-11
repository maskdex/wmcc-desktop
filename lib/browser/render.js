/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

const OS = require('os');
//--
//const {UTILS, VENDOR} = require('../');
//--
const {wmcc, utils} = require('wmcc-core');
//--
const {
  Zlib
} = require('../utils');
const {
  JQuery
} = require('../vendor');
const {
  Amount
} = wmcc;
const {
  util
} = utils;

class Render {
  constructor(i18n) {
    this.i18n = i18n;
  }

  body(isAuth) {
    const logo = `<logo><img src='../image/head_logo.png'></logo>`;
    const authMenu = `<menu><tabs category='menu' module='auth' tag='tabs' active='true'></tabs></menu>`;
    const topMenu = `<menu><topmenu category='menu' module='top' tag='topmenu' active='true'></topmenu></menu>`;
    const content = `<content></content><preload category='preload' module='preload' tag='preload' active='true'></preload>`;
    const updater = `<updater category='update' module='update' tag='updater' active='true'></updater>`;
    const notification = `<notification category='notification' module='main' tag='notification' active='true'></notification>`;
    const copyright = `<copyright>WMCC Application &copy; World Mobile Coin</copyright>`;

    const html = [];
    if (isAuth)
      html.push(topMenu, content, updater, notification);
    else
      html.push(logo, authMenu, content, copyright);

    JQuery('body').html(html.join(''));
  }

  paging(total, offset, limit, cls) {
    const prev = offset - limit;
    const next = offset + limit;
    const current = parseInt(offset/limit+1);
    const max = Math.ceil(total/limit);
    const {start, end} = median(current, max, 10);

    const html = [
      `<div class="page"><a ${(offset === 0) ? 'class="disable"' : 'class="'+cls+'" offset="'+prev+'" limit="'+limit+'"'}>&#9668;</a>`,
      `<a ${(next+1 > total) ? 'class="disable"' : 'class="'+cls+'" offset="'+next+'" limit="'+limit+'"'}>&#9658;</a></div>`
    ];

    for(let i=start; i<end; i++)
      html.splice(-1, 0, `<a ${(current === i+1) ? 'class="active"' : 'class="'+cls+'" offset="'+(limit*i)+'" limit="'+limit+'"'}>${i+1}</a>`);

    return html.join('');
  }

  walletLogin(auth, walletdb, info) {
    const logged = info.getWallet() ? info.getAccountID() : null;
    const wallets = walletdb.list();
    const names = [];

    if (wallets.length > 0) {
      for (let wallet of wallets) {
        const name = wallet.split('.').shift();
        try {
          const wid = auth.fromSuffix(name);
          if (wid === logged) continue;
          names.push(wid);
        } catch (e) {
          ;
        }
      }
      names.sort();
      for (let name of names) {
          JQuery(`select[name="name"]`).append(`<option value="${name}">${name}</option>`);
          auth.addWallet(name);
      }
    }

    if (auth.walletCount() > 0)
      return JQuery(`menubutton[category="auth"][module="login"]`).trigger('click');;

    JQuery(`menubutton[category="auth"][module="create"]`).trigger('click');
  }

  walletExists(el, name) {
    const error = this.i18n._.credential.err_wallet_name_exists;
    const html = [
      `<span><b style="font-size: 14px;">`,
      `${this.i18n.format(error.text_1, name)}`,
      `</b><br>${error.text_2}</span>`,
      `<a class="button" cancel>${this.i18n._.general.cancel}</a>`
    ];

    const opt = {
      transformZ: true,
      title: error.title
    };

    const modalbox = this.modalBox(el, html.join(''), opt);
    this.removeModalbox(modalbox);
  }

  walletOverwrite(el, file, outpath, suffix, wid) {
    const html = [
      `<span>${this.i18n.format(this.i18n._.wallet.wallet_exists_want_to_overwrite, wid)}`,
      `<label>${this.i18n._.wallet.wallet_exists_warning}</label>`,
      `</span><a class="button" overwrite>${this.i18n._.general.overwrite}</a>`,
      `<a class="button" cancel>${this.i18n._.general.cancel}</a>`
    ];

    const opt = {
      transformZ: true,
      title: this.i18n._.general.wallet_exists
    };

    const modalbox = this.modalBox(el, html.join(''), opt);
    const cb = (evt, ...args) => {
      if (evt.target.hasAttribute('overwrite'))
        this.zipPassword(...args);
    }

    this.removeModalbox(modalbox, cb, el, file, outpath, suffix, wid);
  }

  walletInfo(details) {
    return [
      `<holder><i class="glyph-icon flaticon-wallets"></i><span>${details.id} <a>${this.i18n._.general.wallet_name}</a></span></holder>`,
      `<holder><i class="glyph-icon flaticon-id"></i><span>${details.wid} <a>${this.i18n._.general.wallet_id}</a></span></holder>`,
      `<holder><i class="glyph-icon flaticon-account"></i><span>${details.account.name} <a>${this.i18n._.general.account_name}</a></span></holder>`,
      `<holder><i class="glyph-icon flaticon-account-lock"></i><span>${details.account.type.toUpperCase()} <a>${this.i18n._.general.account_type}</a></span></holder>`,
      `<holder><i class="glyph-icon flaticon-swap"></i><span>${details.state.tx} <a>${this.i18n._.general.num_of_txs}</a></span></holder>`,
      `<holder><i class="glyph-icon flaticon-network"></i><span>${details.network.toUpperCase()} <a>${this.i18n._.general.network}</a></span></holder>`
    ].join('');
  }

  walletDetails(details) {
    const key = details.account.accountKey;
    return [
      `<table><tr><td>${this.i18n._.general.wallet_name}</td><td colspan="2">${details.id}</td></tr>`,
      `<tr><td>${this.i18n._.general.wallet_id}</td><td colspan="2">${details.wid}</td></tr>`,
      `<tr><td>${this.i18n._.general.wallet_key}</td><td>${details.chksum.toString('hex')}★★★★★</td>`,
      `<td><i class="glyph-icon flaticon-copy" title="${this.i18n._.general.copy}"></i></td></tr>`,
      `<tr><td>${this.i18n._.general.token}</td><td title="${details.token}">${details.token.slice(0, 32)}...</td>`,
      `<td><i class="glyph-icon flaticon-copy" value="${details.token}" title="${this.i18n._.general.copy}"></i></td></tr>`,
      `<tr><td>${this.i18n._.general.account_name}</td><td colspan="2">${details.account.name}</td></tr>`,
      `<tr><td>${this.i18n._.general.account_pubkey}</td><td title="${key}">${key.slice(0, 32)}...</td>`,
      `<td><i class="glyph-icon flaticon-copy" value="${key}" title="${this.i18n._.general.copy}"></i></td></tr>`,
      `<tr><td>${this.i18n._.general.account_type}</td><td colspan="2">${details.account.type.toUpperCase()}</td></tr>`,
      `<tr><td>${this.i18n._.general.num_of_txs}</td><td colspan="2">${details.state.tx}</td></tr>`,
      `<tr><td>${this.i18n._.general.num_of_coins}</td><td colspan="2">${details.state.coin}</td></tr>`,
      `<tr><td>${this.i18n._.general.confirm_balance}</td><td colspan="2">${Amount.wmcc(details.state.confirmed, true)} wmcc</td></tr>`,
      `<tr><td>${this.i18n._.general.unconfirm_balance}</td><td colspan="2">${Amount.wmcc(details.state.unconfirmed, true)} wmcc</td></tr>`,
      `<tr><td>${this.i18n._.general.network}</td><td colspan="2">${details.network.toUpperCase()}</td></tr>`,
      `<tr><td>${this.i18n._.general.watch_only}</td><td colspan="2">${details.watchOnly.toString().toUpperCase()}</td></tr></table>`
    ].join('');
  }

  txHistoryNotFound(id, name) {
    return `<h2>${this.i18n.format(this.i18n._.transaction.no_tx_in_wallet, `<span>${id}</span>`, `<span>${name}</span>`)}</h2>`;
  }

  createTxHistoryTable(pending) {
    return [
      `<table><tr><th>${this.i18n._.general.date_time}</th><th>${this.i18n._.general.status}</th><th>${this.i18n._.general.height}</th>`,
      `<th>${this.i18n._.general.tx_hash}</th><th>${this.i18n._.general.value}</th>${pending?'<th></th>':''}</tr>`,
      `</table>`
    ];
  }

  appendTxHistoryTable(table, tx, date, status, amount, rebroadcast) {
    rebroadcast = rebroadcast ? '<td><submit class="table_button s_tx_rebroadcast">Rebroadcast</submit></td>':'';
    const html = [
      `<tr><td>${date}</td><td>${status}</td>`,
      `<td class='txid' title="${util.revHex(tx.hash)}"><a class='r_goto_explorer'>${util.revHex(tx.hash)}</a></td><td>${amount}</td>${rebroadcast}</tr>`
    ];

    if (tx.block)
      html.splice(1, 0, `<td title="${util.revHex(tx.block)}"><a class='r_goto_explorer'>${tx.height}</a></td>`);
    else
      html.splice(1, 0, `<td>N/A</td>`);

    /*return */table.splice(-1, 0, html.join(''));
  }

  addressSummary(address, hash160, balance, received, length) {
    const qr = this.createQR(address);

    return [
      `<table class="summary address"><tr><th colspan="5">Summary</th></tr>`,
      `<tr><td>${this.i18n._.general.num_of_txs}</td><td><span>${length}</span></td><td></td>`,
      `<td>${this.i18n._.general.total_received}</td><td><span>${Amount.wmcc(received, true)} wmcc</span></td></tr>`,
      `<tr><td>${this.i18n._.general.addr_hash_160}</td><td><span>${hash160}</span>`,
      `<i class="glyph-icon flaticon-copy prev" title="${this.i18n._.general.copy}"></i></td><td></td>`,
      `<td>${this.i18n._.general.final_balance}</td><td><span>${Amount.wmcc(balance, true)} wmcc</span></td></tr>`,
      `</table><img src="${qr}"/>`
    ].join('');
  }

  addressBook(address, hash160, balance, received, length) {
    const qr = this.createQR(address);
    const link = length ? `<i class="glyph-icon flaticon-record r_goto_explorer" value=${address} title="${this.i18n._.general.view_txs}"></i>` : '';
    const txts = this.i18n._.address.your_wmcc_addr;

    return [
      `<div class="address"><img src="${qr}"/><h2>${txts.title}</h2><table>`,
      `<tr><td>${this.i18n._.general.num_of_txs}</td><td><span>${length}${link}</span></td></tr>`,
      `<tr><td>${this.i18n._.general.total_received}</td><td><span>${Amount.wmcc(received, true)} wmcc</span></td></tr>`,
      `<tr><td>${this.i18n._.general.addr_hash_160}</td><td><span class='address'>${hash160}</span></td></tr>`,
      `<tr><td>${this.i18n._.general.final_balance}</td><td><span>${Amount.wmcc(balance, true)} wmcc</span></td></tr>`,
      `</table>`,
      `<p><a>${txts.text_1}</a><a class="address">${address}</a>`,
      `<a>${txts.text_2}</a>`,
      `<submit class="button r_general_goto_addrs">${this.i18n._.general.back}</submit></p></div>`
    ].join('');
  }

  addressBookInvalidFormat(address) {
    const txts = this.i18n._.address.invalid_format;
    return [
      `<div class="error"><h2>${txts.title}</h2><span>`,
      `${this.i18n.format(txts.text_1, `<a>${address}</a>`)}<br>${txts.text_2}</span>`,
      `<submit class="button r_general_goto_addrs">${this.i18n._.general.back}</submit></div>`
    ].join('');
  }

  addressBookNotFound(address, id) {
    const txts = this.i18n._.address.not_found;
    return [
      `<div class="error"><h2>${txts.title}</h2><span>`,
      `${this.i18n.format(txts.text, `<a>${address}</a>`)} (<a>${id}</a>).</span>`,
      `<submit class="button r_general_goto_addrs">${this.i18n._.general.back}</submit></div>`
    ].join('');
  }

  addressTxNotFound(address) {
    return `<div class='empty'>${this.i18n.format(this.i18n._.address.no_tx_found_for_addr, `<a>${address}</a>`)}</div>`;
  }

  createAddressTable() {
    return [
      `<table><tr><th>${this.i18n._.general.type}</th>`,
      `<th>${this.i18n._.general.address}</th>`,
      `<th>${this.i18n._.general.hash_160}</th><th></th></tr>`,
      `</table>`
    ];
  }

  appendAddressList(table, hash, address) {
    const html = [
      `<tr><td>${address.getType()}</td><td><a class='r_general_goto_addr' title='${address}'>${address}</a></td>`,
      `<td><a class="label" title='${hash}'>${hash}</a></td>`,
      `<td><i class="glyph-icon flaticon-copy" value="${address}" title="${this.i18n._.general.copy_to_clipboard}"></i>`,
      `<i class="glyph-icon flaticon-gear r_wallet_manage_address" title="${this.i18n._.general.manage_address}"></i></td></tr>`
    ];

    table.splice(-1, 0, html.join(''));
  }

  createQR(string) {
    const code = JQuery('<div id="qrcode"></div>').qrcode(string);
    return code[0].childNodes[0].toDataURL("image/png");
  }

  createLatestBlockTable() {
    return [
      `<h1>${this.i18n._.general.latest_blocks}</h1><table class='home'>`,
      `<tr><th>${this.i18n._.general.height}</th><th>${this.i18n._.general.age}</th><th>${this.i18n._.general.transactions}</th>`,
      `<th>${this.i18n._.general.total_output} (wmcc)</th><th>${this.i18n._.general.size} (kb)</th>`,
      `<th>${this.i18n._.general.weight} (kwu)</th></tr>`,
      `</table>`
    ];
  }

  appendLatestBlock(table, entry, block) {
    const {txs} = block;
    let total = 0;
    for (let tx of txs) {
      for (let output of tx.outputs) {
        total+=output.value;
      }
    }

    const html = [
      `<tr><td class='block r_goto_explorer'>${entry.height}</td>`,
      `<td class='timeAge' value='${entry.time}' k='2'>${age(entry.time)}</td>`,
      `<td>${block.txs.length}</td>`,
      `<td>${Amount.wmcc(total)}</td>`,
      `<td>${block.getVirtualSize()/1000}</td>`,
      `<td>${block.getWeight()/1000}</td></tr>`
    ];

    table.splice(-1, 0, html.join(''));
  }

  createLatestTxTable() {
    return [
      `<h1>${this.i18n._.general.latest_txs}</h1>`,
      `<table class='home'><tr><th>${this.i18n._.general.tx_hash}</th>`,
      `<th>${this.i18n._.general.size} (bytes)</th><th>${this.i18n._.general.value} (wmcc)</th></tr>`,
      `</table>`
    ];
  }

  latestTxNotFound() {
    return [
      `<h1>${this.i18n._.general.latest_txs}</h1>`,
      `<h2 class="empty">${this.i18n._.general.no_latest_txn_found}</h2>`
    ].join('');
  }

  appendLatestTx(table, item, hash) {
    const html = [
      `<tr><td class='tx r_goto_explorer'>${hash}</td>`,
      `<td>${item.size}</td>`,
      `<td>${Amount.wmcc(item.value, true)}</td></tr>`
    ];

    table.splice(-1, 0, html.join(''));
  }

  blockTable(details) {
    let next;
    if (details.nextHash)
      next = `<span class="block r_goto_explorer">${details.nextHash}</span>`;
    else
      next = `<span>${details.nextHash}</span>`;

    return [
      `<table class="summary"><tr><th colspan="5">${this.i18n._.general.summary}</th></tr>`,
      `<tr><td style="position: absolute;">${this.i18n._.general.num_of_txs}</td><td>${details.txLen}</td>`,
      `<td></td><td>${this.i18n._.general.timestamp}</td><td>${details.ts}</td></tr>`,
      `<tr><td>${this.i18n._.general.height}</td><td>${details.height}</td><td></td>`,
      `<td>${this.i18n._.general.total_output}</td><td>${details.total} wmcc</td></tr>`,
      `<tr><td>${this.i18n._.general.confirmations}</td><td>${details.confirm}</td><td></td>`,
      `<td style="position: absolute;">${this.i18n._.general.tx_fee}</td><td>${details.fee}</td></tr>`,
      `<tr><td>${this.i18n._.general.version}</td><td>${details.version}</td><td></td>`,
      `<td>${this.i18n._.general.block_hash}</td><td><span>${details.hash}</span>`,
      `<i class="glyph-icon flaticon-copy prev" title="${this.i18n._.general.copy}"></i></td></tr>`,
      `<tr><td>${this.i18n._.general.difficulty}</td><td>${toDifficulty(details.bits)}</td><td></td>`,
      `<td>${this.i18n._.general.previous_block}</td><td><span class="block r_goto_explorer">${details.prevHash}</span>`,
      `<i class="glyph-icon flaticon-copy prev" title="${this.i18n._.general.copy}"></i></td></tr>`,
      `<tr><td>${this.i18n._.general.bits}</td><td>${details.bits}</td><td></td>`,
      `<td>${this.i18n._.general.next_block}</td><td>${next}`,
      `<i class="glyph-icon flaticon-copy prev" title="${this.i18n._.general.copy}"></i></td></tr>`,
      `<tr><td>${this.i18n._.general.nonce}</td><td>${details.nonce}</td><td></td>`,
      `<td>${this.i18n._.general.merkle_root}</td><td><span>${details.merkleRoot}</span>`,
      `<i class="glyph-icon flaticon-copy prev" title="${this.i18n._.general.copy}"></i></td></tr>`,
      `<tr><td>${this.i18n._.general.size}</td><td>${details.size}</td><td></td>`,
      `<td>${this.i18n._.general.chainwork}</td><td><span>${details.chainWork}</span>`,
      `<i class="glyph-icon flaticon-copy prev" title="${this.i18n._.general.copy}"></i></td></tr>`,
      `<tr><td>${this.i18n._.general.weight}</td><td>${details.weight}</td><td></td><td colspan="2"></td></tr></table>`
    ];
  }

  createTxsTable(txid, date, unconfirmed) {
    const confirm = (unconfirmed) ? ` red' title='${this.i18n._.general.unconfirm_tx}`: '';
    return [
      `<table class="transaction"><colgroup><col/><col/><col/></colgroup>`,
      `<tr><th colspan="2"><a class='tx r_goto_explorer${confirm}'>${txid}</a>`,
      `<i class="glyph-icon flaticon-copy" value=${txid} title="${this.i18n._.general.copy}"></i></th>`,
      `<th>${date}</th></tr><tr><td>`
    ];
  }

  appendTxBody(table, details, address) {
    let style = 'in green';

    if (!Object.keys(details.input).length) {
      table.push(`<div><span class='coinbase'>${this.i18n._.transaction.newly_generated_coins}</span></div>`);
    } else {
      for (let input in details.input) {
        if (input === address)
          table.push(`<div><span>${input}</span>`), style = 'out red';
        else if (details.pending.includes(input))
          table.push(`<div><i class="glyph-icon flaticon-copy next" title="Copy"></i>`),
          table.push(`<span class='red address r_goto_explorer' title='${this.i18n._.transaction.output_from_unconfirmed_tx}'>${input}</span>`);
        else
          table.push(`<div><i class="glyph-icon flaticon-copy next" title="${this.i18n._.general.copy}">`),
          table.push(`</i><span class='address r_goto_explorer'>${input}</span>`);

        table.push(`<span class='value'>${Amount.wmcc(details.input[input], true)} wmcc</span></div>`);
      }
    }

    table.push(`</td><td><i class="glyph-icon flaticon-${style}"></i></td><td>`);

    for (let output in details.output) {
      table.push(`<div>`);
      if (output === 'unknown')
        table.push(`<a class='unparsed'>${this.i18n._.transaction.unparsed_output_address}</a>`);
      else if (output === address)
        table.push(`<div><i class="glyph-icon flaticon-copy next" title="${this.i18n._.general.copy}"></i><span>${output}</span>`);
      else
        table.push(`<i class="glyph-icon flaticon-copy next" title="${this.i18n._.general.copy}"></i>`),
        table.push(`<span class='address r_goto_explorer'>${output}</span>`);

      table.push(`<span class='value'>${Amount.wmcc(details.output[output], true)} wmcc</span></div>`);
    }
  }

  appendTxFooter(table, tx, tin, tout) {
    if (!tx)
      return table.push(`</td></tr></table>`);

    let misc;
    if (tx.isCoinbase())
      misc = `(${this.i18n._.general.size}: ${tx.getVirtualSize()} bytes)`;
    else
      misc = `(${this.i18n._.general.fee}: ${Amount.wmcc((tin-tout), true)} wmcc, Size: ${tx.getVirtualSize()} bytes)`;

    table.push(`</td></tr><tr><td colspan='2'>${misc}</td><td>${Amount.wmcc(tout, true)} wmcc</td></tr></table>`);
  }

  txSummary(details) {
    const cls = details.height < 0 ? '': " class='block r_goto_explorer'";
    const confirm = details.confirm ? details.confirm: this.i18n._.general.unconfirm_tx;

    return [
      `<table class="summary"><tr><th colspan="5">${this.i18n._.general.summary}</th></tr>`,
      `<tr><td>${this.i18n._.general.size}</td><td><span>${details.size} bytes</span></td><td></td>`,
      `<td>${this.i18n._.general.total_input}</td><td><span>${details.totalinput} wmcc</span></td></tr>`,
      `<tr><td>${this.i18n._.general.weight}</td><td><span>${details.weight} bytes</span></td><td></td>`,
      `<td>${this.i18n._.general.total_output}</td><td><span>${details.totaloutput} wmcc</span></td></tr>`,
      `<tr><td>${this.i18n._.general.received_time}</td><td><span>${details.date}</span></td><td></td>`,
      `<td>${this.i18n._.general.fee}</td><td><span>${details.fee} wmcc</span></td></tr>`,
      `<tr><td>${this.i18n._.general.included_in_block}</td><td><span${cls} title='${details.blktitle}'>${details.blkheight}</span></td><td></td>`,
      `<td>${this.i18n._.general.fee_per_kb}</td><td><span>${details.rate} wmcc/kb</span></td></tr>`,
      `<tr><td>${this.i18n._.general.confirmations}</td><td><span>${confirm}</span></td><td></td>`,
      `<td>${this.i18n._.general.fee_per_kwu}</td><td><span>${details.wrate} wmcc/kwu</span></td></tr></table>`
    ].join('');
  }

  createTxTable(txid) {
    return [
      `<table class="transaction"><colgroup><col/><col/><col/></colgroup>`,
      `<tr><th colspan="3"><a>${txid}</a>`,
      `<i class="glyph-icon flaticon-copy" value=${txid} title="${this.i18n._.general.copy}"></i></th></tr><tr><td>`
    ];
  }

  createScriptBody(type) {
    const body = [`<div class="scripts">`];

    if (type === 'coinbase')
      body.push(`<h2>${this.i18n._.general.coinbase}</h2>`);
    else
      body.push(`<h2>${this.i18n._.general.input_scripts}</h2>`);

    body.push(`</div>`);

    return body;
  }

  appendScriptOutputTitle(body) {
    body.splice(-1, 0, `</div><div class="scripts"><h2>${this.i18n._.general.output_scripts}</h2>`);
  }

  appendScriptInput(body, type, script) {
    if (!type)
      type = this.i18n._.general.commitment_hash;

    body.splice(-1, 0, `<h3>${type}</h3>`);
    body.splice(-1, 0, `<p>${script}</p>`);
  }

  appendScriptOutput(body, type, script) {
    if (!type)
      type = this.i18n._.general.commitment_hash;

    body.splice(-1, 0, `<h3>${type}</h3>`);
    body.splice(-1, 0, `<span>${script}</span>`);
  }

  zipPassword(el, file, outpath, suffix, wid) {
    const html = [
      `<span>${this.i18n._.wallet.enter_password_if_set}<input type="password" /></span>`,
      `<a class="button" next>${this.i18n._.general.next}</a>`
    ];

    const opt = {
      transformZ: true,
      title: this.i18n._.wallet.wallet_bak_password,
      type: 'confirm'
    };

    const modalbox = this.modalBox(el, html.join(''), opt);

    JQuery('modalbox a, modalbox i').unbind('click').on('click', async (elem) => {
      JQuery('modalbox').css('-webkit-transform', '');
      JQuery('modalbox').remove();

      if (!elem.target.hasAttribute('next'))
        return;

      const password = JQuery(elem.target).prev().find('input').eq(0).val();
      const options = {
        input: file,
        output: outpath,
        password: password
      }

      const zlib = new Zlib(options);
      const error = await zlib.decompress();

      if (error) {
        const html = `<span>${err.message}</span><a class="button">${this.i18n._.general.try_again}</a>`;
        const modalbox = this.modalBox(el, html, {transformZ: true, title: err.type});
        this.removeModalbox(modalbox);
        return;
      }

      const html = [
        `<span>${this.i18n.format(this.i18n._.wallet.wallet_successfully_restored, `<a>${wid}</a>`)}</span>`,
        `<a class="button" cancel>${this.i18n._.general.ok}</a>`
      ];
      const modalbox = this.modalBox(el, html.join(''), {transformZ: true, title: this.i18n._.general.wallet_restored, type: 'confirm'});
      this.removeModalbox(modalbox);
    });
  }

  invalidWalletBackup(el, file) {
    const html = [
      `<span>${this.i18n._.wallet.err_invalid_bak_file}</span>`,
      `<a class="button">${this.i18n._.general.try_again}</a>`
    ];

    const opt = {
      transformZ: true,
      title: this.i18n._.general.invalid_file
    };

    const modalbox = this.modalBox(el, html.join(''), opt);
    this.removeModalbox(modalbox);
  }

  fileSaved(el, path) {
    this.render(el, 'span', this.i18n._.general.file_saved_to, `<a title="${path}">"${path}"</a>`);
  }

  fullModal() {
    JQuery('body').prepend('<div id="fullmodal" style="height:100%;width:100%;background:rgba(0,0,0,0.3);position:absolute;z-index:1;"></div>');
  }

  renderHint(count, question) {
    const html = [
      `<holder><i class="glyph-icon flaticon-hint"><counter>${count}</counter></i>`,
      `<input type="text" name="question" value="${question}" disabled></holder>`,
      `<holder><i class="glyph-icon flaticon-answer"><counter>${count}</counter></i>`,
      `<input type="password" name="answer" placeholder="${this.i18n._.general.your_answer}"></holder>`
    ];

    JQuery('render').html(html.join(''));
  }

  renderOtp(el, otp, cb, loading) {
    const html = [
      `<span><a>${this.i18n._.otp.click_to_copy.join('<br>')}</a><br>`,
      `<b>${otp}</b><i class="glyph-icon flaticon-copy" title="${this.i18n._.general.copy_to_clipboard}" value="${otp}"></i><br>`,
      `<note>${this.i18n._.otp.note}</note><br><a class="button s_press_enter">${this.i18n._.general.close}</a></span>`
    ];

    const opt = {
      transformZ: true,
      title: this.i18n._.otp.title,
      type: 'confirm'
    };

    const modalbox = this.modalBox(el, html.join(''), opt);
    const childs = JQuery(modalbox).find("modalbox").find("i, a.button");
    JQuery(modalbox).children().addClass('otp');

    childs.each((idx, child)=>{
      JQuery(child).unbind('click').on('click', async () => {
        const loading = this.createLoading(el.parent());
        await cb();
        loading.remove();
        JQuery('body').find('#fullmodal').remove();
      });
    });
  }

  newOtp(el, otp, cls, extra) {
    const text = [this.i18n.format(this.i18n._.otp.new_otp, otp)];
    const clses = [
      ['glyph-icon', 'flaticon-copy'],
      ['glyph-icon', 'flaticon-continue', 's_press_enter']
    ];

    if (cls)
      for (let clss of clses) clss.push(cls);

    if (extra)
      text.unshift(extra);

    const html = [
      `<span>${text.join(' ')}`,
      `<i class="${clses[0].join(' ')}" value="${otp}" title="${this.i18n._.general.copy_to_clipboard}"></i>`,
      `</span>`
    ];

    if (cls)
      html.splice(-1, 0, `<i class="${clses[1].join(' ')}" value="${otp}" title="${this.i18n._.general.continue_without_copy}"></i>`);

    el.html(html.join(''));
  }

  invalidOtp(el, auth) {
    this.renderError(el, this.i18n._.otp.err_invalid, auth.otp.retry, auth.otp.maxtry);
  }

  invalidWalletName(el) {
    const html = [
      `<span>${this.i18n._.wallet.err_invalid_wallet_name.join('<br>')}</span>`,
      `<a class="button">${this.i18n._.general.try_again}</a>`
    ];
    const modalbox = this.modalBox(el, html.join(''), {transformZ: true, title: this.i18n._.general.invalid_wallet_name});
    this.removeModalbox(modalbox);
  }

  invalidAmount(el) {
    const html = `<span>${this.i18n._.general.too_many_decimal_point}</span><a class="button">${this.i18n._.general.try_again}</a>`;
    const modalbox = this.modalBox(el, html, {transformZ: true, title: this.i18n._.general.invalid_amount});
    this.removeModalbox(modalbox);
  }

  txConfirmation(details, auth, wallet, tx) {
    const table = [
      `<table><tr><th colspan="2">${this.i18n._.transaction.summary}</th></tr>`,
      `<tr><td>${this.i18n._.transaction.id}</td><td long title="${details.id}"><a>: ${details.id}</a></td></tr>`,
      `<tr><td>${this.i18n._.transaction.inputs_count}</td><td>: ${details.tin_len}</td></tr>`,
      `<tr><td>${this.i18n._.transaction.outputs_count}</td><td>: ${details.tout_len}</td></tr>`,
      `<tr><td>${this.i18n._.transaction.amount}</td><td>: ${details.tout_val} wmcc</td></tr>`,
      `<tr><td>${this.i18n._.transaction.fee}</td><td>: ${details.fee} wmcc</td></tr>`,
      `<tr><td>${this.i18n._.transaction.rate}</td><td>: ${details.rate} wmcc/kb</td></tr>`,
      `<tr><td>${this.i18n._.transaction.net_amount}</td><td>: ${details.total} wmcc</td></tr></table>`
    ];

    const html = [
      `<span class="tx-details">${table.join('')}<i class="glyph-icon flaticon-otp"></i>`,
      `<input type="text" name="otp" class="r_fixed_number" maxlength="6" placeholder="${this.i18n._.otp.title}">`,
      `<result></result><a class="button" confirm>${this.i18n._.general.confirm}</a></span>`
    ];

    const opt = {
      transformZ: true,
      title: this.i18n._.transaction.confirmation,
      type: 'confirm'
    };

    const modalbox = this.modalBox('leftcontain', html.join(''), opt);

    JQuery('i.flaticon-remove').unbind('click').on('click', () => {
      JQuery(modalbox).css('-webkit-transform', '');
      JQuery('modalbox').remove();
    });

    JQuery('a[confirm]').unbind('click').on('click', async (el) => {
      const target = JQuery(el.target);
      const result = target.prev();

      const potp = target.prev().prev().val();
      if (!potp)
        this.renderError(el, this.i18n._.otp.err_required);

      const passphrase = auth.getPassphrase(potp);
      if (!passphrase)
        return this.invalidOtp(el, auth);

      target.remove();

      await wallet.db.addTX(tx);
      wallet.logger.debug(this.i18n._.transaction.sending, wallet.id, tx.txid());
      await wallet.db.send(tx);

      const {otp} = auth.getPassphrase(potp, true);
      this.newOtp(result, otp, 's_send_coin_reset', this.i18n._.transaction.sent);
    });
  }

  txError(error){
    const opt = {
      transformZ: true,
      title: error.type || 'TransactionError'
    };

    const html = `<span>${error.message}</span><a class="button" cancel>${this.i18n._.general.try_again}</a>`;
    const modalbox = this.modalBox('leftcontain', html, opt);
    this.removeModalbox(modalbox);
  }

  txRequest(el) {
    const html = [
      `<span>${this.i18n._.general.payment_request_na}</span>`,
      `<a class="button" cancel>${this.i18n._.general.close}</a>`
    ];

    const opt = {
      transformZ: true,
      title: this.i18n._.general.not_available
    };

    const modalbox = this.modalBox(el, html.join(''), opt);
    this.removeModalbox(modalbox);
  }

  txOutputTable(el) {
    const html = [
      '<p></p><table><tr>',
      `<th>${this.i18n._.general.recipient_address}</th>`,
      `<th>${this.i18n._.general.value}</th>`,
      `<th title="${this.i18n._.general.delete}">${this.i18n._.general.delete_2}</th>`,
      '</tr></table><p></p>'
    ];

    el.after(html.join(''));

    const table = el.parent().find('table');
    table.addClass('outputs');
    return table;
  }

  txOutputData(data) {
    return [
      `<tr><td title="${this.i18n._.general.address}: ${data.addr}">${data.addr}</td>`,
      `<td title="${this.i18n._.general.value}: ${data.val}">${data.val}</td>`,
      `<td><i class="glyph-icon flaticon-remove r_tx_address_delete"></i></td></tr>`
    ].join('');
  }

  updateInformation(major, minor, patch) {
    const body = [`<h2>${this.i18n._.general.major_update}</h2><table>`];

    for (let item of major)
      this.appendUpdateInfo(body, item);

    body.push(`</table><h2>${this.i18n._.general.minor_update}</h2><table>`);
    for (let item of minor)
      this.appendUpdateInfo(body, item);

    body.push(`</table><h2>${this.i18n._.general.patch}</h2><table>`);
    for (let item of patch)
      this.appendUpdateInfo(body, item);

    body.push(`</table>`);
    return body.join('');
  }

  appendUpdateInfo(body, item) {
    body.push(`<tr><th>${this.i18n._.general.version} ${item.version}</th></tr>`);
    for (let info of item.info)
      body.push(`<tr><td>${info}</td></tr>`);
  }

  modalBox(el, html, options = {}) {
    const dialogs = [
      `<modalbox><div><span${(options.type ? ' class="'+options.type+'"':'')}>`,
      `${(options.title ? options.title:'')}</span>`,
      `<i class="glyph-icon flaticon-remove"></i>`,
      `</div><div>${html}</div></modalbox>`
    ];

    const modalbox = JQuery(el).prepend(dialogs.join(''));

    if (options.transformZ)
      JQuery(el).css('-webkit-transform', 'translateZ(0)');

    return modalbox;
  }

  clientInformation() {
    const appInfo = require('../../package.json');
    const coreInfo = require('../../node_modules/wmcc-core/package.json');

    return [
      `<h2>${this.i18n._.general.app_info}</h2><table>`,
      `<tr><td>${this.i18n._.general.client_name}</td><td>${appInfo.name}</td></tr>`,
      `<tr><td>${this.i18n._.general.client_version}</td><td>${appInfo.version}</td></tr>`,
      `<tr><td>${this.i18n._.general.operating_system}</td><td>${OS.type()} ${OS.release()} ${OS.arch()}</td></tr>`,
      `<tr><td>${this.i18n._.general.release_date}</td><td>${appInfo.release}</td></tr></table>`,
      `<h2>${this.i18n._.general.core_info}</h2><table>`,
      `<tr><td>${this.i18n._.general.client_name}</td><td>${coreInfo.name}</td></tr>`,
      `<tr><td>${this.i18n._.general.client_version}</td><td>${coreInfo.version}</td></tr>`,
      `<tr><td>${this.i18n._.general.release_date}</td><td>${coreInfo.release}</td></tr></table>`
    ].join('');
  }

  serverInformation(info, date, last, dataDir) {
    return [
      `<h2>${this.i18n._.general.general}</h2><table>`,
      `<tr><td>${this.i18n._.general.version}</td><td>${info.version}</td></tr>`,
      `<tr><td>${this.i18n._.general.network}</td><td>${info.network}</td></tr>`,
      `<tr><td>${this.i18n._.general.data_dir}</td><td>${dataDir}</td></tr>`,
      `<tr><td>${this.i18n._.general.time}</td><td>${date}</td></tr>`,
      `<tr><td>${this.i18n._.general.uptime}</td><td>${age(info.time.uptime, true)}</td></tr>`,
      `</table><h2>${this.i18n._.general.network}</h2><table>`,
      `<tr><td>${this.i18n._.general.host}</td><td>${info.pool.host}</td></tr>`,
      `<tr><td>${this.i18n._.general.port}</td><td>${info.pool.port}</td></tr>`,
      `<tr><td>${this.i18n._.general.agent}</td><td>${info.pool.agent}</td></tr>`,
      `<tr><td>${this.i18n._.general.services}</td><td>${info.pool.services}</td></tr>`,
      `<tr><td>${this.i18n._.general.num_of_conns}</td>`,
      `<td>${this.i18n._.general.in}: ${info.pool.inbound} / ${this.i18n._.general.out}: ${info.pool.outbound}</td></tr>`,
      `</table><h2>${this.i18n._.general.block_chain}</h2><table>`,
      `<tr><td>${this.i18n._.general.current_height}</td><td>${info.chain.height}</td></tr>`,
      `<tr><td>${this.i18n._.general.last_block_time}</td><td>${last}</td></tr>`,
      `<tr><td>${this.i18n._.general.progress}</td><td>${(info.chain.progress*100).toFixed(2)} <a style='font-family:Ubuntu, sans-serif;'>%</a></td></tr>`,
      `</table><h2>${this.i18n._.general.mempool}</h2><table>`,
      `<tr><td>${this.i18n._.general.num_of_txs}</td><td>${info.mempool.tx}</td></tr>`,
      `<tr><td>${this.i18n._.general.memory_usage}</td><td>${info.mempool.size}</td></tr></table>`
    ].join('');
  }

  appendConfigHeader(body, cls) {
    body.push(`<h2>${cls}</h2>`);
  }

  getConfigCheckBox(checked, disabled, opt) {
    const html = [
      `<div class="checkbox${disabled}">`,
      `<input type="checkbox" id="checkbox-${opt}"${checked}${disabled} name="${opt}" />`,
      `<label class="checkbox-off" for="checkbox-${opt}"></label></div>`
    ];

    return html.join('');
  }

  getConfigInput(datatype, clses, value, disabled, opt) {
    return `<input type='text' class='${datatype}${clses}' value='${value}'${disabled} name="${opt}" />`;
  }

  appendConfigDefault(body, val, input, opt) {
    body.push(`<div>${opt} ${val ? ' (default: '+val+')': ''}${input}</div>`);
  }

  appendConfigSubmit(body) {
    body.push(`<p class='result'></p><submit class="button s_config_save">${this.i18n._.general.update}</submit>`);
  }

  stratumInformation(info, connected, active) {
    return [
      `<table><tr><td>${this.i18n._.general.data_dir}</td><td>${info.prefix}</td></tr>`,
      `<tr><td>${this.i18n._.general.public_host}</td><td>${info.publicHost}</td></tr>`,
      `<tr><td>${this.i18n._.general.public_port}</td><td>${info.publicPort}</td></tr>`,
      `<tr><td>${this.i18n._.general.max_inbound}</td><td>${info.maxInbound}</td></tr>`,
      `<tr><td>${this.i18n._.general.difficulty}</td><td>${info.difficulty}</td></tr>`,
      `<tr><td>${this.i18n._.general.last_active}</td><td>${active}</td></tr>`,
      `<tr><td>${this.i18n._.general.connected_workers}</td><td>${connected}</td></tr></table>`
    ].join('');
  }

  stratumUserNotFound() {
    return `<table><tr><th>${this.i18n._.general.no_worker_found}</th></tr></table>`;
  }

  stratumUser(userdb) {
    const table = [
      `<table class='workerlist'><tr><th>${this.i18n._.general.worker_name}</th>`,
      `<th>${this.i18n._.general.password}</th><th>${this.i18n._.general.remove_worker}</th></tr>`,
      `</table>`
    ];

    userdb.map.forEach((value, key) => {
      table.splice(-1, 0, `<tr><td>${key}</td><td>★★★★★</td>`);
      table.splice(-1, 0, `<td><i class="glyph-icon flaticon-remove s_stratum_remove_worker" title="${this.i18n._.general.remove_worker}"></i></td></tr>`);
    });

    return table.join('');
  }

  tooltip(el, text, options = {}) {
    const target = {};
    const opts = {};
    const p = el.prop('name');
    const tooltip = JQuery(`<tooltip>${text}</tooltip>`);

    JQuery(el).after(tooltip);

    let h = JQuery(el).offset().left;
    let v = JQuery(el).offset().top;

    if (options.position == 'right'){
      v = v - JQuery(el).outerHeight();
    } else if (options.position == 'top') {
      v = v - JQuery(el).outerHeight();
      h = h + JQuery(el).outerWidth() - JQuery(tooltip).outerWidth();
    } else {
      h = h + JQuery(el).outerWidth() + 10;
      v = v + JQuery(el).outerHeight()/2 - JQuery(tooltip).outerHeight()/2;
    }

    opts['left'] = h;
    opts['top'] = v;

    tooltip.css(opts);
    if(options.toggleAnimation)
      if(!target[p]) {
        target[p] = tooltip;
        target[p].show(0).delay(options.toggleAnimation*1000).hide(0, () => {
          delete target[p];
          JQuery(this).remove();
        });
      }
    else {
      JQuery(el).on('keyup paste change', () => {
        tooltip.remove();
      });
    }
  }

  testInput(inputs) {  
    const elements = [];

    JQuery(inputs).each((idx, el) => {
      if (!JQuery(el).val())
        elements.push(JQuery(el));
    });

    if (elements.length)
      return elements;

    return false;
  }

  /**
   * @param {Array|Object} jquery elements
   * @param {Boolean} class to remove/add
   * @param {Boolean} err
   */
  highlightInputs(elems, cls, err) {
    if (!Array.isArray(elems))
      elems = [elems];

    const type = err ? 'error': 'focus';

    for (let el of elems) {
      if (cls) {
        el.addClass(type);
        continue;
      }

      el.removeClass('error focus');
    }
  }

  createLoading(el) {
    const loading = JQuery(`<div class="loading"></div>`);

    loading.append(`<img src="../image/loader.gif" /><div class="wrapper"></div>`);

    el.append(loading);

    return loading;
  }

  waitForElement(selector, cb, ...args) {
    if (JQuery(selector).length) {
      cb(JQuery(selector), ...args);
    } else {
      setTimeout(() => {
        this.waitForElement(selector, cb, ...args);
      }, 1);
    }
  }

  static waitForElement(selector, cb) {
    return new Render().waitForElement(selector, cb);
  }

  render(el, tag, content, ...args) {
    if (args)
      content = this.i18n.format(content, ...args);

    const elem = JQuery(document.createElement(tag));
    el.html(elem.html(content));
  }

  renderError(el, error, ...args) {
    if (args)
      error = this.i18n.format(error, ...args);

    el.html(`<span class="error">${error}</span>`);
  }

  removeModalbox(modalbox, fn, ...args) {
    JQuery('modalbox a[cancel], modalbox a[overwrite], modalbox i').unbind('click').on('click', (evt) => {
      JQuery(modalbox).css('-webkit-transform', '');
      JQuery('modalbox').remove();

      if (fn)
        fn(evt, ...args);
    });
  }

  updateProgressBar(el) {
    const html = [
      `<table><tr><td><span class="loading"><span class="progress_holder"><span class="progress_bar"></span>`,
      `<span id="prog_status">${this.i18n._.general.downloading_update}: 0%</span></span></span></td></tr></table>`
    ];

    el.html(html.join(''));
  }

  updateUptodate(el) {
    el.html(`<h3>${this.i18n._.update.client_up_to_date}</h3>`);
  }

  updateAvailable(el, info) {
    const link = `https://github.com/WorldMobileCoin/wmcc-desktop/releases/tag/v${info.version}`;
    const html = [
      `<table><tr><td><div>${this.i18n.format(this.i18n._.update.update_link, info.version)}</div></td>`,
      `<td><submit>${this.i18n._.general.copy}</submit></td><td></td><td><submit>${this.i18n._.general.close}</submit></td></tr></table>`
    ];

    el.html(html.join(''));

    const submit = el.find('submit');

    submit.eq(0).on('click', () => {
      const temp = JQuery("<input style='top:-9999px;position:absolute;'>");
      JQuery("body").append(temp);

      temp.val(link).select();
      document.execCommand("copy");
      temp.remove();
    });

    submit.eq(1).on('click', () => {
      el.hide();
    });
  }

  updateDownloading(el, percent, rate) {
    const html = [
      `${this.i18n._.general.downloading_update}:`,
      percent,
      `|`,
      rate,
      `MB/SEC`
    ];

    el.html(html.join(' '));
  }

  updateDone(el, version) {
    const html = [
      `<table><tr><td><div>${this.i18n.format(this.i18n._.update.update_available, version)}</div></td>`,
      `<td><submit>${this.i18n._.general.restart_now}</submit></td><td></td><td><submit>${this.i18n._.general.later}</submit></td></tr></table>`
    ];

    el.html(html.join(''));

    return el.find('submit');
  }

  scanningBlock(height, hash) {
    return `<span class='scanning'>${this.i18n._.general.scanning_block} ${height}: <a>${hash}</a></span>`;
  }

  recentTx(type, date, value, hash) {
    return [
      `<holder><i class="glyph-icon flaticon-${type}"></i><span>`,
      `<label>${date}</label><label>${Amount.wmcc(value, true)} wmcc</label>`,
      `<a><label class='r_goto_explorer' value="${util.revHex(hash)}">${this.i18n._.general.show_details}</label></a></span></holder>`
    ].join('');
  }

  recentTxNotFound() {
    return `<holder><h2>${this.i18n._.transaction.no_recent_tx_found}</h2></holder>`;
  }

  latestTxs(txs) {
    const html = [
      `<table>`,
      `</table>`
    ];

    for (let tx of txs) {
      html.splice(1, 0, `<tr><td><a title='${util.revHex(tx[0])}' class='r_goto_explorer'>${util.revHex(tx[0])}<a></td>`);
      html.splice(2, 0, `<td>${Amount.wmcc(tx[1], true)}</td></tr>`);
    }

    return html.join('');
  }

  latestTxNotFound() {
    return `<h2>${this.i18n._.transaction.no_tx_in_mempool}</h2>`;
  }

  currentBlock(chain, entry, block) {
    return [
      `<table>`,
      `<tr><td>${this.i18n._.general.tip}</td><td colspan='3'><span title='${chain.tip.rhash()}'>${chain.tip.rhash()}</span></td></tr>`,
      `<tr><td>${this.i18n._.general.hash}</td><td colspan='3'><a title='${entry.rhash()}' class='r_goto_explorer'>${entry.rhash()}</a></td></tr>`,
      `<tr><td>${this.i18n._.general.height}</td><td>${chain.height}</td>`,
      `<td>${this.i18n._.general.age}</td><td class='timeAge' value='${entry.time}' k='1'>${age(entry.time)}</td></tr>`,
      `<tr><td>${this.i18n._.general.transactions_2}<a></td><td>${block.txs.length}</td>`,
      `<td>${this.i18n._.general.outputs}</td><td>${Amount.wmcc(block.getClaimed())} wmcc</td></tr>`,
      `<tr><td>${this.i18n._.general.size}</td><td>${block.getVirtualSize()/1000} kb</td>`,
      `<td>${this.i18n._.general.weight}</td><td>${block.getWeight()/1000} kwu</td></tr></table>`
    ].join('');
  }

  minerInfo(attempt) {
    return [
      `<tr><td>${this.i18n._.general.address}</td>`,
      `<td colspan="3"><a title='${attempt.address}' class='r_goto_explorer'>${attempt.address}</a></td></tr>`,
      `<tr><td>${this.i18n._.general.height}</td><td>${attempt.height}</td>`,
      `<td>${this.i18n._.general.fee}</td><td>${Amount.wmcc(attempt.fees)} wmcc</td></tr>`
      `<tr><td>${this.i18n._.general.transactions}</td><td>${attempt.items.length + 1}</td>`,
      `<td>${this.i18n._.general.difficulty}</td><td>${toDifficulty(attempt.bits)}</td></tr>`
    ].join('');
  }

  minerAddress(address) {
    return `<tr><td colspan="2" class="ellipse">${this.i18n._.general.address}: ${address}</td></tr>`;
  }

  minerFoundBlock(height, amount) {
    return [
      `<table class='minerfound'><tr><th rowspan="3"><i class="glyph-icon flaticon-remove"></i><i class="glyph-icon flaticon-rig"></i></th>`,
      `<th colspan="2">${this.i18n._.general.found_new_block}!</th></tr>`,
      `<tr><td>${this.i18n._.general.block_height}</td><td>: ${entry.height}</td></tr>`,
      `<tr><td>${this.i18n._.general.block_rewards}</td><td>: ${amount} wmcc</td></tr></table>`
    ].join('');
  }

  exhangeError(err) {
    return `<div class="notfound"><div><h1>Oops! Page not found</h1><span>Error: ${err}<span></div></div>`;
  }

  exchangeList(template, list) {
    const fn = new Function(template)

    return fn()(list)
  }

  removeExchangeAccountType(body) {
    const el = JQuery('accounttype');
    const print = el.next();
    el.remove();

    if (body)
      print.html(body);
  }

  appendServerList(el, list, type) {
    const ul = JQuery(`<ul></ul>`);
    const input = JQuery(`<input name="${type}" placeholder="${this.i18n._.general.custom_server}"/>`);

    if (el.parents('accounttype').find('ul').length)
      return;

    el.parents('accounttype').find('.error').html('');
    ul.append(input);
    for (let url of list) {
      const li = JQuery(`<li>${url}</li>`);
      li.on('click', () => {
        el.val(li.html());
      })
      ul.append(li);
    }

    el.after(ul);
    ul.attr("tabindex",-1).focus();
    input.focus();
    el.trigger('change');

    input.on('blur keydown', (evt) => {
      setTimeout(()=>{
        if (evt.which !== 13 && evt.type !== 'blur')
          return;
        else
          input.blur();

        const value = input.val();
        if (value)
          el.val(value);

        ul.remove();
      }, 100);
    });

    ul.on('blur', () => {
      setTimeout(()=>{
        if (ul.find('input').is(":focus"))
          return;
        ul.remove();
      }, 500);
    });
  }
}

/**
 * Helper
 */
function age(time, bool) {
  let d = bool ? time : Math.abs(Date.now()/1000 - time);
  let o = '';
  let r = {};
  let c = 0;
  const s = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  }

  Object.keys(s).forEach(function(i){
    r[i] = Math.floor(d / s[i]);
    d -= r[i] * s[i];
    if (r[i] && c<1) {
      c++;
      o += ` ${r[i]} ${i}${r[i] > 1 ? 's':''}`;
    }
  });
  return `${o}${bool ? '':' ago'}`;
}

function toDifficulty(bits, dec) {
  let shift = (bits >>> 24) & 0xff;
  let diff = 0x0000ffff / (bits & 0x00ffffff);

  while (shift < 29) {
    diff *= 256.0;
    shift++;
  }

  while (shift > 29) {
    diff /= 256.0;
    shift--;
  }

  const unit = ['', 'K', 'M', 'G', 'T'];
  const idx = Math.max(0, Math.floor(Math.log(diff) / Math.log(1000)));
  return parseFloat((diff / Math.pow(1000, idx))).toFixed(dec || 7)+unit[idx];
}

function median(c, m, l) {
  let s = Math.max(0, c-(l/2));
  const e = Math.min(s+l, m);
  s = Math.max(0,Math.min(e-l, e));
  return {start: s, end: e};
}

/**
 * Expose
 */
module.exports = Render;