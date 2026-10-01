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

  replay.addEventListener('click', e => {
    e.stopPropagation();
    if (inRover()) {
      if (typeof window.restartRoverTour === 'function') window.restartRoverTour();
      return;
    }
    if (typeof toggleHelp === 'function') toggleHelp();
  });

  // The toolbar scales with the map, as its picture in the legend does. At
  // the default split (504 px map on a 1440 px screen) it is 368 px wide,
  // 73% of the map; keep that share as the divider or the window moves,
  // within 0.6x-1.3x so it never gets unreadable or oversized. Desktop only:
  // the phone bar is its own dock.
  const bar = panel.querySelector('.controls');
  if (bar && !document.documentElement.classList.contains('mobile-device')) {
    bar.style.transformOrigin = '50% 100%';
    const fit = () => {
      const w = bar.offsetWidth;            // layout width, unaffected by scale
      if (!w) return;
      const k = Math.min(1.3, Math.max(0.6, panel.clientWidth * 0.73 / w));
      bar.style.scale = k.toFixed(3);
    };
    new ResizeObserver(fit).observe(panel);
    fit();
  }

  // Every load opens the legend, so nobody has to discover the button first;
  // the toolbar lights up with it (tour3.css). It closes on the visitor's
  // first gesture anywhere else, so it never sits over the map once they have
  // started exploring. Not on a ?p= deep link, which was shared to show one
  // project, nor on phones, which use mobile.js.
  const mobile = document.documentElement.classList.contains('mobile-device');
  const deepLink = new URLSearchParams(location.search).has('p');
  if (legend && !mobile && !deepLink) {
    legend.classList.add('active');
    const GESTURES = ['pointerdown', 'wheel', 'keydown'];
    const close = e => {
      GESTURES.forEach(t => removeEventListener(t, close, true));
      // the button and the legend already toggle it themselves
      if (e.target && e.target.closest && e.target.closest('.t3-replay, #legendText')) return;
      legend.classList.remove('active');
    };
    GESTURES.forEach(t => addEventListener(t, close, { capture: true, passive: true }));
  }
})();
