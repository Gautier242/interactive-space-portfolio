/* HOW TO EXPLORE — a labelled button that opens a short text legend.
 *
 * This used to launch a guided demo that drove the real camera. It read as
 * lag: its zoom was 18 instant camera jumps (the wheel handler applies the
 * whole step in one event) and the toolbar step fired nine actions in 15.8 s.
 * Text cannot stutter, so the demo is gone and the original legend
 * (#legendText, index.html) is back, shortened.
 *
 * The rover tour (rover-tour.js) still reuses the .t3-* pill styles.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel) return;
  const legend = document.getElementById('legendText');

  // labelled help affordance: a bare "?" was not readable as "show me how"
  const replay = document.createElement('button');
  replay.className = 't3-replay show';
  replay.type = 'button';
  replay.setAttribute('aria-controls', 'legendText');
  replay.innerHTML =
    `<svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"
       stroke-linecap="round" stroke-linejoin="round">
       <circle cx="9" cy="9" r="7.2"/><path d="M9 12.6v.01"/>
       <path d="M6.9 6.7a2.2 2.2 0 1 1 2.3 2.6v.9"/></svg>
     <span>How to explore</span>`;
  panel.appendChild(replay);

  // The help button follows the context: driving VIPER needs driving help,
  // not the solar-system legend.
  const replayLabel = replay.querySelector('span');
  function inRover() {
    return typeof roverPOVMode !== 'undefined' && roverPOVMode &&
           typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive;
  }
  (function syncHelp() {
    requestAnimationFrame(syncHelp);
    const want = inRover() ? 'How to drive' : 'How to explore';
    if (replayLabel.textContent !== want) replayLabel.textContent = want;
    if (legend) replay.setAttribute('aria-expanded', legend.classList.contains('active'));
  })();

  const KEY = 'helpSeen';
  function remember() { try { localStorage.setItem(KEY, '1'); } catch (_) {} }

  replay.addEventListener('click', e => {
    e.stopPropagation();
    remember();
    if (inRover()) {
      if (typeof window.restartRoverTour === 'function') window.restartRoverTour();
      return;
    }
    if (typeof toggleHelp === 'function') toggleHelp();
  });
  if (legend) legend.addEventListener('click', remember);

  // First visit: open the legend so nobody has to discover the button first.
  // It closes on the visitor's first gesture anywhere else, so it never sits
  // over the map once they have started exploring. Phones use mobile.js.
  let seen = false;
  try { seen = !!localStorage.getItem(KEY); } catch (_) {}
  const mobile = document.documentElement.classList.contains('mobile-device');
  if (!seen && legend && !mobile) {
    legend.classList.add('active');
    // and point at the toolbar, the other thing a newcomer has to find
    const bar = panel.querySelector('.controls');
    if (bar) {
      bar.classList.add('first-look');
      // its buttons' own animations bubble here too, so check the target
      bar.addEventListener('animationend', e => {
        if (e.target === bar) bar.classList.remove('first-look');
      });
    }
    const GESTURES = ['pointerdown', 'wheel', 'keydown'];
    const close = e => {
      GESTURES.forEach(t => removeEventListener(t, close, true));
      remember();
      // the button and the legend already toggle it themselves
      if (e.target && e.target.closest && e.target.closest('.t3-replay, #legendText')) return;
      legend.classList.remove('active');
    };
    GESTURES.forEach(t => addEventListener(t, close, { capture: true, passive: true }));
  }
})();
