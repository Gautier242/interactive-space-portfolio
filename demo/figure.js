/* FIGURE + PANEL BALANCE
 *
 * Two things the publication detail view was missing:
 *
 * 1. The figure could not be opened or saved. It is the whole point of a
 *    publication card and it was a dead <img> cropped into a fixed box.
 *    Tapping it now opens the largest file we ship in a new tab, where every
 *    browser's own "save image" works — no lightbox to build or maintain.
 *
 * 2. Opening a publication left the map at the same width, so the text and
 *    the figure fought for half the window. The map now yields while you
 *    read, and clicking empty space on it takes the room back.
 */
(function () {
  var img = document.getElementById('detailImg');
  var detail = document.getElementById('detailView');
  var left = document.getElementById('leftPanel');
  if (!img || !detail || !left) return;

  var isMobile = document.documentElement.classList.contains('mobile-device');

  // ---- 1. open the figure full size -------------------------------------
  // srcset picks a variant to fit the panel; the -1000 file is the largest
  // we ship, so ask for that one explicitly rather than whatever was chosen.
  function fullSrc() {
    var s = img.currentSrc || img.src || '';
    return s.replace(/-(?:400|640)\.webp$/, '-1000.webp');
  }
  img.style.cursor = 'zoom-in';
  img.setAttribute('title', 'Open the figure full size');
  img.addEventListener('click', function (e) {
    e.stopPropagation();
    var u = fullSrc();
    if (u) window.open(u, '_blank', 'noopener');
  });

  // ---- 2. give the reader room, and let them take it back ---------------
  if (isMobile) return;          // phone stacks the panels; nothing to balance

  var READING = '0 0 26%';       // while a publication is open
  var STUDY   = '0 0 62%';       // after clicking the map to enlarge it
  var enlarged = false;

  function apply(flex) {
    left.style.flex = flex;
    var f = window.onWindowResize;
    if (typeof f !== 'function') return;
    requestAnimationFrame(function () {
      f(); setTimeout(f, 60); setTimeout(f, 160); setTimeout(f, 320);
    });
  }

  function isOpen() { return detail.classList.contains('active'); }

  // app.js sets its own width when the detail opens or closes, and it does it
  // on a timer during the transition. Watch the panel instead of racing it.
  var wasOpen = false;
  new MutationObserver(function () {
    var open = isOpen();
    if (open === wasOpen) return;
    wasOpen = open;
    enlarged = false;
    if (open) apply(READING);
  }).observe(detail, { attributes: true, attributeFilter: ['class'] });

  // Clicking the map background — not a body, so selection still works —
  // swaps between reading the text and studying the map.
  left.addEventListener('click', function (e) {
    if (!isOpen()) return;
    if (e.target.closest('.controls, .obj-tag, .obj-toggle, .t3-layer, .t3-replay, .m-btn, .instructions-toggle')) return;
    // a click that selected something is handled by app.js; only bare
    // background clicks rebalance the panels
    if (window.__objReadout && window.__objReadout.subject) return;
    enlarged = !enlarged;
    apply(enlarged ? STUDY : READING);
  });

  window.__figure = { full: fullSrc, enlarge: function (on) { apply(on ? STUDY : READING); } };
})();
