/* TUTORIAL v2 — demonstrate, don't explain.
 *
 * v1 was still four sentences. Nobody reads instructions on a portfolio.
 * This version SHOWS each gesture: a ghost cursor performs it while the
 * camera actually responds, so the visitor watches the scene do the thing
 * rather than reading about it. Text is 3-4 words per step, an icon carries
 * the rest.
 *
 * It also stays out of the way: bottom-centre, one compact pill, never over
 * the middle of the scene.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel) return;

  const KEY = 'tour2Seen.v1';

  // Retire the original banner + legend.
  const oldBtn = panel.querySelector('.help-toggle-btn');
  const oldLegend = document.getElementById('legendText');
  if (oldBtn) oldBtn.style.display = 'none';
  if (oldLegend) { oldLegend.classList.remove('active', 'visible'); oldLegend.style.display = 'none'; }

  const ICONS = {
    click: `<circle cx="9" cy="9" r="5.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2"/>`,
    drag:  `<path d="M3 9h12"/><path d="M6 6 3 9l3 3"/><path d="M12 6l3 3-3 3"/>`,
    zoom:  `<circle cx="8" cy="8" r="5"/><path d="M11.8 11.8 16 16"/><path d="M6 8h4M8 6v4"/>`,
    ctrl:  `<path d="M3 6h12M3 12h12"/><circle cx="7" cy="6" r="2"/><circle cx="11" cy="12" r="2"/>`,
  };

  const STEPS = [
    { icon: 'click', label: 'Click marked objects', ms: 4200, run: demoClick },
    { icon: 'drag',  label: 'Drag to look around',  ms: 4600, run: demoDrag },
    { icon: 'zoom',  label: 'Scroll to zoom',       ms: 4200, run: demoZoom },
    { icon: 'ctrl',  label: 'Control the animation', ms: 3800, run: demoControls },
  ];

  // ---- DOM --------------------------------------------------------------
  const layer = document.createElement('div');
  layer.className = 't2-layer';
  layer.innerHTML = `
    <div class="t2-pill" role="status" aria-live="polite">
      <svg class="t2-icon" id="t2Icon" viewBox="0 0 18 18" fill="none"
           stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></svg>
      <span class="t2-label" id="t2Label"></span>
      <span class="t2-dots" id="t2Dots"></span>
      <button class="t2-skip" id="t2Skip" type="button">Skip</button>
    </div>
    <svg class="t2-ghost" id="t2Ghost" width="26" height="30" viewBox="0 0 26 30">
      <path d="M2 1.4 L2 21 L7.2 16.4 L10.6 24.4 L13.8 23 L10.5 15.2 L17.4 14.8 Z"
            fill="#fff" stroke="#0b1426" stroke-width="1.3" stroke-linejoin="round"/>
    </svg>
    <svg class="t2-wheel" id="t2Wheel" width="20" height="30" viewBox="0 0 20 30">
      <rect x="3" y="3" width="14" height="24" rx="7" fill="none"
            stroke="#cfe2ff" stroke-width="1.4"/>
      <rect class="t2-wheel-dot" x="8.6" y="8" width="2.8" height="6" rx="1.4" fill="#cfe2ff"/>
    </svg>
    <div class="t2-halo" id="t2Halo"></div>`;
  panel.appendChild(layer);

  const iconEl = layer.querySelector('#t2Icon');
  const labelEl = layer.querySelector('#t2Label');
  const dotsEl = layer.querySelector('#t2Dots');
  const ghost = layer.querySelector('#t2Ghost');
  const wheel = layer.querySelector('#t2Wheel');
  const halo = layer.querySelector('#t2Halo');
  STEPS.forEach(() => dotsEl.appendChild(document.createElement('i')));

  const replay = document.createElement('button');
  replay.className = 't2-replay';
  replay.type = 'button';
  replay.title = 'How to explore';
  replay.setAttribute('aria-label', 'How to explore');
  replay.innerHTML = `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor"
      stroke-width="1.6" stroke-linecap="round"><path d="M6.6 6.4a2.5 2.5 0 1 1 2.6 3v1.6"/>
      <circle cx="9.2" cy="13.6" r=".9" fill="currentColor" stroke="none"/></svg>`;
  panel.appendChild(replay);

  // ---- helpers ----------------------------------------------------------
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  let raf = null, timer = null, running = false, idx = -1;

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

  function ghostTo(x, y, show) {
    ghost.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    ghost.style.opacity = show ? '1' : '0';
  }
  function hideProps() {
    ghost.style.opacity = '0';
    wheel.classList.remove('on');
    halo.classList.remove('on');
  }

  // Live screen position of a body — recomputed every frame, because the
  // planets keep orbiting during the demonstration. Sampling once left the
  // cursor and halo pointing at empty space a second later.
  const _v = new THREE.Vector3();
  function xyOf(mesh) {
    const w = panel.clientWidth, h = panel.clientHeight;
    mesh.getWorldPosition(_v);
    _v.project(camera);
    if (_v.z > 1) return null;
    return [(_v.x * 0.5 + 0.5) * w, (-_v.y * 0.5 + 0.5) * h];
  }

  // the first publication-linked body currently well inside the frame
  function markedBody() {
    if (typeof bodies === 'undefined') return null;
    const w = panel.clientWidth, h = panel.clientHeight;
    for (const p of (typeof PUBS !== 'undefined' ? PUBS : [])) {
      const b = bodies[p.body];
      if (!b || !b.mesh) continue;
      const xy = xyOf(b.mesh);
      if (!xy) continue;
      if (xy[0] > 60 && xy[0] < w - 60 && xy[1] > 70 && xy[1] < h - 120) return b.mesh;
    }
    return null;
  }

  // ---- the four demonstrations -----------------------------------------
  function demoClick() {
    const mesh = markedBody();
    const fallback = [panel.clientWidth * 0.6, panel.clientHeight * 0.4];
    const start = (mesh && xyOf(mesh)) || fallback;
    const from = [start[0] - 90, start[1] + 74];
    let landed = false;
    animate(1100, t => {
      // chase the body's CURRENT position, so the cursor and the halo stay
      // on the target however far it has orbited during the approach
      const to = (mesh && xyOf(mesh)) || fallback;
      ghostTo(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, true);
      halo.style.left = Math.round(to[0]) + 'px';
      halo.style.top = Math.round(to[1]) + 'px';
      if (t > .92 && !landed) {
        landed = true;
        halo.classList.add('on');
        ghost.classList.add('t2-press');
        setTimeout(() => ghost.classList.remove('t2-press'), 420);
      }
    }, () => {
      // keep both glued to the body for the rest of the step
      const hold = setInterval(() => {
        const to = mesh && xyOf(mesh);
        if (!to || !running) return clearInterval(hold);
        ghostTo(to[0], to[1], true);
        halo.style.left = Math.round(to[0]) + 'px';
        halo.style.top = Math.round(to[1]) + 'px';
      }, 60);
      setTimeout(() => clearInterval(hold), 3200);
    });
  }

  // Camera actually orbits, so the visitor sees what dragging does.
  function demoDrag() {
    const w = panel.clientWidth, h = panel.clientHeight;
    const y = h * 0.5, x0 = w * 0.28, x1 = w * 0.72;
    const F = window.__framing;
    if (F) F.suspend();
    const az0 = F ? F.getAz() : 0;
    ghostTo(x0, y, true);
    animate(2600, t => {
      ghostTo(x0 + (x1 - x0) * t, y, true);
      if (F) F.setAz(az0 - t * 0.55);          // scene follows the gesture
    }, () => { if (F) F.resume(true); });
  }

  // Camera actually dollies, then returns.
  function demoZoom() {
    const w = panel.clientWidth, h = panel.clientHeight;
    wheel.style.left = Math.round(w * 0.5 - 10) + 'px';
    wheel.style.top = Math.round(h * 0.44) + 'px';
    wheel.classList.add('on');
    const F = window.__framing;
    if (F) F.suspend();
    const p0 = camera.position.clone();
    animate(1500, t => {
      camera.position.copy(p0).multiplyScalar(1 - 0.22 * t);
    }, () => animate(1300, t => {
      camera.position.copy(p0).multiplyScalar(0.78 + 0.22 * t);
    }, () => { if (F) F.resume(true); }));
  }

  function demoControls() {
    const bar = panel.querySelector('.controls');
    if (!bar) return;
    const r = bar.getBoundingClientRect(), p = panel.getBoundingClientRect();
    halo.style.left = Math.round(r.left - p.left + r.width / 2) + 'px';
    halo.style.top = Math.round(r.top - p.top + r.height / 2) + 'px';
    halo.classList.add('on', 't2-halo-wide');
    halo.style.setProperty('--hw', Math.round(r.width + 16) + 'px');
    halo.style.setProperty('--hh', Math.round(r.height + 14) + 'px');
    const xy = [r.left - p.left + r.width * 0.28, r.top - p.top - 26];
    ghostTo(xy[0] + 60, xy[1] + 40, true);
    animate(900, t => ghostTo(xy[0] + 60 * (1 - t), xy[1] + 40 * (1 - t), true));
  }

  // ---- run --------------------------------------------------------------
  function show(i) {
    idx = i;
    if (i >= STEPS.length) return stop(true);
    const s = STEPS[i];
    iconEl.innerHTML = ICONS[s.icon];
    labelEl.textContent = s.label;
    [...dotsEl.children].forEach((d, n) => d.classList.toggle('on', n === i));
    halo.classList.remove('t2-halo-wide');
    hideProps();
    if (s.run) s.run();
    timer = setTimeout(() => show(i + 1), s.ms);
  }

  function start() {
    if (running) return;
    running = true;
    try { layer.classList.add('on'); } catch (_) {}
    replay.classList.remove('show');
    show(0);
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t =>
      window.addEventListener(t, onInteract, { capture: true, passive: true }));
  }

  function onInteract(e) {
    if (e.target && e.target.closest && e.target.closest('.t2-replay')) return;
    stop(true);
  }

  function stop(remember) {
    running = false;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    hideProps();
    layer.classList.remove('on');
    replay.classList.add('show');
    if (window.__framing) window.__framing.resume(true);
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t =>
      window.removeEventListener(t, onInteract, true));
    if (remember) { try { localStorage.setItem(KEY, '1'); } catch (_) {} }
  }

  layer.querySelector('#t2Skip').addEventListener('click', e => { e.stopPropagation(); stop(true); });
  replay.addEventListener('click', e => { e.stopPropagation(); start(); });

  let seen = false;
  try { seen = !!localStorage.getItem(KEY); } catch (_) {}
  if (seen) replay.classList.add('show');
  else setTimeout(start, 1600);

  window.restartTour = start;
  window.tourShowStep = i => { clearTimeout(timer); running = true;
    layer.classList.add('on'); replay.classList.remove('show'); show(i);
    clearTimeout(timer); return STEPS[i].label; };
})();
