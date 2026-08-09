/* TOOLBAR TOOLTIPS — short on hover; the demo does the long explaining.
 *
 * The buttons are glyphs with no labels, so a first-time visitor has to
 * guess. `title` attributes exist but appear after a ~1s OS delay, look
 * nothing like the rest of the UI, and never show on touch.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel) return;

  const TIPS = {
    btnReset:         'Reset the view',
    btnPause:         'Play / pause',
    btnSpeed:         'Animation speed',
    btnZoomIn:        'Zoom in',
    btnZoomOut:       'Zoom out',
    btnRotate:        'Orbit around the scene',
    btnPan:           'Drag to move the view',
    btnRoverForward:  'Drive forward',
    btnRoverBackward: 'Reverse',
    btnRoverLeft:     'Steer left',
    btnRoverRight:    'Steer right',
  };

  const tip = document.createElement('div');
  tip.className = 'tb-tip';
  panel.appendChild(tip);

  let shownFor = null;
  function show(el, text) {
    if (shownFor === el) return;
    shownFor = el;
    tip.textContent = text;
    tip.classList.add('on');
    const r = el.getBoundingClientRect(), p = panel.getBoundingClientRect();
    // measure after the text is set, then centre above the button and clamp
    const w = tip.offsetWidth;
    let x = r.left - p.left + r.width / 2 - w / 2;
    x = Math.max(6, Math.min(panel.clientWidth - w - 6, x));
    tip.style.transform =
      `translate(${Math.round(x)}px, ${Math.round(r.top - p.top - 34)}px)`;
  }
  function hide() { shownFor = null; tip.classList.remove('on'); }

  panel.addEventListener('pointerover', e => {
    const btn = e.target.closest('button[id]');
    if (!btn || !TIPS[btn.id]) return hide();
    // native tooltip would double up with ours
    if (btn.title) { btn.dataset.title = btn.title; btn.removeAttribute('title'); }
    show(btn, TIPS[btn.id]);
  });
  panel.addEventListener('pointerout', e => {
    const btn = e.target.closest('button[id]');
    if (btn && TIPS[btn.id]) hide();
  });
  panel.addEventListener('pointerdown', hide);
})();
