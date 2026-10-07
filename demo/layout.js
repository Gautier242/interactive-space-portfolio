/* LAYOUT — full screen for the map, and the visitor's own panel split.
 *
 * The split between the map and the reading panel used to be reset by the
 * page itself: opening a project (app.js, then figure.js), closing it
 * (app.js) and a click on the map background (figure.js). Once the visitor
 * drags the divider, that split is theirs: __layout.pinned stops all three,
 * and the right panel lays out at whatever width it was given. A "Reset
 * panel sizes" button appears at the same moment and hands control back.
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
    '<button type="button" class="map-btn map-reset" hidden title="Put the 3D map and the publications panel back to their default widths">' +
    ICON_RESET + '<span>Reset panel sizes</span></button>';
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

  // ---- full screen keeps the portfolio in view ------------------------------
  // With the reading panel gone, hovering a body that holds a project shows
  // a small card beside the pointer: its figure, title and one line. Only a
  // click on the card leaves full screen and opens the project; a click on
  // the body itself selects it and flies there as usual, in full screen, with
  // its project opened unseen behind. A quiet signature sits bottom left,
  // like a video's credit.
  const isFull = () => document.fullscreenElement === left;
  const pubsFor = name => (typeof PUBS !== 'undefined' ? PUBS : []).filter(p => p.body === name);
  const short = t => {
    const s = String(t || '').replace(/<[^>]+>/g, '');
    return s.length <= 120 ? s : s.slice(0, s.lastIndexOf(' ', 117)) + '…';
  };

  const sig = document.createElement('div');
  sig.className = 'fs-sign';
  sig.innerHTML = '<b>Gautier Bardi de Fourtou</b> · AI for space exploration · ' +
    (typeof PUBS !== 'undefined' ? PUBS.length : '') + ' projects on this map';
  left.appendChild(sig);

  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'fs-card';
  card.hidden = true;
  left.appendChild(card);
  let shown = null;   // the publication on the card

  function showCard(name, x, y) {
    const list = pubsFor(name);
    if (!list.length) return hideCard();
    const pub = list[0];
    if (!shown || shown.id !== pub.id) {
      shown = pub;
      card.innerHTML =
        '<img src="' + pub.img + '" srcset="' + (window.imgSrcset ? window.imgSrcset(pub.img) : '') + '" sizes="132px" alt="">' +
        '<span class="fs-txt"><b>' + pub.title + '</b><span>' + short(pub.summary || pub.desc) + '</span>' +
        '<em>' + (list.length > 1 ? list.length + ' projects here · ' : '') + 'Click to read the project →</em></span>';
    }
    card.hidden = false;
    // beside the pointer, flipped so it never leaves the screen
    const w = card.offsetWidth, h = card.offsetHeight;
    const px = x + 22 + w > innerWidth ? x - 22 - w : x + 22;
    const py = Math.min(Math.max(12, y - h / 2), innerHeight - h - 12);
    card.style.transform = 'translate(' + px + 'px,' + py + 'px)';
  }
  function hideCard() { card.hidden = true; shown = null; }

  left.addEventListener('pointermove', e => {
    if (!isFull() || !window.__objReadout || !window.__objReadout.pick) return;
    if (card.contains(e.target)) return;          // moving onto the card keeps it
    const r = left.getBoundingClientRect();
    const name = window.__objReadout.pick(((e.clientX - r.left) / r.width) * 2 - 1,
                                          -((e.clientY - r.top) / r.height) * 2 + 1);
    if (name) showCard(name, e.clientX, e.clientY); else hideCard();
  });
  left.addEventListener('pointerleave', hideCard);

  // open the project the way a list click does (detail view + flight). On the
  // Moon a list click would leave the Moon world (app.js), so there it opens
  // the project the way a click on the Moon object does, staying put.
  function openPub(pub) {
    const go = () => {
      if (typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive && typeof showDetail === 'function') {
        showDetail(pub);
        if (typeof highlightPublication === 'function') highlightPublication(pub.body);
        return;
      }
      const el = document.querySelector('.pub-card[data-id="' + pub.id + '"]');
      if (el) el.click();
      else if (typeof showDetail === 'function') showDetail(pub);
    };
    if (isFull()) {
      document.addEventListener('fullscreenchange', () => setTimeout(go, 60), { once: true });
      document.exitFullscreen();
    } else go();
  }
  card.addEventListener('click', e => { e.stopPropagation(); if (shown) openPub(shown); });

  document.addEventListener('fullscreenchange', () => { if (!isFull()) hideCard(); });
})();
