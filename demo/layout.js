/* LAYOUT — full screen for the map, and the visitor's own panel split.
 *
 * The split between the map and the reading panel used to be reset by the
 * page itself: opening a project (app.js, then figure.js), closing it
 * (app.js) and a click on the map background (figure.js). Once the visitor
 * drags the divider, that split is theirs: __layout.pinned stops all three,
 * and the right panel lays out at whatever width it was given. A "Reset
 * layout" button appears at the same moment and hands control back.
 *
 * Desktop only: the phone stacks the panels and has its own split stops.
 */
(function () {
  const L = window.__layout = { pinned: false, pin() {} };
  if (document.documentElement.classList.contains('mobile-device')) return;

  const left = document.getElementById('leftPanel');
  const detail = document.getElementById('detailView');
  if (!left) return;

  const ICON_FULL = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>';
  const ICON_EXIT = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 2v4H2M14 6h-4V2M10 14v-4h4M2 10h4v4"/></svg>';
  const ICON_RESET = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 8h13M4.5 5 1.5 8l3 3M11.5 5l3 3-3 3"/></svg>';

  const box = document.createElement('div');
  box.className = 'map-layout';
  box.innerHTML =
    '<button type="button" class="map-btn map-full"></button>' +
    '<button type="button" class="map-btn map-reset" hidden title="Put the map and the reading panel back to their default widths">' +
    ICON_RESET + '<span>Reset layout</span></button>';
  left.appendChild(box);
  const full = box.querySelector('.map-full');
  const reset = box.querySelector('.map-reset');

  // the canvas follows the panel (app.js panelResized); the list figures and
  // the final buffer size are settled once the 0.3 s flex ease is over
  function settle(mapPct) {
    if (typeof updateImageSizes === 'function') updateImageSizes(100 - mapPct);
    if (typeof onWindowResize === 'function') setTimeout(onWindowResize, 350);
  }

  L.pin = function () {
    if (L.pinned) return;
    L.pinned = true;
    reset.hidden = false;
  };

  reset.addEventListener('click', () => {
    L.pinned = false;
    reset.hidden = true;
    // the defaults: 26% while a project is open (figure.js READING), else
    // the stylesheet's 35% (main.css .left)
    const open = detail && detail.classList.contains('active');
    left.style.flex = open ? '0 0 26%' : '';
    settle(open ? 26 : 35);
  });

  function syncFull() {
    const on = document.fullscreenElement === left;
    full.innerHTML = (on ? ICON_EXIT : ICON_FULL) + '<span>' + (on ? 'Exit full screen' : 'Full screen') + '</span>';
    full.title = on ? 'Back to the map and the reading panel (Esc)' : 'Show the solar system on the whole screen';
  }
  syncFull();
  full.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (left.requestFullscreen) left.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    syncFull();
    if (typeof onWindowResize === 'function') onWindowResize();
  });
  // no Fullscreen API (older Safari on a desktop): no button
  if (!left.requestFullscreen) full.hidden = true;
})();
