/*!
 * Copyright (c) 2017, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/park-alter/wmcc-desktop
 * vendor.js - vendor for wmcc_desktop.
 */

/**
 * Expose vendor library
 */

const Vendor = exports;

/*
 * Expose
 */
const path = '../source/vendor/';

/*
 * Expose
 */
Vendor.bignumber = require(`${path}bignumber.min`);
Vendor.calendar = require(`${path}calendar.min`);
Vendor.d3 = require(`${path}d3.min`);
Vendor.date = require(`${path}date.min`);
Vendor.dom = require(`${path}dom`);
Vendor.moment = require(`${path}moment.min`);
Vendor.qrcode = require(`${path}qrcode.min`);
Vendor.jqueryqrcode = require(`${path}jquery.qrcode.min`);