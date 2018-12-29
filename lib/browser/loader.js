/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

const Assert = require('assert');
const FS = require('fs');
const Path = require('path');
//--
const Electron = require('electron');
//--
const {VENDOR} = require('../');
//--
const {
  ipcRenderer,
  remote
} = Electron;
const {
  JQuery
} = VENDOR;

class Loader {
  constructor(options) {
    Assert(typeof options.i18n === 'object');
    Assert(typeof options.listener === 'object');
    Assert(typeof options.logger === 'object');

    if (options.static)
      Assert(typeof options.static === 'string');

    this.logger = options.logger.context('Loader');
    this.node = options.node;
    this.i18n = options.i18n;
    this.render = options.render;
    this.info = options.info;
    this.listener = options.listener;
    this.auth = options.auth;
    this.walletdb = options.walletdb;

    this._window = remote.getCurrentWindow();
    this._static = options.static || '../../source/html';
    this._element = null;
    this._type = null;
  }

  /**
   * Start loader
   */
  start() {
    this._handleElectron();
    this.set(document.body);
    this.find();
  }

  reload(evt) {
    evt.preventDefault();
    location.reload();
  }

  static reload(evt) {
    evt.preventDefault();
    location.reload();
  }

  minimize(evt) {
    evt.preventDefault();
    this._window.hide();
  }

  /**
   * Set current element
   */
  set(el) {
    this._element = el;
  }

  async find() {
    this._type = this._getType();
    if (this._type)
      await this._load();

    JQuery(this._element).children().each(async (idx, child) => {
      this.set(child);
      await this.find();
    });
  }

  async view(elem, html, attr) {
    const dom = JQuery(html);
    for (let i=0; i < dom.length; ++i) {
      this.set(dom[i]);

      if(JQuery(dom[i]).is('toggle'))
        html = await this._toggle(elem, dom, JQuery(html), attr, i);

      this.find();

      if(JQuery(dom[i]).is('include'))
        /* need await??*/ await this._include(elem, JQuery(dom[i]).attr('src'));
    }

    html = this._replace(html, attr);

    JQuery(elem).html(html);

    const requires = JQuery(elem).find('require');
    const triggers = JQuery(elem).find('trigger');
    const prints = JQuery(elem).find('print');

    for (let req of requires)
      eval('require')(JQuery(req).attr('src'));

    for (let tri of triggers)
      eval(`(async () => { ${JQuery(tri).attr('script')} })();`);

    for (let pri of prints)
      await this._print(pri);
  }

  /**
   * Get current element type
   */
  _getType() {
    for (let type of Object.values(Loader.TYPES))
      if (JQuery(this._element).is(`[${type}]`))
        return type;

    return null;
  }

  /**
   * Get current element attributes
   */
  _getAttr() {
    const attr = {};
    JQuery.each(JQuery(this._element).get(0).attributes, (idx, attribute) => {
      let value = attribute.value;
      if (attribute.name === Loader.TYPES.PAGE)
        value = attribute.value.split(/_(.+)/);

      attr[attribute.name] = value;
    });

    return attr;
  }

  /**
   * Get current element file path
   */
  _getPath(attr) {
    let file = `module/${attr.category}/${attr.module}.htm`;
    if (this._type === Loader.TYPES.PAGE)
      file = `page/${attr.page[0]}/${attr.page[1]}.htm`;

    return Path.join(__dirname, this._static, file);
  }

  async _readFile(path) {
    try {
      return await FS.readFileSync(path, 'utf8');
    } catch (e) {
      throw new Error(this.i18n.format(this.i18n._.general.fs_library_not_found, path));
    }
  }

  async _load() {
    return new Promise(async (resolve) => {
      const attr = this._getAttr();
      const path = this._getPath(attr);
      const elem = attr.tag || this._element;

      if(!attr.active)
        return resolve();

      try {
        const html =  await this._readFile(path);
        await this.view(elem, html, attr);
        resolve();
      } catch (err) {
        console.log(err)
        this.logger.error(err);
      }
    });
  }

  async _toggle(elem, html, copy, attr, idx) {
    const wrap = JQuery("<p></p>").append(html[idx]);
    const script = JQuery(html[idx]).attr('script').split('::');
    const hook = JQuery(html[idx]).attr('on');
    const cls = JQuery(html[idx]).attr('cls');

    const val = await this.listener.call(...script);

    let eq = 0;
    if (!val) eq ^= 1;

    const childs = wrap.children('toggle').find(`[cls="${cls}"]`);
    const click = childs.eq(eq^1).children('[click]');

    for (let child of childs) {
      const html = JQuery(child).html();
      const doms = JQuery(html);

      let i = 0;
      for (let dom of doms) {
        this.set(dom);

        if(JQuery(dom).is('toggle')) {
          const replace = await this._toggle(elem, doms, JQuery(html), attr, i);
          JQuery(child).eq(i).html(replace);
        } i++;
      }
    }

    const merged = this._merge(copy);
    if (hook) {
      const events = hook.split('::');
      /*this._event(events[0], events[1], childs, () => {
        this.set(elem);//this._element = elem;
        this.render(elem, merged, attr);
      });*/
      this.listener.add(events[0], events[1], () => {
        this.set(elem);
        this.view(elem, merged, attr);
      });
    }

    if (click) {
      JQuery(elem).unbind().bind('click', '[click]', async (evt) => {
        const event = JQuery(evt.target).attr('click');
        if (!event)
          return;

        const events = event.split('::');
        if (events.length > 1)
          await this.listener.call(...events);

        this.view(elem, merged, attr);
      });
    }

    childs.eq(eq).remove();

    let temp = '';
    for (let i=0; i<html.length; i++) {
      if (i === idx)
        temp += wrap.html();
      else
        temp += JQuery(html[i]).prop("outerHTML") || '';
    }

    return temp;
  }

  async _include(elem, path) {
    const file = Path.join(__dirname, path);
    const js = await this._readFile(file);
    JQuery(elem).append(`<script type="text/javascript">${js}</script>`);
  }

  _replace(html, attr) {
    if (attr.page)
      return this.i18n.replace(html, attr.page[1].toLowerCase(), attr.page[0].toLowerCase());

    return this.i18n.replace(html, attr.module.toLowerCase(), attr.category.toLowerCase());
  }

  _merge(copy) {
    return copy.map((idx, el) => { return el.outerHTML; }).get().join('\r\n');
  }

  /**
   * @return {Promise}
   */
  async _print(elem) {
    const el = JQuery(elem);
    const args = el.html().split('::');

    if (el.is('[on]'))
      return this.listener.bind(...args, el);

    if (el.is('[emit]')) {
      const emit = await this.listener.fire(...args, el);
      el.html(emit);
      return;
    }

    const opts = Object.assign({}, args.slice(2));
    try {
      const call = await this.listener.call(...args, opts);
      if (call instanceof JQuery)
        el.append(call)
      else
        el.html(call);
    } catch (err) {
      el.html(el.html());
      this.logger.error(err);
    }
  }

  /**
   * Hook event to Node event
   
  _event(module, event, elem, func) {
    //if (!this._events[module])
    //  this.events[module] = [event, elem, func];
    const listener = this.node[module].on(event, func);
    listener._events[event] = listener._events[event].filter((e,x,a) => { return a.includes(e) == x; });
  }*/

  _handleElectron() {
    ipcRenderer.send('window-size', {width:window.innerWidth, height:window.innerHeight});

    const SelectionText = 
      remote.Menu.buildFromTemplate([{
        label: this.i18n._.general.copy,
        role: 'copy'
      }, {
        type: 'separator'
      }, {
        label: this.i18n._.general.selectall,
        role: 'selectall'
      }]);

    const SelectionInput =
      remote.Menu.buildFromTemplate([{
        label: this.i18n._.general.undo,
        role: 'undo'
      }, {
        label: this.i18n._.general.redo,
        role: 'redo'
      }, {
        type: 'separator'
      }, {
        label: this.i18n._.general.cut,
        role: 'cut'
      }, {
        label: this.i18n._.general.copy,
        role: 'copy'
      }, {
        label: this.i18n._.general.paste,  
        role: 'paste'
      }, {
        type: 'separator'
      }, {
        label: this.i18n._.general.selectall,
        role: 'selectall'
      }
    ]);

    this._window.webContents.on('context-menu', (evt, props) => {
      const {isEditable} = props;
      if(isEditable)
        SelectionInput.popup(this._window);
    });

    window.oncontextmenu = (evt) => {
      if (window.getSelection() != '' && evt.button === 2)
        SelectionText.popup(this._window);
    }

    document.addEventListener('keydown', (evt) => {
      if (evt.ctrlKey && evt.shiftKey && evt.which === 123) this._window.toggleDevTools();
      else if (evt.ctrlKey && evt.shiftKey && evt.which === 116) Loader.reload(evt);
    });

    ['drop', 'dragover'].map(event => {
      window.addEventListener(event, evt => {
        evt.preventDefault();
        return false;
      }, false);
    });
  }
}

/*
 * Constant
 */
Loader.TYPES = {
  MODULE: 'module',
  PAGE: 'page'
}

/*
 * Helper
 */

function toLowerCase(string) {
  return string.toLowerCase().replace(/-/g, '_');
}

/*
 * Expose
 */
module.exports = Loader;