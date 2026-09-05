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

  // ---- 1. controls out of the map, into their own dock underneath --------
  // They were absolutely positioned inside .left, covering ~46px of a 180px
  // map. .left keeps its own box, so onWindowResize() (which measures
  // leftPanel) still gets the right numbers with no change to app.js.
  var dock = document.createElement('div');
  dock.className = 'm-dock';
  if (controls) dock.appendChild(controls);
  left.parentNode.insertBefore(dock, left.nextSibling);

  // ---- 2. header links become icons --------------------------------------
  var ICONS = {
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
    ['about', 'About Me'], ['scholar', 'Google Scholar'],
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
  expand.innerHTML = EXPAND;
  expand.setAttribute('aria-label', 'Expand map to full screen');
  expand.setAttribute('aria-pressed', 'false');
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
    expand.innerHTML = full ? CLOSE : EXPAND;
    expand.setAttribute('aria-label', full ? 'Close full screen map'
                                           : 'Expand map to full screen');
    expand.setAttribute('aria-pressed', String(full));
    // Closing used to leave the map full-height: app.js writes inline heights
    // on the panel when a publication opens or closes, and those survived the
    // class going away. Clear them so the stylesheet decides again.
    if (!full) {
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

  function isRover() {
    try { return !!roverPOVMode; } catch (_) { return false; }
  }

  // ---- 5. tools: the control bar is hidden until asked for ---------------
  var tools = document.createElement('button');
  tools.type = 'button';
  tools.className = 'm-btn m-tools';
  tools.innerHTML = svg('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/>' +
    '<circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>');
  tools.setAttribute('aria-label', 'Show map controls');
  tools.setAttribute('title', 'Map controls');
  tools.setAttribute('aria-expanded', 'false');
  left.appendChild(tools);

  function setTools(on) {
    document.documentElement.classList.toggle('m-tools-on', !!on);
    tools.setAttribute('aria-expanded', String(!!on));
    tools.setAttribute('aria-label', on ? 'Hide map controls' : 'Show map controls');
  }
  onTap(tools, function () {
    setTools(!document.documentElement.classList.contains('m-tools-on'));
  });

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
        '<li>Tap <b>&#9881;</b> for play, pause, speed and reset.</li>' +
        '<li>Tap <b>&#10530;</b> to make the map full screen.</li>' +
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
        '<li>The buttons are in the control bar &#8212; tap the sliders icon if it is closed.</li>' +
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
  var STOPS = ['m-map', 'm-split', 'm-text'];   // 58vh / 40vh / 22vh
  var stop = 1;

  var split = document.createElement('div');
  split.className = 'm-split';
  split.innerHTML =
    '<button type="button" class="m-split-b" data-d="-1" aria-label="Show more map">' +
      svg('<path d="M6 14l6-6 6 6"/>') + '</button>' +
    '<span class="m-split-grip"></span>' +
    '<button type="button" class="m-split-b" data-d="1" aria-label="Show more text">' +
      svg('<path d="M6 10l6 6 6-6"/>') + '</button>';
  left.parentNode.insertBefore(split, dock.nextSibling);

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
    if (window.__cam && window.__cam.zoomBy) window.__cam.zoomBy(shrinking ? 1.16 : 0.86);
    reflow();
  }
  split.addEventListener('click', function (e) {
    var b = e.target.closest('.m-split-b');
    if (b && !b.disabled) setSplit(stop + (+b.dataset.d));
  });
  setSplit(1); stop = 1;
  document.documentElement.classList.add('m-split');

  // ---- 8. react to what the app does -------------------------------------
  var detail = document.getElementById('detailView');
  if (detail) {
    var wasOpen = false;
    new MutationObserver(function () {
      var open = detail.classList.contains('active');
      if (open === wasOpen) return;
      wasOpen = open;
      // A publication opening while the map is full screen used to render
      // underneath it (the map is position:fixed at z-index 400), so tapping
      // a body in full screen looked like nothing happened.
      if (open && full) setFull(false);
      if (open) setSplit(2);          // give the text the room
      else setSplit(1);
    }).observe(detail, { attributes: true, attributeFilter: ['class'] });
  }

  // VIPER's driving buttons live in the control bar, which is now behind the
  // gear — entering rover mode with them hidden left no way to drive.
  var rov = document.getElementById('roverControls');
  if (rov) {
    new MutationObserver(function () {
      if (rov.style.display && rov.style.display !== 'none') setTools(true);
    }).observe(rov, { attributes: true, attributeFilter: ['style'] });
  }

  window.addEventListener('orientationchange', reflow);
  document.addEventListener('mission:enter', function () { if (full) setFull(false); });

  window.__mobileMap = {
    setFull: setFull, isFull: function () { return full; },
    setTools: setTools
  };
})();
