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

  // ---- 3. expand the map to fullscreen -----------------------------------
  var EXPAND = svg('<path d="M14 4h6v6"/><path d="M20 4l-7.5 7.5"/>' +
                   '<path d="M10 20H4v-6"/><path d="M4 20l7.5-7.5"/>');
  var CLOSE  = svg('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>');

  var expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'm-expand';
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
      f(); setTimeout(f, 60); setTimeout(f, 180);
    });
  }

  var full = false;
  function setFull(on) {
    full = on;
    document.documentElement.classList.toggle('m-full', on);
    expand.innerHTML = on ? CLOSE : EXPAND;
    expand.setAttribute('aria-label', on ? 'Close full screen map'
                                         : 'Expand map to full screen');
    expand.setAttribute('aria-pressed', String(on));
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

  // leaving fullscreen when something else takes over the screen
  window.addEventListener('orientationchange', reflow);
  document.addEventListener('mission:enter', function () { if (full) setFull(false); });

  window.__mobileMap = { setFull: setFull, isFull: function () { return full; } };
})();
