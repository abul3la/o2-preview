/* Option 02 runtime: links on composite cards, overlays (menu / sheets), show-more, shelves, fitting */
(function () {
  'use strict';
  var d = document;
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }

  // ---- fit fixed-width compositions into narrow parents ----
  function fit(root) {
    var els = (root || d).querySelectorAll('[data-fit]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i], w = +el.getAttribute('data-fit'), p = el.parentElement;
      el.style.zoom = '';
      var cs = getComputedStyle(p), avail = p.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (avail > 0 && avail < w - 0.5) el.style.zoom = (avail / w).toFixed(4);
    }
  }

  // ---- horizontal shelves: start where the design shows them (RTL start = right end) ----
  function shelves(root) {
    var els = (root || d).querySelectorAll('[data-scroll-x]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.__init) continue; el.__init = 1;
      var x = +el.getAttribute('data-scroll-x');
      el.scrollLeft = x > 0 ? x : el.scrollWidth;
    }
  }

  // ---- show more / less ----
  function setLabel(box, open) {
    var show = (box.getAttribute('data-show') || '').trim(), less = (box.getAttribute('data-less') || '').trim();
    if (!show || !less) return;
    var scope = box.querySelector('[data-sm-toggle]') || box;
    var walker = d.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null), n;
    while ((n = walker.nextNode())) {
      var t = n.nodeValue.trim();
      if (!t) continue;
      if (open && t === show) { n.nodeValue = n.nodeValue.replace(t, less); return; }
      if (!open && t === less) { n.nodeValue = n.nodeValue.replace(t, show); return; }
    }
  }
  function toggle(box) {
    var open = !box.hasAttribute('data-open');
    if (open) box.setAttribute('data-open', ''); else box.removeAttribute('data-open');
    var more = box.querySelectorAll('[data-slot="More"],[data-slot="Full"]');
    var ex = box.querySelectorAll('[data-slot="Excerpt"]');
    for (var i = 0; i < more.length; i++) { if (open) more[i].removeAttribute('hidden'); else more[i].setAttribute('hidden', ''); }
    for (var j = 0; j < ex.length; j++) { if (open) ex[j].setAttribute('hidden', ''); else ex[j].removeAttribute('hidden'); }
    setLabel(box, open);
    var tg = box.querySelector('[data-sm-toggle]');
    if (tg) {
      tg.setAttribute('aria-expanded', open ? 'true' : 'false');
      var ch = tg.querySelectorAll('img'); if (ch.length) ch[ch.length - 1].style.transform = open ? 'rotate(180deg)' : '';
    }
    if (!open) { var r = box.getBoundingClientRect(); if (r.top < 0) box.scrollIntoView({ block: 'start' }); }
    fit(box);
  }

  // ---- overlays ----
  var stack = [];
  function openOverlay(slug, swap) {
    var tpl = d.getElementById('ov-' + slug);
    if (!tpl) return;
    if (swap) while (stack.length) stack.pop().remove();
    var layer = d.createElement('div');
    layer.className = 'ov-layer';
    layer.setAttribute('data-kind', tpl.getAttribute('data-kind'));
    layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
    layer.appendChild(tpl.content.cloneNode(true));
    d.body.appendChild(layer);
    d.body.classList.add('ov-open');
    stack.push(layer);
    shelves(layer); fit(layer);
    layer.tabIndex = -1; layer.style.outline = 'none';
    try { layer.focus({ preventScroll: true }); } catch (e) {}
  }
  function closeOverlay(all) {
    var l = stack.pop(); if (l) l.remove();
    if (all) while (stack.length) stack.pop().remove();
    if (!stack.length) d.body.classList.remove('ov-open');
  }
  function home() { var ic = d.querySelector('link[rel=icon]'); return ic ? ic.href.replace(/assets\/favicon\.svg$/, '') : '/'; }

  function activate(el, e) {
    if (el.hasAttribute('data-sm-toggle')) { var box = closest(el, '[data-sm]'); if (box) { e.preventDefault(); toggle(box); } return; }
    if (el.hasAttribute('data-ov')) { e.preventDefault(); openOverlay(el.getAttribute('data-ov'), stack.length > 0); return; }
    if (el.hasAttribute('data-close')) { e.preventDefault(); if (stack.length) closeOverlay(); else if (history.length > 1) history.back(); else location.href = home(); return; }
    if (el.hasAttribute('data-back')) { e.preventDefault(); if (stack.length) closeOverlay(); else if (history.length > 1 && d.referrer.indexOf(location.host) > -1) history.back(); else location.href = home(); return; }
    if (el.hasAttribute('data-href')) {
      e.preventDefault();
      var href = el.getAttribute('data-href');
      if (el.hasAttribute('data-ext')) window.open(href, '_blank', 'noopener');
      else if (href.charAt(0) === '#') { if (stack.length) closeOverlay(true); location.hash = href; }
      else location.href = href;
    }
  }
  // ---- carousel arrows: scroll the shelf that precedes the controls (RTL: "next" moves left) ----
  function shelfFor(ctr) {
    var p = ctr.parentElement;
    while (p) {
      var all = p.querySelectorAll('[data-scroll-x]'), best = null;
      for (var i = 0; i < all.length; i++) if (all[i].compareDocumentPosition(ctr) & 4) best = all[i];
      if (best) return best;
      p = p.parentElement;
    }
    return null;
  }
  function carState(ctr) {
    var sc = shelfFor(ctr); if (!sc) return;
    var max = sc.scrollWidth - sc.clientWidth, x = sc.scrollLeft;
    var bs = ctr.querySelectorAll('[data-car-btn]');
    for (var i = 0; i < bs.length; i++) {
      var dis = bs[i].getAttribute('data-car-btn') === 'next' ? x <= 2 : x >= max - 2;
      bs[i].setAttribute('aria-disabled', dis ? 'true' : 'false');
    }
  }
  function carousels() {
    var cs = d.querySelectorAll('[data-car]');
    for (var i = 0; i < cs.length; i++) (function (ctr) {
      var sc = shelfFor(ctr); if (!sc) return;
      sc.addEventListener('scroll', function () { carState(ctr); }, { passive: true });
      carState(ctr);
    })(cs[i]);
  }

  d.addEventListener('click', function (e) {
    var t = e.target;
    if (stack.length && t === stack[stack.length - 1]) { closeOverlay(); return; }   // click outside drawer / dialog
    var cb = closest(t, '[data-car-btn]');
    if (cb) {
      var ctr = closest(cb, '[data-car]'), sc = ctr && shelfFor(ctr);
      if (sc) { var step = Math.max(160, sc.clientWidth * 0.8); sc.scrollBy({ left: cb.getAttribute('data-car-btn') === 'next' ? -step : step, behavior: 'smooth' }); }
      return;
    }
    var a = closest(t, 'a[href]');
    var el = closest(t, '[data-sm-toggle],[data-ov],[data-close],[data-back],[data-href]');
    if (a && el && el.contains(a)) el = null;   // innermost wins
    if (el) { activate(el, e); return; }
    if (a && stack.length && a.getAttribute('href').charAt(0) === '#') closeOverlay(true);
  });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && stack.length) { closeOverlay(); return; }
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('[role=button],[role=link]')) {
      if (t.hasAttribute('data-car-btn')) { e.preventDefault(); t.click(); return; }
      activate(t, e);
    }
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) while (stack.length) closeOverlay(); });

  function init() {
    var tg = d.querySelectorAll('[data-sm] [data-sm-toggle]');
    for (var i = 0; i < tg.length; i++) tg[i].setAttribute('aria-expanded', 'false');
    shelves(); fit(); carousels();
    var m = location.hash.match(/^#ov=([\w-]+)$/); if (m) openOverlay(m[1]);
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { fit(); }, 60); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { fit(); });
})();
