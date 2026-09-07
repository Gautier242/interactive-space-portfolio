/* ==========================================================================
 * Mobile layout overlay.
 *
 * Runs only on a real phone (.mobile-device). A phone asking for the desktop
 * site does not get this file's DOM changes on purpose — it asked for the
 * desktop layout; what it gets instead is the touch handling in app.js and the
 * (pointer:coarse) rules in mobile.css, which make that layout operable.
 *
 * Everything here is additive DOM work, so deleting the script tag reverts it.
 * ========================================================================== */
(function () {
  if (!document.documentElement.classList.contains('mobile-device')) return;

  var app = document.querySelector('.app');
  var left = document.getElementById('leftPanel');
  var controls = document.querySelector('.left .controls');
  if (!app || !left) return;

  // ?fig=wide puts the figure full width above the text instead of beside it,
  // so the two card layouts can be compared on a real phone rather than
  // described. Default is the thumbnail. Temporary: drop this line and the
  // m-fig-wide block in mobile.css once the choice is made.
  if (new URLSearchParams(location.search).get('fig') === 'wide') {
    document.documentElement.classList.add('m-fig-wide');
  }

  // ---- 1. controls out of the map, into their own dock underneath --------
  // They were absolutely positioned inside .left, covering ~46px of a 180px
  // map. .left keeps its own box, so onWindowResize() (which measures
  // leftPanel) still gets the right numbers with no change to app.js.
  // The dock rides INSIDE the map, along its bottom edge, on the same line as
  // the expand button. As a band under the map it was another ~52px of
  // vertical space on a screen that has none to spare; over the map it costs
  // nothing, because the corners of a solar system are empty.
  var dock = document.createElement('div');
  dock.className = 'm-dock';
  if (controls) dock.appendChild(controls);
  left.appendChild(dock);

  // ---- 2. header links become icons --------------------------------------
  var ICONS = {
    home:                                      // house
      '<path d="M3.6 10.4 12 3.6l8.4 6.8"/>' +
      '<path d="M5.8 9.1V20h12.4V9.1"/>' +
      '<path d="M9.9 20v-5.5h4.2V20"/>',
    about:
      '<circle cx="12" cy="12" r="9.5"/><path d="M12 10.5v6.5"/>' +
      '<circle cx="12" cy="7.3" r="1.05" fill="currentColor" stroke="none"/>',
    scholar:                                   // mortarboard
      '<path d="M12 3.6 1.8 8.7 12 13.8l10.2-5.1z"/>' +
      '<path d="M5.9 11v4.4c0 1.4 2.7 2.6 6.1 2.6s6.1-1.2 6.1-2.6V11"/>',
    researchgate:                              // circled R, their own mark is
      '<circle cx="12" cy="12" r="9.5"/>' +    // trademarked artwork
      '<path d="M9.7 16.6V7.9h3a2.4 2.4 0 0 1 0 4.8h-3M13 12.7l3.2 3.9"/>',
    github:
      '<path d="M12 1.8a10.2 10.2 0 0 0-3.2 19.9c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10.2 10.2 0 0 0 12 1.8z" fill="currentColor" stroke="none"/>'
  };
  function svg(d) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
           'aria-hidden="true">' + d + '</svg>';
  }
  var linkIcon = [
    ['home', 'Home'], ['about', 'About Me'], ['scholar', 'Google Scholar'],
    ['researchgate', 'ResearchGate'], ['github', 'GitHub']
  ];
  var anchors = document.querySelectorAll('.header .links a');
  for (var i = 0; i < anchors.length; i++) {
    var key = linkIcon[i];
    if (!key) break;
    // keep the label reachable for screen readers and long-press
    anchors[i].setAttribute('aria-label', key[1]);
    anchors[i].setAttribute('title', key[1]);
    anchors[i].innerHTML = svg(ICONS[key[0]]);
  }

  // ---- 3. strip the readouts that do not earn their space ---------------
  // The date / "1.17 AU" corner readout means nothing without context, and
  // Object info drives a hover tag — there is no hover on a phone.
  document.documentElement.classList.add('m-noinfo');

  // ---- 4. expand the map to fullscreen -----------------------------------
  var EXPAND = svg('<path d="M14 4h6v6"/><path d="M20 4l-7.5 7.5"/>' +
                   '<path d="M10 20H4v-6"/><path d="M4 20l7.5-7.5"/>');
  var CLOSE  = svg('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>');

  var expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'm-btn m-expand';
  // A bare arrow glyph was not being found on the map. The word is: it says
  // what it does, and it is a wider target than a 34px icon square.
  expand.innerHTML = EXPAND + '<span class="m-expand-t">Full screen</span>';
  expand.setAttribute('aria-label', 'Expand map to full screen');
  expand.setAttribute('aria-pressed', 'false');
  // Top-right of the map. The bottom edge is where the browser's own toolbar
  // lives on a phone, which is what swallowed this button when it sat there;
  // the top edge is always visible.
  left.appendChild(expand);

  // The renderer reads leftPanel's box, so it must be told after the box
  // changes. One rAF is not enough on iOS — the fixed/100vh box settles a
  // frame or two later, same reason app.js re-fires after its own resize.
  function reflow() {
    var f = window.onWindowResize;
    if (typeof f !== 'function') return;
    requestAnimationFrame(function () {
      f(); setTimeout(f, 60); setTimeout(f, 180); setTimeout(f, 400);
    });
  }

  var full = false;
  function setFull(on) {
    full = !!on;
    document.documentElement.classList.toggle('m-full', full);
    expand.innerHTML = (full ? CLOSE : EXPAND) +
      '<span class="m-expand-t">' + (full ? 'Exit' : 'Full screen') + '</span>';
    expand.setAttribute('aria-label', full ? 'Close full screen map'
                                           : 'Expand map to full screen');
    expand.setAttribute('aria-pressed', String(full));
    // Closing used to leave the map full-height: app.js writes inline heights
    // on the panel when a publication opens or closes, and those survived the
    // class going away. Clear them so the stylesheet decides again.
    if (window.__mobileShowHeader) window.__mobileShowHeader();
    if (!full) {
      releasePending();
      // app.js writes inline sizing on this panel for the desktop row layout;
      // anything left behind keeps the map full-height after the class goes.
      left.style.height = ''; left.style.minHeight = ''; left.style.flex = '';
    }
    reflow();
  }

  // touchend + click, with the ghost-click guard app.js already uses for its
  // own mobile buttons (a bare click here fires ~300ms late or twice)
  var lastTap = 0;
  function onTap(el, fn) {
    el.addEventListener('touchend', function (e) {
      e.preventDefault(); lastTap = Date.now(); fn(e);
    }, { passive: false });
    el.addEventListener('click', function (e) {
      if (Date.now() - lastTap < 500) return;
      fn(e);
    });
  }
  onTap(expand, function () { setFull(!full); });

  // While the map is full screen, selecting a body should not yank you out of
  // it to read — but the choice must not be lost either. Hold the publication
  // and open it the moment full screen is left, so the thing you tapped is
  // the thing you end up reading.
  var pending = null;
  var rawShowDetail = window.showDetail;
  if (typeof rawShowDetail === 'function') {
    window.showDetail = function (item) {
      if (full && item && item.id !== 'about') { pending = item; return; }
      return rawShowDetail.apply(this, arguments);
    };
  }
  function releasePending() {
    if (!pending || typeof rawShowDetail !== 'function') return;
    var item = pending; pending = null;
    setTimeout(function () { rawShowDetail(item); }, 60);
  }

  function isRover() {
    try { return !!roverPOVMode; } catch (_) { return false; }
  }

  // ---- 5. the control bar is always visible ------------------------------
  // It used to hide behind a button. That was one more thing to discover
  // before you could press play, and the icon never read as "controls" — the
  // bar is translucent enough now that it does not crowd the map.
  function setTools(on) {
    document.documentElement.classList.toggle('m-tools-on', on !== false);
  }
  setTools(true);

  // ---- 6. "How to explore" is text on a phone, not a demo ---------------
  // The tour drives the real controls and reads as chaos on a 40vh map, so
  // tour3's replay button is hidden here (mobile.css) and this explains the
  // gestures instead — for the map AND the list, which nothing covered.
  var help = document.createElement('button');
  help.type = 'button';
  help.className = 'm-btn m-help';
  help.innerHTML = svg('<circle cx="12" cy="12" r="9.3"/><path d="M12 16.8v.01"/>' +
                       '<path d="M9.3 9.1a2.8 2.8 0 1 1 3 3.3v1"/>') +
                   '<span>How to explore</span>';
  help.setAttribute('aria-label', 'How to explore');
  left.appendChild(help);

  var sheet = document.createElement('div');
  sheet.className = 'm-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-label', 'How to explore');
  sheet.innerHTML =
    '<div class="m-sheet-card">' +
      '<div class="m-sheet-h">How to explore</div>' +
      '<div class="m-sheet-sec">The map</div>' +
      '<ul>' +
        '<li><b>Tap</b> an object in yellow brackets to open its project.</li>' +
        '<li><b>Drag one finger</b> to turn the view around.</li>' +
        '<li><b>Pinch</b> two fingers to zoom in and out.</li>' +
        '<li><b>Double-tap</b> to jump closer, and again to pull back.</li>' +
        '<li>Play, pause, speed and reset are in the bar under the map.</li>' +
        '<li>Tap <b class="m-ico-full"></b> to make the map full screen.</li>' +
      '</ul>' +
      '<div class="m-sheet-sec">The projects</div>' +
      '<ul>' +
        '<li><b>Scroll</b> the list under the map.</li>' +
        '<li><b>Tap a card</b> for the full description and the figure.</li>' +
        '<li>Opening one <b>moves the map</b> to the object it is about.</li>' +
        '<li><b>Tap the figure</b> to see it full size.</li>' +
      '</ul>' +
      '<button type="button" class="m-sheet-x">Got it</button>' +
    '</div>';
  document.body.appendChild(sheet);

  var MAP_HELP = sheet.querySelector('.m-sheet-card').innerHTML;
  var ROVER_HELP =
      '<div class="m-sheet-h">Driving VIPER</div>' +
      '<div class="m-sheet-sec">The rover</div>' +
      '<ul>' +
        '<li><b>&#8593; &#8595;</b> drive forwards and backwards.</li>' +
        '<li><b>&#8592; &#8594;</b> steer left and right.</li>' +
        '<li><b>Hold</b> a button to keep moving; let go to stop.</li>' +
        '<li><b>Drag one finger</b> on the view to look around while you drive.</li>' +
        '<li>The arrows are in the bar under the map.</li>' +
      '</ul>' +
      '<div class="m-sheet-sec">Leaving</div>' +
      '<ul>' +
        '<li>Tap <b>End traverse</b> to return to the Moon overview.</li>' +
        '<li>From there, tap <b>Earth</b> in the sky to come back to the map.</li>' +
      '</ul>' +
      '<button type="button" class="m-sheet-x">Got it</button>';

  function setSheet(on) {
    if (on) {
      // The tour explains a mouse-driven solar system; while you are driving
      // on the Moon that is the wrong help entirely.
      sheet.querySelector('.m-sheet-card').innerHTML = isRover() ? ROVER_HELP : MAP_HELP;
      onTap(sheet.querySelector('.m-sheet-x'), function () { setSheet(false); });
    }
    document.documentElement.classList.toggle('m-sheet-on', !!on);
  }
  onTap(help, function () { setSheet(true); });
  onTap(sheet.querySelector('.m-sheet-x'), function () { setSheet(false); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) setSheet(false); });

  // Centring on the Sun is done in framing.js (it zeroes its thirds-line
  // offset on mobile). Doing it here instead fought framing's idle drift,
  // which re-applies its own pose every frame.

  // ---- 7. trade space between the map and the text -----------------------
  // Three stops, driven by a slim bar between the two panels. Shrinking the
  // map re-aims at whatever is focused and pulls back a little, so the object
  // you were looking at stays centred and in frame instead of sliding out.
  // Three stops, all on the same control, because two tabs plus a chevron were
  // two ways to do one thing: trade map for text. A third LARGE stop was tried
  // once and removed for making the chevron unpredictable - this third one is
  // at the small end, where each press plainly means "less map".
  //   m-split = 36vh, the size the page opens at
  //   m-text  = 22vh, more room to read
  //   m-read  = closed, the list has the screen
  // The chevron points where the MAP EDGE moves: up shrinks it, down grows it.
  var STOPS = ['m-split', 'm-text', 'm-read'];
  var stop = 0;

  var split = document.createElement('div');
  split.className = 'm-split';
  split.innerHTML =
    '<button type="button" class="m-split-b" data-d="1" aria-label="Shrink the map, show more text">' +
      svg('<path d="M6 14l6-6 6 6"/>') + '</button>' +
    '<span class="m-split-grip"></span>' +
    '<button type="button" class="m-split-b" data-d="-1" aria-label="Grow the map">' +
      svg('<path d="M6 10l6 6 6-6"/>') + '</button>';
  // directly after the map. (Not relative to the dock: the dock is a CHILD
  // of the map now, so passing its sibling to left.parentNode threw.)
  left.parentNode.insertBefore(split, left.nextSibling);

  function setSplit(next) {
    next = Math.max(0, Math.min(STOPS.length - 1, next));
    if (next === stop) return;
    var shrinking = next > stop;
    stop = next;
    for (var i = 0; i < STOPS.length; i++) {
      document.documentElement.classList.toggle(STOPS[i], i === stop);
    }
    split.querySelectorAll('.m-split-b').forEach(function (b) {
      var d = +b.dataset.d;
      b.disabled = (d < 0 && stop === 0) || (d > 0 && stop === STOPS.length - 1);
    });
    // zoomBy pivots on the followed body when there is one and re-aims at it,
    // so this both keeps the subject centred and adds a little context.
    // the moon renderer is built lazily, so catch it whenever it appears
    if (typeof moonRenderer !== 'undefined') skipRender(moonRenderer);
    // zoomBy pivots on the followed body, so this keeps the subject centred
    // and adds a little context. Meaningless with the map closed.
    if (stop < STOPS.length - 1 &&
        window.__cam && window.__cam.zoomBy) window.__cam.zoomBy(shrinking ? 1.16 : 0.86);
    // onWindowResize measures 0 while the panel is closed and app.js guards
    // that, so the panel needs a real measurement on the way back out.
    reflow();
  }
  // Reset (and the Home link that fires it) means "back to how the page
  // opened", so the map/text split goes home too. Closing a publication
  // already does this via the observer below; this covers pressing it with
  // no publication open, where nothing else would restore the map.
  var resetBtn = document.getElementById('btnReset');
  if (resetBtn) resetBtn.addEventListener('click', function () { setSplit(0); });

  split.addEventListener('click', function (e) {
    var b = e.target.closest('.m-split-b');
    if (b && !b.disabled) setSplit(stop + (+b.dataset.d));
  });
  stop = -1; setSplit(0);        // apply the default stop and sync the buttons

  // ---- 8. react to what the app does -------------------------------------
  var detail = document.getElementById('detailView');
  if (detail) {
    var wasOpen = false;
    new MutationObserver(function () {
      var open = detail.classList.contains('active');
      if (open === wasOpen) return;
      wasOpen = open;
      // reading room while a publication is open, but never past the middle
      // stop: closing the map here would look like the map had vanished
      if (open) { if (stop < 1) setSplit(1); } else setSplit(0);
    }).observe(detail, { attributes: true, attributeFilter: ['class'] });
  }

  // VIPER's driving buttons live in the control bar, which is now behind the
  // gear — entering rover mode with them hidden left no way to drive.
  // The rover swaps the bar's contents; nothing to reveal now that it is
  // always on, but reflow so the taller row does not clip the map.
  var rov = document.getElementById('roverControls');
  if (rov) {
    new MutationObserver(reflow).observe(rov, { attributes: true, attributeFilter: ['style'] });
  }

  // ---- 9. hide the header while reading ---------------------------------
  // Both the page and the list can scroll on this layout, so track whichever
  // one moved rather than assuming. Down past the top edge hides the header;
  // any upward move brings it straight back.
  var lastY = 0, headHidden = false;
  function scrollTopOf(t) {
    if (!t || t === document || t === window) {
      return (document.scrollingElement || document.documentElement).scrollTop;
    }
    return t.scrollTop || 0;
  }
  function onScroll(e) {
    var y = scrollTopOf(e && e.target);
    if (y < 0) return;
    var dy = y - lastY;
    if (Math.abs(dy) < 6) return;          // ignore jitter and rubber-banding
    lastY = y;
    var want = dy > 0 && y > 40;
    if (want === headHidden) return;
    headHidden = want;
    document.documentElement.classList.toggle('m-hide-head', want);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  ['pubsList', 'detailView'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('scroll', onScroll, { passive: true });
  });
  var ps = document.querySelector('.pubs-scroll');
  if (ps) ps.addEventListener('scroll', onScroll, { passive: true });
  // the header must never be hidden while the map is what you are using
  function showHeader() {
    headHidden = false; lastY = 0;
    document.documentElement.classList.remove('m-hide-head');
  }
  window.__mobileShowHeader = showHeader;

  window.addEventListener('orientationchange', reflow);
  document.addEventListener('mission:enter', function () {
    if (full) setFull(false);
    if (stop === STOPS.length - 1) setSplit(0);   // the Moon needs a map
  });

  // ---- 10. closed map: stop rendering ------------------------------------
  // At the m-read stop the map is not on screen, so there is nothing for the
  // render to produce. The bloom pass alone is 1.80ms of every frame; the tick
  // loops are 33ms/s against the render loop's 209ms/s, so skipping the render
  // call drops the overwhelming majority of the cost. Real battery on a phone.
  function skipRender(obj) {
    if (!obj || obj.__readWrapped) return;
    obj.__readWrapped = true;
    var raw = obj.render.bind(obj);
    obj.render = function (sc, cam) {
      return document.documentElement.classList.contains('m-read')
        ? undefined : raw(sc, cam);
    };
  }
  if (typeof renderer !== 'undefined') skipRender(renderer);

  window.__mobileMap = {
    setFull: setFull, isFull: function () { return full; },
    setTools: setTools
  };
})();
