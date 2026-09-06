/* SIBLING SWIPE — move between publications without going back to the list.
 *
 * On a phone the natural gesture for "next one" is a horizontal swipe, and it
 * is what Photos and Mail already do. The set has to stay small for that to
 * work, so a swipe moves within ONE institution group — 1 to 5 papers — never
 * through the whole list. That is also what keeps this working at 30 papers:
 * the number of groups grows, the number of siblings does not.
 *
 * Nobody discovers a swipe on their own, so the header carries "‹ 2 of 3 ›"
 * and those chevrons are real buttons. The gesture is the shortcut, not the
 * only way through.
 */
(function () {
  if (!document.documentElement.classList.contains('mobile-device')) return;
  var detail = document.getElementById('detailView');
  var header = document.querySelector('.detail-header');
  if (!detail || !header || typeof PUBS === 'undefined') return;

  // Siblings share an institution, in the order groupPublications() builds.
  function siblings(item) {
    return PUBS.filter(function (p) { return p.inst === item.inst; });
  }
  function current() {
    // showDetail does not record what it opened, so match on the title it wrote
    var t = document.getElementById('detailTitle');
    if (!t) return null;
    var txt = t.textContent.trim();
    return PUBS.find(function (p) { return p.title.trim() === txt; }) || null;
  }

  var nav = document.createElement('div');
  nav.className = 'm-sib';
  nav.innerHTML =
    '<button type="button" class="m-sib-b" data-d="-1" aria-label="Previous publication">&#8249;</button>' +
    '<span class="m-sib-n"></span>' +
    '<button type="button" class="m-sib-b" data-d="1" aria-label="Next publication">&#8250;</button>';
  header.appendChild(nav);

  function go(delta) {
    var item = current();
    if (!item) return;
    var group = siblings(item);
    if (group.length < 2) return;
    var i = group.indexOf(item);
    if (i < 0) return;
    // wrap inside the group; crossing into another institution on a swipe
    // would lose the reader's place in a way a swipe does not warn about
    var next = group[(i + delta + group.length) % group.length];
    if (typeof showDetail === 'function') showDetail(next);
    if (typeof highlightPublication === 'function' && next.body) {
      highlightPublication(next.body);
    }
  }

  // Writes must be idempotent AND must not be observed, or sync retriggers
  // itself. Both matter: this nav lives inside .detail-header, which is inside
  // #detailView, so observing #detailView's subtree for childList meant every
  // textContent write here fired the observer that had just called us. That
  // loop starved the event loop and hard-froze the page on every body click.
  var lastLabel = null, lastShown = null;
  var countEl = nav.querySelector('.m-sib-n');

  function sync() {
    var item = detail.classList.contains('active') && current();
    var group = item ? siblings(item) : [];
    // one paper in its institution has nothing to swipe to
    var show = group.length > 1;
    if (show !== lastShown) {
      nav.style.display = show ? '' : 'none';
      lastShown = show;
    }
    if (!show) return;
    var label = (group.indexOf(item) + 1) + ' of ' + group.length;
    if (label !== lastLabel) {
      countEl.textContent = label;
      lastLabel = label;
    }
  }

  // Watch the class (open/close) and the title only. #detailTitle is in
  // .detail-content, a sibling of the header this nav sits in, so nothing
  // sync() writes can be seen by either observer.
  new MutationObserver(sync).observe(detail, { attributes: true, attributeFilter: ['class'] });
  var titleEl = document.getElementById('detailTitle');
  if (titleEl) {
    new MutationObserver(sync).observe(titleEl, {
      childList: true, characterData: true, subtree: true
    });
  }
  sync();

  nav.addEventListener('click', function (e) {
    var b = e.target.closest('.m-sib-b');
    if (b) { e.stopPropagation(); go(+b.dataset.d); }
  });

  // ---- the gesture -------------------------------------------------------
  // Only a decisively horizontal drag counts. A publication description is
  // long and scrolling it must never flip the page, so the horizontal travel
  // has to beat the vertical by a clear margin, not merely exceed it.
  var MIN = 60, RATIO = 1.5;
  var x0 = 0, y0 = 0, live = false;

  detail.addEventListener('touchstart', function (e) {
    live = e.touches.length === 1;
    if (!live) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });

  detail.addEventListener('touchmove', function (e) {
    if (e.touches.length > 1) live = false;       // a pinch is not a swipe
  }, { passive: true });

  detail.addEventListener('touchend', function (e) {
    if (!live) return;
    live = false;
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    var dx = t.clientX - x0, dy = t.clientY - y0;
    if (Math.abs(dx) < MIN || Math.abs(dx) < Math.abs(dy) * RATIO) return;
    go(dx < 0 ? 1 : -1);                          // drag left = next
  }, { passive: true });

  window.__pubSwipe = { go: go, siblings: siblings, current: current };
})();
