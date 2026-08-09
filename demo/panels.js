/* Skin switcher. Flips [data-skin] on <html>; every skin is pure CSS over the
 * markup app.js already produces, so switching costs one attribute write. */
(function () {
  const SKINS = [
    ['',          'Original',  'the site as it ships today'],
    ['refined',   'Refined',   'the original done properly — large uncropped figures, click to enlarge'],
    ['dossier',   'Dossier',   'NASA technical report — numbered, tabular, dense'],
    ['journal',   'Journal',   'academic press — serif, airy, near-monochrome'],
    ['log',       'Log',       'instrument readout — monospace rows, expand on hover'],
    ['editorial', 'Editorial', 'magazine — full-bleed image, title on the scrim'],
    ['orbital',   'Orbital',   'images become planets, entries hang off an orbit track'],
  ];

  const start = new URLSearchParams(location.search).get('skin');
  const bar = document.createElement('div');
  bar.className = 'skin-bar';
  bar.innerHTML =
    `<span class="skin-lab">PANEL DESIGN</span>` +
    SKINS.map(([id, name]) =>
      `<button data-skin-id="${id}">${name}</button>`).join('') +
    `<span class="skin-note" id="skinNote"></span>`;
  document.body.appendChild(bar);

  const note = bar.querySelector('#skinNote');
  function apply(id) {
    if (id) document.documentElement.setAttribute('data-skin', id);
    else document.documentElement.removeAttribute('data-skin');
    bar.querySelectorAll('button').forEach(b =>
      b.classList.toggle('on', b.dataset.skinId === id));
    const row = SKINS.find(s => s[0] === id);
    note.textContent = row ? row[2] : '';
    // keep the URL shareable so a chosen skin can be sent to someone
    const u = new URL(location.href);
    id ? u.searchParams.set('skin', id) : u.searchParams.delete('skin');
    history.replaceState(null, '', u);
  }

  bar.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) apply(b.dataset.skinId);
  });

  // number keys 1-6 to flip quickly while comparing
  addEventListener('keydown', e => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= SKINS.length && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      apply(SKINS[n - 1][0]);
    }
  });

  apply(SKINS.some(s => s[0] === start) ? start : 'refined');

  // ---- figure lightbox --------------------------------------------------
  // These are diagrams and plots, not decoration. At panel width a dense
  // figure is unreadable however well it is laid out, so give it a way to
  // open full-size. Capture-phase click so it beats the card's own handler,
  // which would otherwise fly the camera and open the detail view.
  const lb = document.createElement('div');
  lb.className = 'fig-lightbox';
  lb.innerHTML = `<button class="fig-close" aria-label="Close figure">×</button>
                  <img alt=""><div class="fig-cap"></div>`;
  document.body.appendChild(lb);
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('.fig-cap');

  function close() { lb.classList.remove('open'); lbImg.src = ''; }
  lb.addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  document.addEventListener('click', e => {
    if (document.documentElement.getAttribute('data-skin') !== 'refined') return;
    const holder = e.target.closest('.pub-image');
    if (!holder) return;
    const img = holder.querySelector('img');
    if (!img || !img.src) return;
    e.preventDefault();
    e.stopPropagation();
    lbImg.src = img.src;
    lbCap.textContent = holder.closest('.pub-card')?.querySelector('.pub-title')?.textContent || '';
    lb.classList.add('open');
  }, true);
})();
