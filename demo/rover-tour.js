/* ROVER TUTORIAL — the driving equivalent of the solar-system demo.
 *
 * Replaces the wall of text that appears when you take control of VIPER with
 * the same vocabulary used everywhere else: a compact pill, an icon, three
 * or four words, a ring on the control being described, and a ghost cursor.
 *
 * It arms itself when rover mode starts and stands down when it ends.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel) return;

  const KEY = 'roverTourSeen.v1';

  const ICONS = {
    fwd:  `<path d="M9 14.5V4"/><path d="M4.8 8 9 3.8 13.2 8"/>`,
    turn: `<path d="M4 9a5 5 0 1 1 5 5"/><path d="M6.5 11.5 4 9l2.5-2.5"/>`,
    look: `<circle cx="9" cy="9" r="2.2"/><path d="M1.6 9S4.4 3.8 9 3.8 16.4 9 16.4 9 13.6 14.2 9 14.2 1.6 9 1.6 9Z"/>`,
    exit: `<path d="M11 3.5H4.4v11H11"/><path d="M8.6 9h6"/><path d="M12.4 6.8 14.6 9l-2.2 2.2"/>`,
    spd:  `<path d="M3 12a6 6 0 1 1 12 0"/><path d="M9 12 12.2 7.6"/>`,
  };

  // Actually drive the rover while explaining the keys — app.js reads
  // roverState, which its own keydown handler sets, so pressing the real
  // keys is both the shortest path and the honest demonstration.
  const KEYS = { fwd: 'ArrowUp', back: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
  let held = null;
  // Hold with boost (spacebar). Unboosted the rover covers ~0.06 units in
  // 0.8s — real, but far too slow to read as movement inside one demo step.
  function holdKey(key, ms, boost) {
    releaseKey();
    held = key;
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    if (boost !== false) document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    setTimeout(releaseKey, ms);
  }
  function releaseKey() {
    document.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    if (!held) return;
    document.dispatchEvent(new KeyboardEvent('keyup', { key: held, bubbles: true }));
    held = null;
  }

  const STEPS = [
    { icon: 'fwd',  label: 'Drive with ↑ ↓ or these buttons', sel: '#btnRoverForward', ms: 5600,
      run: () => { holdKey(KEYS.fwd, 3000);
                   setTimeout(() => holdKey(KEYS.back, 1800), 3300); } },
    { icon: 'turn', label: 'Steer with ← →',                  sel: '#btnRoverLeft',    ms: 5200,
      run: () => { holdKey(KEYS.left, 2000);
                   setTimeout(() => holdKey(KEYS.right, 2000), 2400); } },
    { icon: 'spd',  label: 'Speed changes how fast you drive', sel: '#btnSpeed',       ms: 4400,
      run: () => holdKey(KEYS.fwd, 2600) },
    { icon: 'exit', label: 'Reset to leave VIPER',            sel: '#btnReset',        ms: 4000 },
  ];

  const layer = document.createElement('div');
  layer.className = 't3-layer rov-layer';
  layer.innerHTML = `
    <div class="t3-pill">
      <svg class="t3-icon" id="rovIcon" viewBox="0 0 18 18" fill="none"
           stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
           stroke-linejoin="round"></svg>
      <span class="t3-label" id="rovLabel"></span>
      <span class="t3-dots" id="rovDots"></span>
      <button class="t3-next" id="rovNext" type="button">Next
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor"
          stroke-width="1.7" stroke-linecap="round"><path d="M4 2.5 7.5 6 4 9.5"/></svg>
      </button>
      <button class="t3-skip" id="rovSkip" type="button">Skip</button>
    </div>
    <svg class="t3-ghost" id="rovGhost" width="26" height="30" viewBox="0 0 26 30">
      <path d="M2 1.4 L2 21 L7.2 16.4 L10.6 24.4 L13.8 23 L10.5 15.2 L17.4 14.8 Z"
            fill="#fff" stroke="#0b1426" stroke-width="1.3" stroke-linejoin="round"/>
    </svg>
    <div class="t3-halo" id="rovHalo"></div>`;
  panel.appendChild(layer);

  const iconEl = layer.querySelector('#rovIcon');
  const labelEl = layer.querySelector('#rovLabel');
  const dotsEl = layer.querySelector('#rovDots');
  const ghost = layer.querySelector('#rovGhost');
  const halo = layer.querySelector('#rovHalo');
  STEPS.forEach(() => dotsEl.appendChild(document.createElement('i')));

  let timer = null, idx = -1, live = false;

  function ringOn(sel) {
    const el = sel && panel.querySelector(sel);
    if (!el) { halo.classList.remove('on'); ghost.style.opacity = '0'; return; }
    const r = el.getBoundingClientRect(), p = panel.getBoundingClientRect();
    const cx = r.left - p.left + r.width / 2, cy = r.top - p.top + r.height / 2;
    halo.style.setProperty('--hw', Math.round(r.width + 12) + 'px');
    halo.style.setProperty('--hh', Math.round(r.height + 12) + 'px');
    halo.style.left = Math.round(cx) + 'px';
    halo.style.top = Math.round(cy) + 'px';
    halo.classList.add('on', 't3-halo-wide');
    ghost.style.transform = `translate(${Math.round(cx - 6)}px, ${Math.round(cy - 26)}px)`;
    ghost.style.opacity = '1';
  }

  function show(i) {
    releaseKey();          // Next must not leave the rover driving itself
    idx = i;
    if (i >= STEPS.length) return stop(true);
    const s = STEPS[i];
    iconEl.innerHTML = ICONS[s.icon];
    labelEl.textContent = s.label;
    [...dotsEl.children].forEach((d, n) => d.classList.toggle('on', n === i));
    ringOn(s.sel);
    if (s.run) s.run();
    clearTimeout(timer);
    timer = setTimeout(() => show(i + 1), s.ms);
  }

  function start() {
    // Restart from the top rather than bailing. Bailing meant clicking
    // "How to drive" mid-run did nothing at all.
    if (live) stop(false);
    live = true;
    layer.classList.add('on');
    show(0);
  }
  function stop(remember) {
    live = false;
    releaseKey();            // never leave the rover driving itself
    clearTimeout(timer);
    layer.classList.remove('on');
    halo.classList.remove('on');
    ghost.style.opacity = '0';
    if (remember) { try { localStorage.setItem(KEY, '1'); } catch (_) {} }
  }

  // Work from any state. If the tour has already finished, Next restarts it
  // rather than doing nothing — an unresponsive button reads as broken.
  layer.querySelector('#rovNext').addEventListener('click', e => {
    e.stopPropagation();
    clearTimeout(timer);
    if (!live) { start(); return; }
    show(idx + 1);
  });
  layer.querySelector('#rovSkip').addEventListener('click', e => {
    e.stopPropagation();
    stop(true);
  });

  // Suppress the original full-screen mission card and arm on rover mode.
  const css = document.createElement('style');
  css.textContent = '#missionIntro{display:none !important}';
  document.head.appendChild(css);

  // A brief, quiet hint instead of launching the whole tutorial unasked.
  const hint = document.createElement('div');
  hint.className = 'rov-hint';
  hint.innerHTML = `<b>Drive VIPER</b><span>Arrow keys to move · collect the rocks</span>`;
  panel.appendChild(hint);
  let hintT = null;
  function showHint() {
    clearTimeout(hintT);
    hint.classList.add('on');
    hintT = setTimeout(() => hint.classList.remove('on'), 3000);
  }

  let wasRover = false;
  (function watch() {
    requestAnimationFrame(watch);
    const now = typeof roverPOVMode !== 'undefined' && roverPOVMode &&
                typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive;
    if (now === wasRover) return;
    wasRover = now;
    // Entering rover mode no longer auto-runs the tutorial — it only hints
    // that the help exists. The tour runs when "How to drive" is clicked.
    if (now) setTimeout(showHint, 600);
    else { stop(false); hint.classList.remove('on'); }
  })();

  window.restartRoverTour = start;
})();
