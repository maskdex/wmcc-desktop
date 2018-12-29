/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

const Assert = require('assert');
const Path = require('path');
const Url = require('url');
//--
const Electon = require('electron');
//--
const {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  Tray,
  Menu
} = Electon;

/**
 * @module BROWSER.Window
 */
class Window {
  constructor(options) {
    this.options = new WindowOptions(options);
    this.window = null;
  }

  start() {    
    app.on('ready', this._start.bind(this));

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });

    app.on('activate', () => {
      if (this.window === null) this._start();
    });
  }

  _start() {
    this.window = new BrowserWindow(this.options);

    this.window.loadURL(Url.format({
      pathname: Path.join(__dirname, this.options.indexPath),
      protocol: 'file:',
      slashes: true
    }));

    // Tray
    const tray = new Tray(this.options.icon);
    const menu = Menu.buildFromTemplate([
      {
        label: 'Show Application',
        click: () => {
          this.window.show();
        }
      },
      {
        label: 'Close Application',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(menu);

    //this.window.openDevTools();
    this.window.on('show', () => {
      tray.setHighlightMode('always');
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    ipcMain.on('window-size', (event, arg) => {
      const width = this.options.width;
      const height = this.options.height;
      if(width > arg.width && height > arg.height && width != arg.width)
        this.window.setSize(width - (arg.width - width), height - (arg.height - height));
    });
  }
}

class WindowOptions {
  constructor(options) {
    this.width = 980;
    this.height = 600,
    this.maximizable = false;
    this.resizable = false;
    this.webPreferences = {
      devTools: false
    };

    this.iconPath = '../../source/image/favicon.png';
    this.icon = nativeImage.createFromPath(
      Path.join(__dirname, this.iconPath)
    );

    this.indexPath = '../../source/html/index.htm';

    if (options)
      this._fromOptions(options);
  }

  _fromOptions(options) {
    Assert(typeof options === 'object');

    if (options.width) {
      Assert(typeof options.width === 'number');
      this.width = options.width;
    }

    if (options.height) {
      Assert(typeof options.height === 'number');
      this.height = options.height;
    }

    if (options.maximizable) {
      Assert(typeof options.maximizable === 'boolean');
      this.maximizable = options.maximizable;
    }

    if (options.resizable) {
      Assert(typeof options.resizable === 'boolean');
      this.resizable = options.resizable;
    }

    if (options.webPreferences) {
      Assert(typeof options.webPreferences === 'object');
      this.webPreferences = options.webPreferences;

      if (this.webPreferences.devTools)
        Assert(typeof options.webPreferences.devTools === 'boolean');
    }

    if (options.iconPath) {
      Assert(typeof options.iconPath === 'string');
      this.icon = nativeImage.createFromPath(
        Path.join(__dirname, options.iconPath)
      );
    }

    if (options.indexPath) {
      Assert(typeof options.indexPath === 'string');
      this.icon = options.indexPath;
    }

    return this;
  }
}

/**
 * Expose
 */
module.exports = Window;