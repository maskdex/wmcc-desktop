/*!
 * Copyright (c) 2017, Park Alter (pseudonym)
 * Distributed under the MIT software license, see the accompanying
 * file COPYING or http://www.opensource.org/licenses/mit-license.php
 *
 * https://github.com/park-alter/wmcc-desktop
 * dom.js - jquery Document Object Model for wmcc_desktop.
 */

const _DOM = function(){};
const $ = require('../vendor/jquery-3.2.1.min.js');

_DOM.circularBeat = function(){
  let els = [];
  $(document).on('DOMSubtreeModified', 'circularbeat print', function(e){
    const parent = $(e.target).parent().parent();
    const val = $(e.target).text();

    if(parent.is(':animated')) return;
    
    if (els[e.target] !== val && val){
      const w = toInt(parent.css('width'));
      const h = toInt(parent.css('height'));
      const b = toInt(parent.css('borderWidth'));
      els[e.target] = val;
      parent.animate({"borderWidth": `${(b+2)}px`, width: `${(w-4)}px` , height: `${(h-4)}px`}, 50, function() {
        parent.animate({"borderWidth": `${b}px`, width: `${w}px` , height: `${h}px`}, 50);
      });
    }
  });

  /**
   * Helper
   */
  function toInt(val) {
    return parseInt(val.replace(/[^-\d\.]/g, ''));
  }
}();

_DOM.select = function(){
  $(document).on('mousedown', 'select:not(.pika-select)', function(e){
    e.preventDefault();

    const select = e.target;
    const opts = e.target.options;

    let wrap = $(`<div class="dropdown"></div>`)
    for (let i=0; i<opts.length; i++) {
      const item = $(`<span index='${i}' style="display:block;">${opts[i].innerHTML}</span>`);
      wrap.append(item);
      item.click(function(e){
        select.value = opts[i].value;
        select.style.color = $(e.target).css("color");
        select.style.fontSize = $(e.target).css("font-size");
        wrap.remove();
      })
    };
    wrap.css({
      "position": "absolute",
      "z-index": "1",
      "width": $(this).innerWidth(),
      "background-color": $(this).css("background-color")
    });

    $(this).after(wrap);
    wrap[0].setAttribute('tabindex', '0');
    wrap.focus();
    wrap.blur(function(){
      $(this).remove();
    });
  });
}();

_DOM.notifycontent = function(){
  $(document).on('DOMSubtreeModified', 'notifycontent', e => {
    const first = $(e.target).children().first();
    first.bind('animationend', e => { first.remove(); });
    first.find('.flaticon-remove').eq(0).click(e => first.remove());

    if (first.is('.odd, .even'))
      return;

    if (first.next().hasClass('even')) {
      first.addClass('odd');
      return;
    }

    first.addClass('even');
  });
}();

_DOM.timeAge = function(){
  const interval = setInterval(() => {
    $(document).find('.timeAge').each((i, el) => {
      const time = age($(el).attr('value'), $(el).attr('k'));
      $(el).html(time);
    });
  }, 60*1000);

  /**
   * Helper
   */
  function age(time, k, bool) {
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
      if (r[i] && c<k) {
        c++;
        o += ` ${r[i]} ${i}${r[i] > 1 ? 's':''}`;
      }
    });
    return `${o}${bool ? '':' ago'}`;
  }
}();