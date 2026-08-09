/* INTERACTIVE TOUR — replaces the "HOW TO EXPLORE" banner.
 *
 * The banner was a wall of text covering the animation it described, shown
 * before the visitor had any reason to care. This teaches the same four
 * things as small bubbles anchored to the real control they talk about,
 * one at a time, over ~15 seconds, with the scene fully visible throughout.
 *
 * Rules it follows:
 *   - never cover the centre of the scene
 *   - one idea per bubble, one short sentence
 *   - advances on its own, but any interaction dismisses it immediately —
 *     a visitor who is already exploring does not need to be taught
 *   - runs once per visitor (localStorage), with a small always-available
 *     "?" to replay it
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel) return;

  const KEY = 'tourSeen.v1';

  // Retire the old banner + legend entirely.
  const oldBtn = panel.querySelector('.help-toggle-btn');
  const oldLegend = document.getElementById('legendText');
  if (oldBtn) oldBtn.style.display = 'none';
  if (oldLegend) { oldLegend.classList.remove('active', 'visible'); oldLegend.style.display = 'none'; }

  const STEPS = [
    {
      text: 'Objects with a marker are linked to my work. Click one to open the project.',
      anchor: () => firstReticleXY(),
      place: 'auto',
      ms: 5200,
    },
    {
      text: 'Drag to move around. Scroll to zoom in and out.',
      anchor: () => [panel.clientWidth / 2, panel.clientHeight * 0.62],
      place: 'above',
      ms: 4200,
      demo: dragHint,
    },
    {
      text: 'Play, pause or change how fast the planets move.',
      anchor: () => centreOf('.controls'),
      place: 'above',
      ms: 4200,
    },
    {
      text: 'Drag this divider to make the map bigger.',
      anchor: () => centreOf('#resizer'),
      place: 'left',
      ms: 4000,
    },
  ];

  function centreOf(sel) {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect(), p = panel.getBoundingClientRect();
    return [r.left - p.left + r.width / 2, r.top - p.top + r.height / 2];
  }

  // Point at whatever clickable body is actually on screen right now, so
  // step 1 refers to something the visitor can see rather than a fixed spot.
  function firstReticleXY() {
    if (typeof bodies === 'undefined') return null;
    const v = new THREE.Vector3();
    const w = panel.clientWidth, h = panel.clientHeight;
    const linked = (typeof PUBS !== 'undefined' ? PUBS : []).map(p => p.body);
    for (const name of linked) {
      const b = bodies[name];
      if (!b || !b.mesh) continue;
      b.mesh.getWorldPosition(v);
      v.project(camera);
      if (v.z > 1) continue;
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      if (x > 40 && x < w - 40 && y > 60 && y < h - 90) return [x, y];
    }
    return null;
  }

  // ---- DOM --------------------------------------------------------------
  const layer = document.createElement('div');
  layer.className = 'tour-layer';
  layer.innerHTML = `
    <div class="tour-bubble" id="tourBubble" role="status" aria-live="polite">
      <div class="tour-text" id="tourText"></div>
      <div class="tour-foot">
        <div class="tour-dots" id="tourDots"></div>
        <button class="tour-skip" id="tourSkip">Skip</button>
      </div>
      <span class="tour-arrow"></span>
    </div>
    <svg class="tour-ping" id="tourPing" width="46" height="46" viewBox="0 0 46 46">
      <circle cx="23" cy="23" r="9" class="tour-ping-core"/>
      <circle cx="23" cy="23" r="9" class="tour-ping-wave"/>
    </svg>
    <div class="tour-drag" id="tourDrag"><span></span></div>`;
  panel.appendChild(layer);

  const bubble = layer.querySelector('#tourBubble');
  const textEl = layer.querySelector('#tourText');
  const dotsEl = layer.querySelector('#tourDots');
  const ping = layer.querySelector('#tourPing');
  const dragEl = layer.querySelector('#tourDrag');

  STEPS.forEach(() => dotsEl.appendChild(document.createElement('i')));

  const replay = document.createElement('button');
  replay.className = 'tour-replay';
  replay.type = 'button';
  replay.title = 'How to explore';
  replay.setAttribute('aria-label', 'How to explore');
  replay.textContent = '?';
  panel.appendChild(replay);

  // ---- state ------------------------------------------------------------
  let idx = -1, timer = null, running = false;

  function position(step) {
    const xy = step.anchor();
    const w = panel.clientWidth, h = panel.clientHeight;
    if (!xy) { // anchor not on screen — centre low, no pointer
      bubble.style.left = Math.round(w / 2) + 'px';
      bubble.style.top = Math.round(h * 0.72) + 'px';
      bubble.dataset.place = 'none';
      ping.style.display = 'none';
      return;
    }
    let [x, y] = xy;
    ping.style.display = 'block';
    ping.style.transform = `translate(${Math.round(x - 23)}px, ${Math.round(y - 23)}px)`;

    let place = step.place;
    if (place === 'auto') place = y > h * 0.5 ? 'above' : 'below';
    bubble.dataset.place = place;

    // keep the bubble inside the panel; the arrow tracks the anchor
    const bw = bubble.offsetWidth || 210, bh = bubble.offsetHeight || 70;
    let bx = x, by = y;
    if (place === 'above') by = y - 26 - bh / 2;
    else if (place === 'below') by = y + 26 + bh / 2;
    else if (place === 'left') bx = x - 22 - bw / 2;
    bx = Math.max(bw / 2 + 8, Math.min(w - bw / 2 - 8, bx));
    by = Math.max(bh / 2 + 8, Math.min(h - bh / 2 - 62, by));
    bubble.style.left = Math.round(bx) + 'px';
    bubble.style.top = Math.round(by) + 'px';
    bubble.style.setProperty('--arrow-x', Math.round(x - (bx - bw / 2)) + 'px');
  }

  function show(i) {
    idx = i;
    if (i >= STEPS.length) return stop(true);
    const step = STEPS[i];
    textEl.textContent = step.text;
    [...dotsEl.children].forEach((d, n) => d.classList.toggle('on', n === i));
    dragEl.classList.remove('on');
    bubble.classList.remove('in');
    // reflow so the entry transition replays for each step
    void bubble.offsetWidth;
    bubble.classList.add('in');
    position(step);
    if (step.demo) step.demo();
    timer = setTimeout(() => show(i + 1), step.ms);
  }

  function dragHint() { dragEl.classList.add('on'); }

  function start() {
    if (running) return;
    running = true;
    layer.classList.add('on');
    replay.classList.remove('show');
    show(0);
    // Any real interaction means they are already exploring — get out of
    // the way. Capture phase, so we see it before the canvas handlers.
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t =>
      window.addEventListener(t, onInteract, { capture: true, passive: true }));
  }

  function onInteract(e) {
    if (e.target && e.target.closest && e.target.closest('.tour-replay')) return;
    stop(true);
  }

  function stop(remember) {
    running = false;
    clearTimeout(timer);
    layer.classList.remove('on');
    dragEl.classList.remove('on');
    replay.classList.add('show');
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t =>
      window.removeEventListener(t, onInteract, true));
    if (remember) { try { localStorage.setItem(KEY, '1'); } catch (_) {} }
  }

  layer.querySelector('#tourSkip').addEventListener('click', e => {
    e.stopPropagation();
    stop(true);
  });
  replay.addEventListener('click', e => { e.stopPropagation(); start(); });

  // keep the bubble glued to its anchor while planets move
  (function follow() {
    requestAnimationFrame(follow);
    if (running && idx >= 0 && idx < STEPS.length) position(STEPS[idx]);
  })();

  let seen = false;
  try { seen = !!localStorage.getItem(KEY); } catch (_) {}
  if (seen) replay.classList.add('show');
  else setTimeout(start, 1400);   // let the scene establish itself first

  window.restartTour = start;     // for the demo switcher
  // Demo/QA hook: hold a single step open so it can be inspected without
  // racing the auto-advance timer.
  window.tourShowStep = function (i) {
    clearTimeout(timer);
    running = true;
    layer.classList.add('on');
    replay.classList.remove('show');
    idx = i;
    const step = STEPS[i];
    textEl.textContent = step.text;
    [...dotsEl.children].forEach((d, n) => d.classList.toggle('on', n === i));
    bubble.classList.add('in');
    position(step);
    dragEl.classList.toggle('on', !!step.demo);
    return step.text;
  };
})();
