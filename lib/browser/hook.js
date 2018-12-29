/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

const {VENDOR} = require('../');
//--
const {clipboard} = require('electron');
const {primitives} = require('wmcc-core');
//--
const {EVENTS} = require('./events');
//--
const {
  Address
} = primitives;
const {
  BigNum,
  Calendar,
  JQuery
} = VENDOR;

class Hook {
  constructor(options) {
    this.node = options.node;
    this.i18n = options.i18n;
    this.auth = options.auth;
    this.info = options.info;
    this.render = options.render;
    this.loader = options.loader;
    this.events = options.events;
    this.exchange = options.exchange;

    //this._target = {};
    this._currTarget = {};

    this._calendar = new Map();

    this._init();
  }

  _init() {
    BigNum.config({ DECIMAL_PLACES: 7 });

    this.events.bind(EVENTS.CLICK, 'menubutton, tabbutton, menuhidden', this._toggleActive.bind(this));
    this.events.bind(EVENTS.MOUSE, '.r_toggle_password', this._togglePassword.bind(this));
    this.events.bind(EVENTS.FOCUS, '.r_calendar', this._renderCalendar.bind(this));
    this.events.bind(EVENTS.FOCUS, '.r_max_size', this._maxSize.bind(this));
    this.events.bind(EVENTS.KEYUPCHANGE, '.r_max_buffer', this._maxBuffer.bind(this));
    this.events.bind(EVENTS.KEYDNCHANGE, '.r_is_name', this._isName.bind(this));
    this.events.bind(EVENTS.KEYDNCHANGE, '.r_digit_dash', this._digitDash.bind(this));
    this.events.bind(EVENTS.KEYDNCHANGE, '.r_fixed_number', this._fixedNumber.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_secret_insert', this._secretInsert.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_wallet_remove', this._secretRemove.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_wallet_manage_address', this._walletManageAddress.bind(this));
    this.events.bind(EVENTS.KEYUPCHANGE, '.r_swap_amount_check', this._swapAmountCheck.bind(this));
    this.events.bind(EVENTS.FOCUSBLUR, '.r_address_check', this._addressCheck.bind(this));
    this.events.bind(EVENTS.FOCUSBLUR, '.r_address_pkh_check', this._addressPKHashCheck.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_address_copy', this._addressCopy.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_tx_address_add', this._txAddressAdd.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_tx_address_delete', this._txAddressDelete.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_wallet_get_history', this._walletGetHistory.bind(this));
    this.events.bind(EVENTS.CLICKKEYUP, '.r_explorer_search', this._explorerSearch.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_explorer_get_addr_tx', this._explorerGetAddrTx.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_goto_explorer', this._gotoExplorer.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_gohome_explorer', this._gohomeExplorer.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_general_goto_addr', this._generalGotoAddr.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_general_goto_addrs', this._generalGotoAddrs.bind(this));
    this.events.bind(EVENTS.CLICKKEYUP, '.r_general_search_addr', this._generalSearchAddr.bind(this));
    this.events.bind(EVENTS.CLICK, '.flaticon-copy', this._iconCopy.bind(this));
    this.events.bind(EVENTS.CLICK, '.flaticon-paste', this._iconPaste.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_menu_minimize', this._menuMinimize.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_menu_logout', this._menuLogout.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_exchange_demo', this._exchangeDemoList.bind(this));
    this.events.bind(EVENTS.CLICK, '.r_exchange_real', this._exchangeRealList.bind(this));
    this.events.bind(EVENTS.CHANGE, '.r_exchange_server_change', this._exchangeServerChange.bind(this));
  }

  addressCheck(el, evt, types, err) {
    const address = el.val();
    const sibling = el.siblings('p');

    if (!address)
      return;

    sibling.html('').removeClass('error');
    this.render.highlightInputs(el, false);

    if (evt.type === 'focusin')
      return;

    try {
      const addr = Address.fromString(address);
      if (types) {
        if (!types.includes(addr.getScriptType())) {
          sibling.html(err).addClass('error');
          this.render.highlightInputs(el, true, true);
          return;
        }
      }
      this.render.highlightInputs(el, true);
    } catch (e) {
      sibling.html(this.i18n._.general.invalid_wmcc_address).addClass('error');
      this.render.highlightInputs(el, true, true);
    }
  }

  swapCoin(el){
    el.blur(() => {
      let sibling, value;
      const coin = el.attr('coin');

      value = toNumeric(el.val());

      switch(coin){
        case 'wmcc':
          sibling = el.siblings('[coin="btc"]');
          try {
            value = new BigNum(value);
            value = value.div(10000);
            value = value.toNumber();
          } catch (e) {;}
          break;
        case 'btc':
          sibling = el.siblings('[coin="wmcc"]');
          try {
            value = new BigNum(value);
            value = value.mul(10000);
            value = value.toNumber();
          } catch (e) {;}
          break;
      }

      const elems = [sibling, sibling.next()];
      this.render.highlightInputs(elems, true);
      if(!value){
        value = '';
        if (parseFloat(el.val()) === 0) {
          el.val('');
          elems.push(el, el.next());
        }

        this.render.highlightInputs(elems, false);
      }
      sibling.val(value);
    });
  }

  getSend(el) {
    const parent = el.parent().parent();
    const addr = parent.find('.address:first');
    const val = parent.find('input[coin="wmcc"]');

    if(!addr.val() || !val.val() || addr.hasClass('error') || val.hasClass('error'))
      return false;

    return {
      addr: addr.val(),
      val: val.val()
    }
  }

  async explorerSearch(el, value) {
    const {module, data} = await this.setExplorerData(value);

    const menus = el.find('menuhidden[category="explorer"]');

    for (let menu of menus) {
      if (JQuery(menu).attr('module') === module)
        JQuery(menu).removeAttr('active').trigger('click');
    }

    if (!data)
      el.find('menuhidden[module="404"]').trigger('click');
    //return data;
  }

  async setExplorerData(value) {
    // reset explorer
    this.info.resetExplorer();
    // find block by height
    if (isNumeric(value)) {
      const blk = await this.info.setExplorerBlockByHeight(value);
      if (blk !== false)
        return { module: 'block', data: blk }
      return false;
    }
    if (value.length === 64) {
      // find block first
      const block = await this.info.setExplorerBlockByHash(value);
      if (block !== false)
        return { module: 'block', data: block };
      // find transaction
      const tx = await this.info.setExplorerTransaction(value);
      if (tx !== false)
        return { module: 'transaction', data: tx };
      // find mempool transaction
      const pending = await this.info.setExplorerPending(value);
      if (pending !== false)
        return { module: 'pending', data: pending };
    }
    // find address
    const address = await this.info.setExplorerAddress(value);
    if (address !== false)
      return { module: 'address', data: address };
    return false;
  }

  _toggleActive(el) {
    if(el.attr('active'))
      return;

    el.attr('active', true).siblings().removeAttr('active');

    //this._target = {};
    this.loader.set(el);
    this.loader.find();
  }

  _togglePassword(el, evt) {
    if(el.is(':disabled')){
      if(evt.type === ('mouseenter' || 'mouseover'))
        el.attr('type','text');
      else
        el.attr('type','password');
      return;
    }

    if(evt.type === ('focusin' || 'focus'))
      el.attr('type','text');
    else if( evt.type === ('focusout' || 'blur'))
      el.attr('type','password');
  }

  _renderCalendar(el, evt) {
    if (this._calendar.has(el))
      return;

    for (let [key, calendar] of this._calendar.entries()) {
      calendar.destroy();
      this._calendar.delete(key);
    }

    JQuery('.pika-single').remove();

    const date = el.attr('date') || 'Jan 01 1970';
    const minDate = el.attr('minDate') || 'Jan 01 1900';
    const calendar = new Calendar({
      field: evt.target,
      firstDay: 1,
      position: 'top right',
      defaultDate: new Date(date),
      minDate: new Date(minDate),
      maxDate: new Date(),
      yearRange: [1900,2020],
      format: 'DD-MM-YYYY',
      disableDayFn: true
    });

    this._calendar.set(el, calendar);
  }

  _maxSize(el) {
    const max = el.attr('length') || 32;
    el.prop("maxLength", max);
  }

  _maxBuffer(el, evt) {
    const prop = el.prop('name');
    const len = Buffer.byteLength(el.val());

    if (el.val()) {
      const max = (el.attr('name').indexOf('question') !== -1 && this.auth.hsm.length) ? this.auth.hsm.length : 32;
      if (len > max) {
        if(!this._currTarget[prop]) {
          this.render.tooltip(el, this.i18n._.general.exceed_max_size, {toggleAnimation: 5});
          evt.preventDefault();
        } else {
          if (JQuery.inArray(evt.keyCode, [8, 9, 13, 27, 46, 109, 111, 189, 191]) !== -1 || 
            ((evt.keyCode === 65 || evt.keyCode === 67) && (evt.ctrlKey === true || evt.metaKey === true))
          ) return;
          else evt.preventDefault();
        }
        setTimeout(() => {
          el.val(Buffer.from(el.val()).toString('utf8', 0, max));
        }, 1);
      } else if(this._currTarget[prop] && len !== max) {
        this._currTarget[prop].stop().remove();
      }
    } else if (this._currTarget[prop]) {
      this._currTarget[prop].stop().remove();
    }
  }

  _isName(el, evt) {
    const last = el.val().substr(-1);
    if (last === ' ' && evt.keyCode === 32)
      evt.preventDefault();  // prevent double space

    if (JQuery.inArray(evt.keyCode, [8, 9, 13, 27, 32, 46, 109, 110, 189]) !== -1 ||
      (evt.keyCode === 65 && (evt.ctrlKey === true || evt.metaKey === true)) || // select all
      (evt.keyCode >= 35 && evt.keyCode <= 40))
      return;

    if ((evt.shiftKey || (evt.keyCode < 48 || evt.keyCode > 57)) 
      && (evt.keyCode < 96 || evt.keyCode > 105) && (evt.shiftKey || evt.keyCode !== 190)
      && (evt.keyCode < 65 || evt.keyCode > 90)) {
      evt.preventDefault();
    }
  }

  _digitDash(el, evt) {
    if (JQuery.inArray(evt.keyCode, [8, 9, 13, 27, 46, 109, 111, 189, 191]) !== -1 ||
      (evt.keyCode === 65 && (evt.ctrlKey === true || evt.metaKey === true)) || // select all
      (evt.keyCode >= 35 && evt.keyCode <= 40))
      return;

    if ((evt.shiftKey || (evt.keyCode < 48 || evt.keyCode > 57)) && (evt.keyCode < 96 || evt.keyCode > 105))
      evt.preventDefault();
  }

  _fixedNumber(el, evt) {
    let keyCode = evt.keyCode || evt.which;

    if (keyCode >= 96 && keyCode <= 105)
      keyCode -= 48;

    const dot = (keyCode === 110 || keyCode === 190) ? '.' : String.fromCharCode(keyCode);

    if (JQuery.inArray(keyCode, [8, 9, 13, 27, 46, 189]) !== -1 ||
      (keyCode === 65 && (evt.ctrlKey === true || evt.metaKey === true)) || // select all
      (keyCode >= 35 && keyCode <= 40))
      return;

    if (!isNumeric(`${el.val()}${dot}`) || evt.keyCode === 32)
      evt.preventDefault();

    if ((evt.shiftKey || (evt.keyCode < 48 || el.keyCode > 57)) 
      && (evt.keyCode < 96 || evt.keyCode > 105) 
      && evt.keyCode === 110 && evt.keyCode === 190)
      evt.preventDefault();
  }

  _secretInsert(el, evt) {
    const _inputs = el.parent().parent().find('input');
    let id = (_inputs.length - 4)/2;
    //check first input
    const inputs = this.render.testInput(`input:lt(${(id*2) + 2})`);
    id++;

    if (inputs) {
      for (let input of inputs)
        this.render.tooltip(input, this.i18n._.general.required);
      return;
    }

    let html = JQuery('#wallet_secret').html();
    const prev = el.parent().prev();

    html = html.replace(`name="question"`,`name="question_${id}"`)
      .replace(`name="answer"`,`name="question_${id}"`)
      .replace(/\[count\]/g, id);

    prev.parent().find('input:gt('+((id-2)*2 + 1)+'):lt(2)').prop('disabled', true);

    if (id === 2) {
      JQuery(html).insertAfter(prev).hide().slideDown(300);
      return;
    }

    prev.find('.flaticon-remove').remove();
    prev.prev().find('.flaticon-remove').remove();
    prev.prev().prev().slideUp(300).prev().slideUp(300, () => {
      JQuery(html).insertAfter(prev).hide().slideDown(300);
    });

    if((this.auth.getMaxLock() - 2) < id-1)
      el.remove();
  }

  _secretRemove(el) {
    JQuery('.r_wallet_remove:lt(2)').parent().remove();
  }

  _walletManageAddress(e) {
    JQuery('menubutton[page="menu-top_wallet"]').removeAttr('active').click();

    setTimeout(() => {
      const cb = (el) => {
        el.click();
      }

      this.render.waitForElement('menubutton[module="manage"]', cb);
    }, 1);
  }

  _swapAmountCheck(el, evt) {
    const next = el.next();
    const sibling = el.siblings('p');
    const amount = el.val();

    sibling.html('').removeClass('error');
    this.render.highlightInputs([el, next], false);

    if (evt.type === 'focusin')
      return;

    if (amount) {
      if (isNumeric(amount))
        this.render.highlightInputs([el, next], true, false);
      else {
        sibling.html(this.i18n._.general.invalid_amount).addClass('error');
        this.render.highlightInputs([el, next], true, true);
      }
    } else {
      this.render.highlightInputs([el, next], false);
    }

    if (el.hasClass('h_swapcoin'))
      this.swapCoin(el);
  }

 _addressCheck(el, evt) {
    this.addressCheck(el, evt);
  }

 _addressPKHashCheck(el, evt) {
    this.addressCheck(el, evt, [2, 130], this.i18n._.general.non_witness_pkh_address);
  }

  async _addressCopy(el) {
    clipboard.writeText(el.html());
    const receive = await this.info.createReceive();
    el.html(receive);
  }

  _txAddressAdd(el) {
    const data = this.getSend(el);

    console.log(data)

    if (!data)
      return;

    let table = el.siblings('table');

    if (!table.length)
      table = this.render.txOutputTable(el);

    table.append(this.render.txOutputData(data));

    el.parent().parent().find('input.address, input.h_swapcoin, input.h_swapcoin + a').each((idx, el) => {
      JQuery(el).val('');
      this.render.highlightInputs(JQuery(el), false);
    });
  }

  _txAddressDelete(el) {
    const tr = el.parent().parent();
    const table = tr.parent().parent();
    if (tr.siblings().length === 1) {
      table.siblings('p').remove();
      table.remove();
    } else tr.remove();
  }

  async _walletGetHistory(el) {
    const offset = el.attr('offset');
    const limit = el.attr('limit');
    const html = await this.info.getWalletHistory(limit, offset)
    el.parent().parent().html(html);
  }

  _explorerSearch(el, evt) {
    const value = (evt.type == 'click') ? el.prev().val() : el.val();

    if ((evt.keyCode != 13 && evt.target.nodeName == 'INPUT') || !value)
      return;

    const parent = el.parent().parent().parent().parent();

    this.explorerSearch(parent, value);
  }

  async _explorerGetAddrTx(el) {
    const parent = el.parents('print');
    const limit = el.attr('limit');
    const offset = el.attr('offset');
    const attr = {category: 'explorer', module: 'address'};
    const html = await this.info.getExplorerAddressTxs(limit, offset);

    this.loader.view(parent, html, attr);
  }

  _gotoExplorer(el) {
    this.info.setExplorerHome(false);
    JQuery('menubutton[page="menu-top_explorer"]').removeAttr('active').trigger('click');

    setTimeout(() => {
      this.info.setExplorerHome(true);
      const cb = (parent, el) => {
        const value = el.val() || el.attr('value') || el.html();
        return this.explorerSearch(parent, value);
      };

      this.render.waitForElement('bodycontain[category="explorer"]', cb, el);
    }, 1);
  }

  _gohomeExplorer() {
    JQuery('menubutton[page="menu-top_explorer"]').removeAttr('active').trigger('click');
  }

  async _generalGotoAddr(el) {
    const value = el.html();
    const child = findChildOf(el, 'print');

    const attr = {category: 'address', module: 'list'};
    const html = await this.info.setGeneralSearchAddress(value);

    this.loader.view(child, html, attr);
  }

  async _generalGotoAddrs(el) {  
    const parent = JQuery('addressprint print');  
    const limit = el.attr('limit');
    const offset = el.attr('offset');

    const attr = {category: 'address', module: 'list'};
    const html = await this.info.getGeneralAddress(limit, offset);

    this.loader.view(parent, html, attr);
  }

  async _generalSearchAddr(el, evt) {
    const value = (evt.type == 'click') ? el.prev().val() : el.val();
    const parent = el.parent().parent().next();

    if ((evt.keyCode != 13 && evt.target.nodeName == 'INPUT') || !value)
      return;

    const attr = {category: 'address', module: 'list'};
    const html = await this.info.setGeneralSearchAddress(value);

    this.loader.view(parent, html, attr);
  }

  _iconCopy(el) {
    const value = el.attr("value");
    const type = el.attr("type");

    // copy from input element
    if (type) {
      let target;
      if (type === 'next')
        target = el.next('input, textarea');
      else
        target = el.prev('input, textarea');

      const disabled = target.prop('disabled');
      JQuery(target).prop('disabled', false).select();
      document.execCommand("copy");

      if (disabled)
        JQuery(target).prop('disabled', true);

      return;
    }

    // copy from non-input element
    const temp = JQuery("<input style='top:-9999px;position:absolute;'>");
    JQuery("body").append(temp);

    if (value)
      temp.val(value).select();
    else if (el.hasClass('next'))
      temp.val(el.next().html()).select();
    else if (el.hasClass('prev'))
      temp.val(el.prev().html()).select();

    document.execCommand("copy");
    temp.remove();
  }

  _iconPaste(el) {
    const type = el.attr("type");
    if (!type)
      return;

    if (type === 'next')
      el.next('input, textarea').select();
    else
      el.prev('input, textarea').select();

    document.execCommand("paste");
  }

  _menuMinimize(el, evt) {
    this.loader.minimize(evt);
  }

  _menuLogout(el, evt) {
    this.loader.reload(evt);
  }

  _exchangeDemoList(el) {
    this.render.appendServerList(el, this.exchange.getServerList('demo'));
  }

  _exchangeRealList(el) {
    this.render.appendServerList(el, this.exchange.getServerList('real'));
  }

  _exchangeServerChange(el) {
    el.parent().parent().siblings().find('input').val('');
  }
}

/**
 * Helper
 */
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function toNumeric(n) {
  if(!isNumeric(n)) return false;
  return parseFloat(n);
}

function findChildOf(el, child) {
  const parent = el.parent();
  if (parent.children(child).length)
    return parent.children(child);
    
  return findChildOf(parent, child);
}

/*
 * Expose
 */
module.exports = Hook;