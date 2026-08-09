/* AI MOTIF — in the header banner, beside the name.
 *
 * "Flow" reads as the actual pipeline this portfolio is about: observation
 * data goes in, a network processes it, a prediction comes out. A wide short
 * banner is the right shape for it — left to right IS the story.
 *
 * It sits in the header's clear middle zone: the name occupies the left, the
 * links the right, so the graphic is masked to fade out before it reaches
 * either. The right panel is left with no background at all.
 */
(function () {
  const host = document.getElementById('headerNeural');
  const header = document.querySelector('.header');
  if (!host || !header) return;

  const rightPanelBg = document.getElementById('rightNeural');
  if (rightPanelBg) rightPanelBg.innerHTML = '';   // right panel stays clean

  const NS = 'http://www.w3.org/2000/svg';
  const el = (n, a) => { const e = document.createElementNS(NS, n);
    for (const k in a) e.setAttribute(k, a[k]); return e; };

  function lattice(layers, x0, x1, h, padY) {
    return layers.map((count, li) => {
      const x = x0 + (x1 - x0) * (layers.length === 1 ? .5 : li / (layers.length - 1));
      return Array.from({ length: count }, (_, ni) => ({
        x, y: padY + (h - padY * 2) * (count === 1 ? .5 : ni / (count - 1)),
      }));
    });
  }

  // Horizontal mask: the motif must not run under the name or the links.
  function fadeMask(svg, id, w, stops) {
    const defs = el('defs', {});
    const g = el('linearGradient', { id: id + 'g', x1: '0', y1: '0', x2: '1', y2: '0' });
    stops.forEach(([o, a]) => g.appendChild(
      el('stop', { offset: o, 'stop-color': '#fff', 'stop-opacity': a })));
    defs.appendChild(g);
    const m = el('mask', { id });
    m.appendChild(el('rect', { x: 0, y: 0, width: w, height: 400, fill: `url(#${id}g)` }));
    defs.appendChild(m);
    svg.appendChild(defs);
  }

  const VARIANTS = {
    off() { host.innerHTML = ''; },

    // observation grid → network → predicted spectrum
    flow() {
      const w = header.clientWidth || 1400, h = header.clientHeight || 78;
      host.innerHTML = '';
      const svg = el('svg', { width: '100%', height: '100%',
        viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none',
        style: 'display:block' });
      fadeMask(svg, 'nnFlowMask', w,
        [['0', '0'], ['0.30', '0'], ['0.42', '.85'], ['0.72', '.85'], ['0.86', '0'], ['1', '0']]);
      const g = el('g', { mask: 'url(#nnFlowMask)' });

      const midY = h / 2;
      const startX = Math.round(w * 0.34);

      // input: a small observation raster
      const cell = Math.max(4, Math.min(6, Math.floor((h - 26) / 6)));
      const gridW = cell * 6;
      for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
        g.appendChild(el('rect', {
          x: startX + c * cell, y: midY - gridW / 2 + r * cell,
          width: cell - 1, height: cell - 1, fill: '#9ec9ff',
          opacity: (.1 + Math.random() * .42).toFixed(3),
        }));
      }

      // network
      const nx0 = startX + gridW + 34;
      const nx1 = nx0 + Math.max(90, w * 0.11);
      const cols = lattice([4, 6, 4], nx0, nx1, h, 14);
      for (let i = 0; i < cols.length - 1; i++)
        cols[i].forEach(a => cols[i + 1].forEach(b => g.appendChild(
          el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#9ec9ff',
            'stroke-width': .8, opacity: (.1 + Math.random() * .26).toFixed(3) }))));
      cols.forEach((c, li) => c.forEach(p => g.appendChild(
        el('circle', { cx: p.x, cy: p.y, r: 2.6,
          fill: li === cols.length - 1 ? '#ffd27f' : '#9ec9ff',
          opacity: li === cols.length - 1 ? .85 : .7 }))));

      // arrows marking direction of inference
      [[startX + gridW + 10, nx0 - 12], [nx1 + 12, nx1 + 30]].forEach(([a, b]) => {
        g.appendChild(el('path', {
          d: `M${a} ${midY} L${b} ${midY} M${b - 4} ${midY - 3} L${b} ${midY} L${b - 4} ${midY + 3}`,
          stroke: '#9ec9ff', 'stroke-width': 1, fill: 'none', opacity: .35,
        }));
      });

      // output: predicted spectrum
      const ox = nx1 + 36, ow = Math.max(84, w * 0.09);
      let d = '';
      for (let i = 0, n = 54; i <= n; i++) {
        const t = i / n, x = ox + t * ow;
        const y = midY - Math.sin(t * Math.PI * 2.1) * (h * 0.26) * (1 - t * .4)
                      - Math.sin(t * 11) * (h * 0.03);
        d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      }
      g.appendChild(el('path', { d, fill: 'none', stroke: '#ffd27f',
        'stroke-width': 1.7, opacity: .8, 'stroke-linecap': 'round' }));

      svg.appendChild(g);
      host.appendChild(svg);
    },

    // the original idea, but legible: a clean layered MLP in the clear zone
    network() {
      const w = header.clientWidth || 1400, h = header.clientHeight || 78;
      host.innerHTML = '';
      const svg = el('svg', { width: '100%', height: '100%',
        viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none', style: 'display:block' });
      fadeMask(svg, 'nnNetMask', w,
        [['0', '0'], ['0.28', '0'], ['0.40', '.8'], ['0.74', '.8'], ['0.88', '0'], ['1', '0']]);
      const g = el('g', { mask: 'url(#nnNetMask)' });
      const cols = lattice([4, 7, 7, 5, 3], w * 0.32, w * 0.80, h, 12);
      for (let i = 0; i < cols.length - 1; i++)
        cols[i].forEach(a => cols[i + 1].forEach(b => g.appendChild(
          el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#9ec9ff',
            'stroke-width': .7, opacity: (.07 + Math.random() * .22).toFixed(3) }))));
      cols.forEach((c, li) => c.forEach(p => g.appendChild(
        el('circle', { cx: p.x, cy: p.y, r: 2.4,
          fill: li === cols.length - 1 ? '#ffd27f' : '#9ec9ff', opacity: .68 }))));
      svg.appendChild(g);
      host.appendChild(svg);
    },
  };

  const ORDER = [
    ['network', 'Network',  'a clean layered MLP in the header band'],
    ['flow',    'Flow',     'observation → network → prediction'],
    ['off',     'None',     'no motif at all'],
  ];

  let bar = null, note = null;
  function apply(id) {
    (VARIANTS[id] || VARIANTS.flow)();
    document.documentElement.setAttribute('data-nn', id);
    if (bar) bar.querySelectorAll('button').forEach(b =>
      b.classList.toggle('on', b.dataset.nn === id));
    const row = ORDER.find(r => r[0] === id);
    if (note) note.textContent = row ? row[2] : '';
    const u = new URL(location.href);
    u.searchParams.set('nn', id);
    history.replaceState(null, '', u);
  }

  // Opt-IN switcher. It was opt-out (?nobar=1), which is fine while
  // comparing variants but would ship a debug bar onto the live site.
  if (/[?&]nnbar/.test(location.search)) {
    bar = document.createElement('div');
    bar.className = 'nn-bar';
    bar.innerHTML = `<span class="nn-lab">AI MOTIF</span>` +
      ORDER.map(([id, n]) => `<button data-nn="${id}">${n}</button>`).join('') +
      `<span class="nn-note" id="nnNote"></span>`;
    document.body.appendChild(bar);
    note = bar.querySelector('#nnNote');
    bar.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) apply(b.dataset.nn);
    });
  }

  const start = new URLSearchParams(location.search).get('nn');
  apply(ORDER.some(r => r[0] === start) ? start : 'network');

  let t = null;
  addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => apply(document.documentElement.getAttribute('data-nn')), 200);
  });
})();
