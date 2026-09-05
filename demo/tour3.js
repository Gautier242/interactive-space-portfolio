/* TUTORIAL — four different approaches, switchable.
 *
 *   guided     the current one: a pill + ghost cursor demonstrating each
 *              gesture while the camera actually responds. Auto-advances.
 *   hotspots   all three affordances marked at once with numbered pulses;
 *              the visitor points at whichever they are curious about.
 *              Self-paced, no sequence, nothing moves on its own.
 *   cinematic  a short scripted fly-through — wide, in to Earth, out to the
 *              controls — with captions, then hands over control.
 *   practice   asks the visitor to actually perform each gesture and ticks
 *              it off when they do. Teaches by doing rather than watching.
 *
 * Shared: bottom-centre pill (never over the middle of the scene), Next and
 * Skip, and a labelled help affordance to replay.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel) return;

  const P = new URLSearchParams(location.search);
  const MODE = P.get('tour') || 'guided';
  const KEY = 'tour3Seen.' + MODE;

  // Retire the original banner + legend.
  const oldBtn = panel.querySelector('.help-toggle-btn');
  const oldLegend = document.getElementById('legendText');
  if (oldBtn) oldBtn.style.display = 'none';
  if (oldLegend) { oldLegend.classList.remove('active', 'visible'); oldLegend.style.display = 'none'; }

  const ICONS = {
    click: `<circle cx="9" cy="9" r="5.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2"/>`,
    look:  `<circle cx="9" cy="9" r="2.2"/><path d="M1.6 9S4.4 3.8 9 3.8 16.4 9 16.4 9 13.6 14.2 9 14.2 1.6 9 1.6 9Z"/>`,
    exit:  `<path d="M5.5 5.5 12.5 12.5M12.5 5.5 5.5 12.5"/>`,
    drag:  `<path d="M3 9h12"/><path d="M6 6 3 9l3 3"/><path d="M12 6l3 3-3 3"/>`,
    zoom:  `<circle cx="8" cy="8" r="5"/><path d="M11.8 11.8 16 16"/><path d="M6 8h4M8 6v4"/>`,
    ctrl:  `<path d="M3 6h12M3 12h12"/><circle cx="7" cy="6" r="2"/><circle cx="11" cy="12" r="2"/>`,
    ok:    `<path d="M3.5 9.5 7 13l7.5-8"/>`,
  };

  // ---- DOM --------------------------------------------------------------
  const layer = document.createElement('div');
  layer.className = 't3-layer';
  layer.innerHTML = `
    <div class="t3-pill" role="status" aria-live="polite">
      <svg class="t3-icon" id="t3Icon" viewBox="0 0 18 18" fill="none"
           stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
           stroke-linejoin="round"></svg>
      <span class="t3-label" id="t3Label"></span>
      <span class="t3-dots" id="t3Dots"></span>
      <button class="t3-next" id="t3Next" type="button" title="Next">
        Next <svg viewBox="0 0 12 12" fill="none" stroke="currentColor"
          stroke-width="1.7" stroke-linecap="round"><path d="M4 2.5 7.5 6 4 9.5"/></svg>
      </button>
      <button class="t3-skip" id="t3Skip" type="button">Skip</button>
    </div>
    <svg class="t3-ghost" id="t3Ghost" width="26" height="30" viewBox="0 0 26 30">
      <path d="M2 1.4 L2 21 L7.2 16.4 L10.6 24.4 L13.8 23 L10.5 15.2 L17.4 14.8 Z"
            fill="#fff" stroke="#0b1426" stroke-width="1.3" stroke-linejoin="round"/>
    </svg>
    <svg class="t3-wheel" id="t3Wheel" width="20" height="30" viewBox="0 0 20 30">
      <rect x="3" y="3" width="14" height="24" rx="7" fill="none"
            stroke="#cfe2ff" stroke-width="1.4"/>
      <rect class="t3-wheel-dot" x="8.6" y="8" width="2.8" height="6" rx="1.4" fill="#cfe2ff"/>
    </svg>
    <div class="t3-halo" id="t3Halo"></div>
    <div class="t3-spots" id="t3Spots"></div>
    <div class="t3-caption" id="t3Caption"></div>`;
  panel.appendChild(layer);

  const iconEl = layer.querySelector('#t3Icon');
  const labelEl = layer.querySelector('#t3Label');
  const dotsEl = layer.querySelector('#t3Dots');
  const nextBtn = layer.querySelector('#t3Next');
  const ghost = layer.querySelector('#t3Ghost');
  const wheel = layer.querySelector('#t3Wheel');
  const halo = layer.querySelector('#t3Halo');
  const spots = layer.querySelector('#t3Spots');
  const caption = layer.querySelector('#t3Caption');

  // labelled help affordance — a bare "?" was not readable as "show me how"
  const replay = document.createElement('button');
  replay.className = 't3-replay';
  replay.type = 'button';
  replay.innerHTML =
    `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"
       stroke-linecap="round" stroke-linejoin="round">
       <circle cx="9" cy="9" r="7.2"/><path d="M9 12.6v.01"/>
       <path d="M6.9 6.7a2.2 2.2 0 1 1 2.3 2.6v.9"/></svg>
     <span>How to explore</span>`;
  panel.appendChild(replay);

  // ---- helpers ----------------------------------------------------------
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  let raf = null, timer = null, running = false, idx = -1, holdIv = null;
  // True while the tour is firing its own input events, so onInteract can
  // tell "the tour did this" from "the visitor did this".
  let synthetic = false;
  function asSynthetic(fn) {
    synthetic = true;
    try { fn(); } finally { setTimeout(() => { synthetic = false; }, 0); }
  }

  function animate(ms, fn, done) {
    const t0 = performance.now();
    cancelAnimationFrame(raf);
    (function step(now) {
      const t = Math.min(1, ((now || performance.now()) - t0) / ms);
      fn(ease(t), t);
      if (t < 1) raf = requestAnimationFrame(step);
      else if (done) done();
    })(t0);
  }

  const _v = new THREE.Vector3();
  function xyOf(mesh) {
    const w = panel.clientWidth, h = panel.clientHeight;
    mesh.getWorldPosition(_v); _v.project(camera);
    if (_v.z > 1) return null;
    return [(_v.x * 0.5 + 0.5) * w, (-_v.y * 0.5 + 0.5) * h];
  }
  function markedBody() {
    if (typeof bodies === 'undefined') return null;
    const w = panel.clientWidth, h = panel.clientHeight;
    for (const p of (typeof PUBS !== 'undefined' ? PUBS : [])) {
      const b = bodies[p.body];
      if (!b || !b.mesh) continue;
      const xy = xyOf(b.mesh);
      if (xy && xy[0] > 60 && xy[0] < w - 60 && xy[1] > 70 && xy[1] < h - 120) return b.mesh;
    }
    return null;
  }
  function centreOf(sel) {
    const el = panel.querySelector(sel) || document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect(), p = panel.getBoundingClientRect();
    return [r.left - p.left + r.width / 2, r.top - p.top + r.height / 2, r.width, r.height];
  }
  function ghostTo(x, y, show) {
    ghost.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    ghost.style.opacity = show ? '1' : '0';
  }
  function clearProps() {
    clearInterval(holdIv);
    ghost.style.opacity = '0';
    wheel.classList.remove('on');
    halo.classList.remove('on', 't3-halo-wide');
    caption.classList.remove('on');
  }
  function haloAt(x, y) {
    halo.style.left = Math.round(x) + 'px';
    halo.style.top = Math.round(y) + 'px';
    halo.classList.add('on');
  }
  function haloBox(sel) {
    const c = centreOf(sel); if (!c) return;
    halo.style.setProperty('--hw', Math.round(c[2] + 16) + 'px');
    halo.style.setProperty('--hh', Math.round(c[3] + 14) + 'px');
    halo.style.left = Math.round(c[0]) + 'px';
    halo.style.top = Math.round(c[1]) + 'px';
    halo.classList.add('on', 't3-halo-wide');
  }
  function trackBody(mesh) {
    clearInterval(holdIv);
    holdIv = setInterval(() => {
      const xy = mesh && xyOf(mesh);
      if (!xy || !running) return;
      ghostTo(xy[0], xy[1], true);
      haloAt(xy[0], xy[1]);
    }, 60);
  }

  // ---- demonstrations ----------------------------------------------------
  // Drive the REAL input paths rather than moving the camera ourselves.
  //
  // The old versions jumped: framing.setAz() calls place(), which rebuilds
  // the camera from framing.js's own canonical radius/azimuth and so snapped
  // back to the origin-centred (Sun) view, discarding wherever Reset had
  // left things. And position.multiplyScalar() scales toward the world
  // origin, i.e. zooms at the Sun rather than at what you are looking at.
  // Synthetic drag/wheel events go through the same handlers a visitor does,
  // so the demo starts from the current view and cannot jump.
  function demoDrag() {
    if (window.__framing) window.__framing.suspend();
    canvasDrag(170, 45, 2400);
  }

  function canvasWheel(steps, dir, gap) {
    const c = document.getElementById('canvas3d');
    if (!c) return;
    for (let i = 0; i < steps; i++) {
      setTimeout(() => asSynthetic(() => c.dispatchEvent(new WheelEvent('wheel', {
        deltaY: dir * 120, bubbles: true, cancelable: true,
      }))), i * gap);
    }
  }

  function demoZoom() {
    const w = panel.clientWidth, h = panel.clientHeight;
    wheel.style.left = Math.round(w * 0.5 - 10) + 'px';
    wheel.style.top = Math.round(h * 0.44) + 'px';
    wheel.classList.add('on');
    if (window.__framing) window.__framing.suspend();
    canvasWheel(5, -1, 130);                 // in
    setTimeout(() => {
      wheel.classList.add('on');             // keep the glyph up for the way out
      canvasWheel(5, 1, 130);
    }, 1900);
  }

  function demoControls() {
    haloBox('.controls');
    const c = centreOf('.controls'); if (!c) return;
    const tx = c[0] - c[2] * 0.22, ty = c[1] - c[3] - 14;
    animate(900, t => ghostTo(tx + 60 * (1 - t), ty + 40 * (1 - t), true));
  }

  // ---- MODE: guided -----------------------------------------------------
  // Walk the toolbar button by button, ringing each one as it is named, so
  // the icons stop being a guessing game.
  // Synthesise a drag on the 3D canvas so orbit and pan can be *shown*
  // working, not just named. app.js drives them from mousedown/mousemove/
  // mouseup on the canvas, so those are the events to emit.
  function canvasDrag(dx, dy, ms) {
    const c = document.getElementById('canvas3d');
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x0 = r.left + r.width * 0.5, y0 = r.top + r.height * 0.52;
    c.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x0, clientY: y0 }));
    const t0 = performance.now();
    (function step(now) {
      const t = Math.min(1, ((now || performance.now()) - t0) / ms);
      const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = x0 + dx * e, y = y0 + dy * e;
      document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
      ghostTo(x - r.left, y - r.top, true);
      if (t < 1) requestAnimationFrame(step);
      else document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    })(t0);
  }

  function press(sel) {
    const el = panel.querySelector(sel);
    if (el) el.click();
  }

  // Each toolbar step names the button AND operates it, so the visitor sees
  // the consequence rather than reading a label.
  const TOOLBAR = [
    // Press the real buttons, so the visitor sees the actual consequence.
    ['#btnPause',   'Pause — the planets stop',        () => press('#btnPause'), 1500],
    ['#btnPause',   'Play — and they start again',     () => press('#btnPause'), 1500],
    ['#btnSpeed',   'Speed — open the list of rates',  () => openSpeedMenu(),    1300],
    ['[data-speed="0.25"]', 'Pick a slower rate and everything eases off',
      () => pickSpeed('0.25'), 1900],   // 0.9s cursor travel then the click
    ['#btnZoomIn',  'Zoom in closer',                  () => dolly(0.82), 1400],
    ['#btnZoomOut', 'Zoom back out',                   () => dolly(1.22), 1400],
    ['#btnRotate',  'Orbit — then drag to swing around the system',
      () => { press('#btnRotate'); setTimeout(() => canvasDrag(150, 40, 1500), 400); }, 2300 ],
    ['#btnPan',     'Pan — drag to slide the view instead',
      () => { press('#btnPan'); setTimeout(() => canvasDrag(-140, -50, 1500), 400); }, 2300 ],
    ['#btnReset',   'Reset puts everything back',      () => press('#btnReset'), 1600],
  ];

  function openSpeedMenu() {
    const dd = document.getElementById('speedDropdown');
    if (dd) dd.classList.add('active');
    const b = document.getElementById('btnSpeed');
    if (b) b.classList.add('active');
  }
  // Walk the cursor down to the option and press it, so the visitor sees
  // WHICH rate is being chosen rather than the label just changing. No ring
  // here — the dropdown is already a small, obvious target and the box just
  // added clutter over it.
  function pickSpeed(val) {
    const opt = document.querySelector(`#speedDropdown [data-speed="${val}"]`);
    if (!opt) return;
    const r = opt.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const tx = r.left - p.left + r.width / 2, ty = r.top - p.top + r.height / 2;
    const btn = document.getElementById('btnSpeed');
    const br = btn ? btn.getBoundingClientRect() : r;
    const fx = br.left - p.left + br.width / 2, fy = br.top - p.top + br.height / 2;
    halo.classList.remove('on', 't3-halo-wide');

    animate(900, t => ghostTo(fx + (tx - fx) * t, fy + (ty - fy) * t, true));

    // Schedule the click on its own timer, NOT on animate()'s completion
    // callback: animate() owns a single shared rAF slot, so the next step's
    // zoom animation cancelled this one mid-flight and the click never fired
    // — the dropdown stayed open and the speed never changed.
    setTimeout(() => {
      ghost.classList.add('t3-press');
      setTimeout(() => ghost.classList.remove('t3-press'), 420);
      opt.click();
      const dd = document.getElementById('speedDropdown');
      if (dd) dd.classList.remove('active');
      if (btn) btn.classList.remove('active');
    }, 900);
  }

  // A second cursor at document level. The main ghost lives inside the left
  // panel, so it cannot travel to the publication's close button over in the
  // right panel; this one is positioned in viewport coordinates.
  const ghost2 = document.createElement('div');
  ghost2.className = 't3-ghost-fixed';
  ghost2.innerHTML = `<svg width="26" height="30" viewBox="0 0 26 30">
      <path d="M2 1.4 L2 21 L7.2 16.4 L10.6 24.4 L13.8 23 L10.5 15.2 L17.4 14.8 Z"
            fill="#fff" stroke="#0b1426" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
  document.body.appendChild(ghost2);

  function ghost2To(x, y, show) {
    ghost2.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    ghost2.style.opacity = show ? '1' : '0';
  }
  function hideGhost2() { ghost2.style.opacity = '0'; ghost2.classList.remove('t3-press'); }

  // Same reason as demoZoom: scaling position toward the world origin zooms
  // at the Sun, not at the current view.
  function dolly(k) {
    if (window.__framing) window.__framing.suspend();
    canvasWheel(4, k < 1 ? -1 : 1, 120);
  }
  function demoToolbar() {
    // The first two steps are "pause" then "play", which only read correctly
    // if the system is actually moving when they start. Force that, or a
    // visitor arriving from a paused state sees the labels inverted.
    if (typeof pausedPlanets !== 'undefined' && pausedPlanets) press('#btnPause');
    haloBox('.controls');
    let i = 0;
    clearInterval(holdIv);
    // Per-step timing: a button press is instant, a drag takes 1.9s. One
    // uniform interval meant the quick steps sat dead for two seconds.
    const run = () => {
      const [sel, text, act, ms] = TOOLBAR[i] || [];
      if (act) { try { act(); } catch (_) {} }
      const el = sel && panel.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect(), p = panel.getBoundingClientRect();
        const cx = r.left - p.left + r.width / 2, cy = r.top - p.top + r.height / 2;
        halo.classList.remove('t3-halo-wide');
        halo.style.setProperty('--hw', Math.round(r.width + 12) + 'px');
        halo.style.setProperty('--hh', Math.round(r.height + 10) + 'px');
        halo.style.left = Math.round(cx) + 'px';
        halo.style.top = Math.round(cy) + 'px';
        halo.classList.add('on', 't3-halo-wide');
        ghostTo(cx - 6, cy - 26, true);
        labelEl.textContent = text;
      }
      i++;
      // Chain on each step's own duration instead of a fixed interval.
      if (i < TOOLBAR.length) holdIv = setTimeout(run, ms || 1500);
    };
    run();
  }

  // STEP 1 — go straight to Earth and click it. No separate hover step: the
  // readout appears as the cursor arrives, so hovering is demonstrated on the
  // way to the click rather than as its own beat.
  function demoOpenEarth() {
    const mesh = bodies.Earth && bodies.Earth.mesh;
    if (!mesh) return;
    if (window.__objReadout) {
      window.__objReadout.setInfo(true, { silent: true });
    }
    const fb = [panel.clientWidth * 0.55, panel.clientHeight * 0.45];
    const start = xyOf(mesh) || fb;
    const from = [start[0] - 110, start[1] + 90];

    animate(1100, t => {
      const to = xyOf(mesh) || fb;
      ghostTo(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, true);
      haloAt(to[0], to[1]);
      // show the readout once the cursor is actually over it
      if (t > .55 && window.__objReadout && window.__objReadout.subject !== 'Earth') {
        window.__objReadout.show('Earth', { lock: true });
      }
    }, () => {
      trackBody(mesh);
      setTimeout(() => {
        ghost.classList.add('t3-press');
        setTimeout(() => ghost.classList.remove('t3-press'), 420);
        const pub = (typeof PUBS !== 'undefined' ? PUBS : []).find(p => p.body === 'Earth');
        if (pub && typeof showDetail === 'function') showDetail(pub);
      }, 700);
    });
  }

  // STEP 2 — close it again with the × and come back to the map, so the
  // visitor knows the publication view is not a dead end.
  function demoCloseDetail() {
    clearInterval(holdIv);
    clearProps();
    if (window.__objReadout) { window.__objReadout.release(); window.__objReadout.close(); }
    const x = document.querySelector('#detailView .detail-close');
    if (!x) return;
    const r = x.getBoundingClientRect();
    const tx = r.left + r.width / 2 - 8, ty = r.top + r.height / 2 - 8;

    // Hand over from the in-panel cursor at ITS current on-screen position.
    // Read it from the live rect rather than parsing the transform: the
    // previous step's trackBody interval keeps moving the ghost, so the
    // transform string could be a frame or two stale and the handover
    // showed as a small jump-and-return.
    const gr = ghost.getBoundingClientRect();
    const fx = gr.width ? gr.left : tx + 130;
    const fy = gr.width ? gr.top : ty + 90;
    ghost.style.opacity = '0';               // only one cursor on screen

    ghost2To(fx, fy, true);
    animate(1000, t => ghost2To(fx + (tx - fx) * t, fy + (ty - fy) * t, true), () => {
      ghost2.classList.add('t3-press');
      setTimeout(() => {
        ghost2.classList.remove('t3-press');
        if (typeof hideDetail === 'function') hideDetail();
        // Closing the detail alone leaves the camera still locked on Earth,
        // so the step's promise — "back to the map" — was not kept, and the
        // readout stayed suppressed by the focus rule. Reset the view too,
        // which is also the right starting point for the steps that follow.
        setTimeout(() => {
          const r = document.getElementById('btnReset');
          if (r) r.click();
        }, 250);
        setTimeout(hideGhost2, 400);
      }, 380);
    });
  }

  // Flow: open a project, close it, then stay in the map for the controls.
  // Durations are sized to each step's own animation plus a short beat —
  // they used to overrun it by 2s or more, leaving the screen dead while the
  // visitor waited for something to happen.
  const GUIDED = [
    { icon: 'click', label: 'Click an object in yellow brackets to open its project',
      ms: 4200, run: demoOpenEarth },   // 1.1s travel + 0.7s + detail opens
    { icon: 'exit',  label: 'Close it to come back to the map',
      ms: 3000, run: demoCloseDetail }, // 1.0s travel + 0.6s close/reset
    { icon: 'drag',  label: 'Drag to look around',     ms: 3000, run: demoDrag, puppet: true },  // 2.4s drag
    { icon: 'zoom',  label: 'Scroll to zoom',          ms: 3200, run: demoZoom, puppet: true },  // in, then out at 1.9s
    // sum of the toolbar sub-steps (15.2s) plus a beat
    { icon: 'ctrl',  label: 'The toolbar',             ms: 15800, run: demoToolbar, puppet: true },
  ];

  // ---- MODE: cinematic --------------------------------------------------
  const CINE = [
    { icon: 'zoom', label: 'A map of where I work', ms: 4200, run() {
        const F = window.__framing; if (F) F.suspend();
        const p0 = camera.position.clone();
        caption.textContent = 'Every object here is real, at real orbital speed.';
        caption.classList.add('on');
        animate(4000, t => { camera.position.copy(p0).multiplyScalar(1 + 0.10 * t);
          if (F) F.setAz(F.getAz() + 0.0015); });
      } },
    { icon: 'click', label: 'Objects hold projects', ms: 4600, run() {
        const mesh = markedBody();
        const F = window.__framing; if (F) F.suspend();
        caption.textContent = 'Marked objects open the work done there.';
        caption.classList.add('on');
        const p0 = camera.position.clone();
        animate(2400, t => camera.position.copy(p0).multiplyScalar(1 - 0.3 * t),
          () => { if (mesh) trackBody(mesh); });
      } },
    { icon: 'ctrl', label: 'You are in control', ms: 3800, run() {
        const F = window.__framing;
        caption.textContent = 'Drag, scroll, pause — explore however you like.';
        caption.classList.add('on');
        haloBox('.controls');
        if (F) F.resume(true);
      } },
  ];

  // ---- MODE: practice ---------------------------------------------------
  const PRACTICE = [
    { icon: 'drag', label: 'Try it: drag the map', done: false,
      hint() { const w = panel.clientWidth, h = panel.clientHeight;
        animate(2200, t => ghostTo(w * 0.34 + w * 0.3 * t, h * 0.5, true)); } },
    { icon: 'zoom', label: 'Now scroll to zoom', done: false,
      hint() { const w = panel.clientWidth, h = panel.clientHeight;
        wheel.style.left = Math.round(w * 0.5 - 10) + 'px';
        wheel.style.top = Math.round(h * 0.44) + 'px';
        wheel.classList.add('on'); } },
    { icon: 'click', label: 'Click a marked object', done: false,
      hint() { const m = markedBody(); if (m) trackBody(m); } },
  ];

  function practiceListeners(on) {
    const f = on ? addEventListener : removeEventListener;
    f.call(window, 'wheel', onWheel, { capture: true, passive: true });
    panel[on ? 'addEventListener' : 'removeEventListener']('pointerdown', onDown, true);
    panel[on ? 'addEventListener' : 'removeEventListener']('pointermove', onMove, true);
    panel[on ? 'addEventListener' : 'removeEventListener']('pointerup', onUp, true);
  }
  let downAt = null, dragged = 0;
  function onDown(e) { downAt = [e.clientX, e.clientY]; dragged = 0; }
  function onMove(e) { if (downAt) dragged += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0); }
  function onUp() {
    if (downAt && dragged > 40) satisfy(0);
    else if (downAt && dragged <= 4) satisfy(2);   // a tap, not a drag
    downAt = null;
  }
  function onWheel() { satisfy(1); }
  function satisfy(i) {
    if (MODE !== 'practice' || !running || i !== idx) return;
    PRACTICE[i].done = true;
    iconEl.innerHTML = ICONS.ok;
    labelEl.textContent = 'Nice.';
    clearProps();
    clearTimeout(timer);
    timer = setTimeout(() => show(i + 1), 900);
  }

  // On touch there is no mouse, no scroll wheel and no hover. The steps that
  // puppet the canvas dispatch MouseEvents (see canvasDrag/press below), which
  // the mobile touch handlers in app.js never receive — so on a phone those
  // steps animate nothing. Reword the copy and drop the puppeted steps rather
  // than narrate gestures that are not happening.
  const TOUCH = matchMedia('(pointer: coarse)').matches ||
                document.documentElement.classList.contains('mobile-device');
  const TOUCH_WORDS = [
    [/\bClick\b/g, 'Tap'], [/\bclick\b/g, 'tap'],
    [/\bDrag\b/g, 'Drag one finger'],
    [/\bScroll to zoom\b/g, 'Pinch to zoom'],
    [/\bscroll to zoom\b/g, 'pinch to zoom'],
    [/\bScroll\b/g, 'Pinch'], [/\bscroll\b/g, 'pinch']
  ];
  function touchify(steps) {
    if (!TOUCH) return steps;
    return steps
      .filter(st => !st.puppet)
      .map(st => {
        const copy = Object.assign({}, st);
        if (typeof copy.label === 'string') {
          TOUCH_WORDS.forEach(([re, to]) => { copy.label = copy.label.replace(re, to); });
        }
        return copy;
      });
  }

  function stepsFor(mode) {
    return touchify(mode === 'cinematic' ? CINE : mode === 'practice' ? PRACTICE : GUIDED);
  }

  // ---- MODE: hotspots ---------------------------------------------------
  const SPOTS = [
    { n: 1, label: 'Click marked objects to open a project',
      at: () => { const m = markedBody(); return m ? xyOf(m) : [panel.clientWidth * .6, panel.clientHeight * .35]; } },
    { n: 2, label: 'Drag one finger to look around · pinch to zoom',
      at: () => [panel.clientWidth * 0.5, panel.clientHeight * 0.62] },
    { n: 3, label: 'Play, pause and change speed here',
      at: () => { const c = centreOf('.controls'); return c ? [c[0], c[1] - c[3] / 2 - 22] : null; } },
  ];
  let spotEls = [];
  function buildSpots() {
    spots.innerHTML = '';
    spotEls = SPOTS.map(s => {
      const e = document.createElement('button');
      e.className = 't3-spot';
      e.type = 'button';
      e.innerHTML = `<span class="t3-spot-n">${s.n}</span>
                     <span class="t3-spot-tip">${s.label}</span>`;
      spots.appendChild(e);
      return e;
    });
    spots.classList.add('on');
  }
  (function spotTick() {
    requestAnimationFrame(spotTick);
    if (MODE !== 'hotspots' || !running) return;
    SPOTS.forEach((s, i) => {
      const e = spotEls[i]; if (!e) return;
      const xy = s.at();
      if (!xy) { e.style.display = 'none'; return; }
      e.style.display = 'flex';
      e.style.transform = `translate(${Math.round(xy[0])}px, ${Math.round(xy[1])}px)`;
      // Flip the tip to the left when the marker is near the right edge,
      // otherwise the label opens straight off the panel and is unreadable.
      e.classList.toggle('flip', xy[0] > panel.clientWidth * 0.5);
    });
  })();

  // ---- run --------------------------------------------------------------
  const STEPS = stepsFor(MODE);
  STEPS.forEach(() => dotsEl.appendChild(document.createElement('i')));

  function show(i) {
    idx = i;
    if (i >= STEPS.length) return stop(true);
    const s = STEPS[i];
    iconEl.innerHTML = ICONS[s.icon] || '';
    labelEl.textContent = s.label;
    [...dotsEl.children].forEach((d, n) => d.classList.toggle('on', n === i));
    clearProps();
    if (s.run) s.run();
    if (s.hint) s.hint();
    clearTimeout(timer);
    // practice waits for the visitor; the others advance themselves
    if (MODE !== 'practice') timer = setTimeout(() => show(i + 1), s.ms);
  }

  // Hide the visitor's real pointer while the demo drives its own, so there
  // are not two cursors on screen. Any real movement brings it straight back
  // — never trap someone without a pointer.
  function hideRealCursor(on) {
    document.body.classList.toggle('t3-hide-cursor', !!on);
  }
  addEventListener('pointermove', e => {
    if (document.body.classList.contains('t3-hide-cursor')) hideRealCursor(false);
  }, { passive: true });

  function start() {
    if (running) return;
    running = true;
    hideRealCursor(true);
    layer.classList.add('on');
    layer.dataset.mode = MODE;
    replay.classList.remove('show');

    if (MODE === 'hotspots') {
      buildSpots();
      iconEl.innerHTML = ICONS.click;
      labelEl.textContent = 'Point at a number';
      dotsEl.style.display = 'none';
      nextBtn.style.display = 'none';
      return;   // self-paced: nothing auto-advances, nothing auto-dismisses
    }
    show(0);
    if (MODE === 'practice') practiceListeners(true);
    else ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t =>
      addEventListener(t, onInteract, { capture: true, passive: true }));
  }

  function onInteract(e) {
    // The tour drives the real controls with synthetic events. Those bubble
    // to this same dismiss-on-interaction listener, so the zoom step was
    // ending the tour the moment it fired a wheel event — which is why it
    // stopped halfway and never reached the toolbar.
    if (synthetic) return;
    if (e.target && e.target.closest &&
        e.target.closest('.t3-replay, .t3-pill, .t3-spot')) return;
    stop(true);
  }

  function stop(remember) {
    running = false;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    clearProps();
    hideGhost2();
    hideRealCursor(false);
    // Leave the scene as the visitor should find it: no leftover readout,
    // hover unlocked, and back to normal speed — the tour sets 0.25x to
    // demonstrate the control and must not strand them there.
    if (window.__objReadout) {
      window.__objReadout.release();
      window.__objReadout.close();
    }
    const sp = document.querySelector('#speedDropdown [data-speed="1"]');
    if (sp && typeof animationSpeed !== 'undefined' && animationSpeed !== 1) sp.click();
    layer.classList.remove('on');
    spots.classList.remove('on');
    replay.classList.add('show');
    if (window.__framing) window.__framing.resume(true);
    practiceListeners(false);
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t =>
      removeEventListener(t, onInteract, true));
    if (remember) { try { localStorage.setItem(KEY, '1'); } catch (_) {} }
  }

  nextBtn.addEventListener('click', e => {
    e.stopPropagation();
    clearTimeout(timer);
    show(idx + 1);
  });
  layer.querySelector('#t3Skip').addEventListener('click', e => { e.stopPropagation(); stop(true); });
  // The help button follows the context: driving VIPER needs driving help,
  // not a tour of the solar-system controls.
  const replayLabel = replay.querySelector('span');
  function inRover() {
    return typeof roverPOVMode !== 'undefined' && roverPOVMode &&
           typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive;
  }
  (function syncHelp() {
    requestAnimationFrame(syncHelp);
    const rover = inRover();
    const want = rover ? 'How to drive' : 'How to explore';
    if (replayLabel.textContent !== want) replayLabel.textContent = want;
  })();

  replay.addEventListener('click', e => {
    e.stopPropagation();
    if (inRover()) {
      if (typeof window.restartRoverTour === 'function') window.restartRoverTour();
      return;
    }
    // Always begin from the wide solar-system view. The tour talks about
    // orbits, the toolbar and clickable bodies, none of which exist on the
    // Moon surface — and it must show Earth, which needs the reset framing.
    const wasOnMoon = typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive;
    const reset = document.getElementById('btnReset');
    if (reset) reset.click();
    setTimeout(start, wasOnMoon ? 900 : 350);
  });

  let seen = false;
  try { seen = !!localStorage.getItem(KEY); } catch (_) {}
  // Never auto-start, on any device. The tour takes over the screen and drives
  // the real controls; arriving visitors were getting it before they had
  // looked at anything. It runs only when asked, from "How to explore".
  // (`seen` is still read so an older stored flag does not hide the button.)
  void seen;
  replay.classList.add('show');

  window.restartTour = start;
  window.tourShowStep = i => { clearTimeout(timer); running = true;
    layer.classList.add('on'); layer.dataset.mode = MODE;
    replay.classList.remove('show'); show(i); clearTimeout(timer);
    return STEPS[i] && STEPS[i].label; };
})();
