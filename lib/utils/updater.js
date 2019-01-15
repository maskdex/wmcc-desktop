/*!
 * Copyright (c) 2018, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/worldmobilecoin/wmcc-desktop
 */

'use strict';

const Assert = require('assert');
const {remote} = require('electron');
const {autoUpdater} = remote.require('electron-updater');

/**
 * @module UTILS.Updater
 */
class Updater {
  constructor(options) {
    Assert(options.render);

    this._updater = autoUpdater;
    this._updater.autoDownload = false;
    this.render = options.render;
  }

  start() {
    this.render.waitForElement('updatecontent', this._handleEvents.bind(this));
  }

  _handleEvents(el) {
    this._updater.on('update-available', (info) => {
      el.show();
      el.addClass('completed');
      this.render.updateAvailable(el, info);
      //el.addClass('progress');
      //this.render.updateProgressBar(el);
    });

    this._updater.on('update-not-available', (info) => {
      el.show();
      this.render.updateUptodate(el);

      setTimeout(()=>{ el.hide(); }, 8000);
    });

    this._updater.on('download-progress', (progress) => {
      el.show();

      if (!el.hasClass('progress')) {
        el.addClass('progress');
        this.render.updateProgressBar(el);
      }

      const percent = `${progress.percent.toFixed(2)}%`;
      const rate = (progress.bytesPerSecond/1E6).toFixed(3);

      JQuery('.progress_bar').css('width', percent);
      this.render.updateDownloading(JQuery('#prog_status'), percent, rate);
    });

    this._updater.on('update-downloaded', (info) => {
      el.show();
      el.removeClass('progress').addClass('completed');

      const submit = this.render.updateDone(el, info.version);

      submit.eq(0).click(() => {
        this._updater.quitAndInstall(true, true);
      });

      submit.eq(1).click(() => {
        el.hide();
      });
    });

    this._updater.on('error', (err) => {
      el.hide();
      console.log(err);
    });

    this._setTimer(this._updater.checkForUpdatesAndNotify, el);
  }

  _setTimer(cb, el) {
    const now = Date.now();
    el.hide();
    
    setInterval(cb, Updater.INTERVAL * 1000);

    if (typeof(Storage) === "undefined")
      return cb();

    // onload - first time login || call once if over 10 minutes
    if (!localStorage.WMCC_Update || localStorage.WMCC_Update < now - (10 * 60 * 1000)) {
      localStorage.WMCC_Update = now;
      return cb();
    }
  }
}

/**
 * Constant
 */
Updater.INTERVAL = 1 * 60 * 60;  // check for update every 1 hour

/**
 * Expose
 */
module.exports = Updater;