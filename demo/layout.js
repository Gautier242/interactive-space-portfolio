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

  // Hover intent. The card opens beside the OBJECT after a short dwell, never
  // under the pointer, so a click on the object stays a click on the object.
  // It stays while the pointer is on the object, on the card, or on its way
  // between them, and goes GRACE ms after it is on neither. Resting on the
  // object IGNORED ms without going to the card reads as "not for me": the
  // card fades and stays away until the pointer leaves the object and
  // comes back.
  const DWELL = 150, GRACE = 350, IGNORED = 3000;
  let over;             // object with a project under the pointer (null: none)
  let snoozed = null;   // object whose card was ignored
  let onCard = false, tDwell = 0, tHide = 0, tIgnore = 0, tFade = 0;
  const ptr = [0, 0];   // pointer, panel px

  function fillCard(name) {
    const list = pubsFor(name), pub = list[0];
    shown = pub;
    card.innerHTML =
      '<img src="' + pub.img + '" srcset="' + (window.imgSrcset ? window.imgSrcset(pub.img) : '') + '" sizes="132px" alt="">' +
      '<span class="fs-txt"><b>' + pub.title + '</b><span>' + short(pub.summary || pub.desc) + '</span>' +
      '<em>' + (list.length > 1 ? list.length + ' projects here · ' : '') + 'Click to read the project →</em></span>';
  }

  // Beside the object, on the side with room; beside the pointer when the
  // object is too big for that; never under the pointer. Placed once: a card
  // that rode with Starship's hops slid away from the pointer on its way.
  function place() {
    const at = window.__objReadout.where(shown.body);
    if (!at) return;
    const w = card.offsetWidth, h = card.offsetHeight, W = left.clientWidth, H = left.clientHeight;
    let x = at.x1 + 18;
    if (x + w > W - 12) x = at.x0 - 18 - w;
    if (x < 12) x = ptr[0] + 28 + w > W - 12 ? ptr[0] - 28 - w : ptr[0] + 28;
    x = Math.min(Math.max(12, x), W - w - 12);
    let y = Math.min(Math.max(12, (at.y0 + at.y1) / 2 - h / 2), H - h - 12);
    if (ptr[0] >= x - 8 && ptr[0] <= x + w + 8 && ptr[1] >= y - 8 && ptr[1] <= y + h + 8) {
      y = ptr[1] + 28 + h > H - 12 ? ptr[1] - 28 - h : ptr[1] + 28;
    }
    card.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }

  function showCard(name) {
    clearTimeout(tFade);
    card.classList.remove('fs-fade');
    card.hidden = false;
    if (!shown || shown.body !== name) { fillCard(name); place(); }
    armIgnore();
  }
  function hideCard() {
    [tDwell, tHide, tIgnore, tFade].forEach(clearTimeout);
    card.hidden = true; card.classList.remove('fs-fade');
    shown = null; onCard = false;
  }
  function hideSoon() { clearTimeout(tHide); tHide = setTimeout(hideCard, GRACE); }
  function armIgnore() {
    clearTimeout(tIgnore);
    tIgnore = setTimeout(() => {
      if (onCard || !shown || over !== shown.body) return;
      snoozed = over;
      card.classList.add('fs-fade');
      tFade = setTimeout(hideCard, 300);
    }, IGNORED);
  }

  left.addEventListener('pointermove', e => {
    if (!isFull() || !window.__objReadout || !window.__objReadout.pick) return;
    if (card.contains(e.target)) return;
    const r = left.getBoundingClientRect();
    ptr[0] = e.clientX - r.left; ptr[1] = e.clientY - r.top;
    let n = window.__objReadout.pick((ptr[0] / r.width) * 2 - 1, -(ptr[1] / r.height) * 2 + 1);
    if (n && !pubsFor(n).length) n = null;
    if (n === over) return;
    if (over && over === snoozed) snoozed = null;    // left it: it may come back
    over = n;
    clearTimeout(tDwell); clearTimeout(tIgnore);
    if (!n || n === snoozed) { if (shown) hideSoon(); return; }
    if (shown && shown.body === n) { clearTimeout(tHide); armIgnore(); return; }
    tDwell = setTimeout(() => { if (over === n) { clearTimeout(tHide); showCard(n); } }, DWELL);
  });
  card.addEventListener('pointerenter', () => {
    onCard = true; over = undefined;                  // re-read on the way out
    clearTimeout(tHide); clearTimeout(tIgnore); clearTimeout(tFade);
    card.classList.remove('fs-fade');
  });
  card.addEventListener('pointerleave', () => { onCard = false; hideSoon(); });
  left.addEventListener('pointerleave', hideCard);
  // a click on the map flies the camera: the card would be left pointing at
  // where the object was. Close it; the dwell starts again from here.
  left.addEventListener('pointerdown', e => {
    if (card.contains(e.target)) return;
    hideCard(); over = undefined;
  });

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
      viaCard = true;
      document.addEventListener('fullscreenchange', () => setTimeout(go, 60), { once: true });
      document.exitFullscreen();
    } else go();
  }
  card.addEventListener('click', e => { e.stopPropagation(); if (shown) openPub(shown); });

  // Leaving full screen on the Moon by any other way than a card shows the
  // Moon's own paper (ESA, body Moon), the one entering the Moon selects:
  // clicks on Starship or LRO in full screen may have opened theirs behind.
  // The Moon itself is never offered as a card there: it is the ground.
  let viaCard = false;
  document.addEventListener('fullscreenchange', () => {
    if (isFull()) return;
    hideCard();
    const moonPub = typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive && !viaCard &&
                    pubsFor('Moon')[0];
    viaCard = false;
    if (moonPub && typeof showDetail === 'function') {
      showDetail(moonPub);
      if (typeof highlightPublication === 'function') highlightPublication('Moon');
    }
  });
})();
