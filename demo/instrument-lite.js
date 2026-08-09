/* INSTRUMENT — QUIET VARIANT
 *
 * Same credibility as the full HUD, a fraction of the ink. The full version
 * labelled everything at once, which is what made it cluttered: nine tags,
 * each with a name, orbital data and a badge, all competing at full strength.
 *
 * The rule here: ONE thing is detailed at a time — whatever you are pointing
 * at. Everything else is a name only, dimmed, and moons stay folded away
 * until you fly in. Nothing is lost; it is revealed on demand instead of
 * broadcast at once.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel || typeof bodies === 'undefined') return;

  const EPHEM = {
    Mercury: { au: 0.387, days: 87.97 },
    Venus:   { au: 0.723, days: 224.7 },
    Earth:   { au: 1.000, days: 365.26 },
    Mars:    { au: 1.524, days: 686.98 },
    Jupiter: { au: 5.203, days: 4332.6 },
    Saturn:  { au: 9.537, days: 10759 },
    Uranus:  { au: 19.19, days: 30687 },
    Neptune: { au: 30.07, days: 60190 },
    Moon:    { au: 1.000, days: 27.32 },
    ISS:     { alt: '408 km orbit', days: 0.0645 },
    LRO:     { alt: '50 km lunar orbit', days: 0.0806 },
    HWO:     { alt: 'Sun–Earth L2' },
    Starship:{ alt: 'lunar surface' },
    VIPER:   { alt: 'lunar south pole' },
    Sun:     { alt: 'G2V · central star' },
  };

  const pubCount = {};
  (typeof PUBS !== 'undefined' ? PUBS : []).forEach(p => {
    pubCount[p.body] = (pubCount[p.body] || 0) + 1;
  });
  const rollup = Object.assign({}, pubCount);
  Object.keys(bodies).forEach(n => {
    if (!pubCount[n]) return;
    let p = bodies[n].parent, guard = 0;
    while (p && guard++ < 8) {
      rollup[p] = (rollup[p] || 0) + pubCount[n];
      p = bodies[p] && bodies[p].parent;
    }
  });

  // ---- chrome: a single corner readout, no top bar ----------------------
  const hud = document.createElement('div');
  hud.className = 'lite-hud';
  hud.innerHTML = `
    <div class="lite-labels" id="liteLabels"></div>
    <div class="lite-corner">
      <span class="lite-epoch" id="liteEpoch">—</span>
      <span class="lite-sep"></span>
      <span class="lite-scale" id="liteScale">—</span>
    </div>`;
  panel.appendChild(hud);

  const layer = hud.querySelector('#liteLabels');
  const elEpoch = hud.querySelector('#liteEpoch');
  const elScale = hud.querySelector('#liteScale');

  // orbits: uniform hairline, gold only where work exists
  if (typeof orbits !== 'undefined') {
    orbits.forEach(line => {
      const r = line.geometry.attributes.position.getX(0);
      const name = Object.keys(bodies).find(
        n => !bodies[n].isMoon && Math.abs(bodies[n].orbit - r) < 0.5);
      const hot = name && rollup[name];
      line.material = new THREE.LineBasicMaterial({
        color: hot ? 0xffd27f : 0x5f78a0,
        transparent: true, opacity: hot ? 0.4 : 0.16,
      });
    });
  }

  let simDays = 0, lastAngle = bodies.Earth ? bodies.Earth.angle : 0;
  const EPOCH0 = Date.UTC(2026, 0, 1);

  const tags = {};
  function tagFor(name) {
    if (tags[name]) return tags[name];
    const e = document.createElement('div');
    e.className = 'lite-tag';
    e.innerHTML = `<span class="lite-dot"></span><span class="lite-nm"></span>` +
                  `<span class="lite-sub"></span>`;
    e._nm = e.querySelector('.lite-nm');
    e._sub = e.querySelector('.lite-sub');
    e._nm.textContent = name.toUpperCase();
    layer.appendChild(e);
    return (tags[name] = e);
  }

  function fmt(d) {
    if (!d) return '';
    if (d < 1) return (d * 24).toFixed(1) + ' h';
    if (d < 400) return d.toFixed(0) + ' d';
    return (d / 365.26).toFixed(1) + ' yr';
  }

  // ---- what is the visitor pointing at? ---------------------------------
  let hovered = null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let pending = null;
  panel.addEventListener('pointermove', e => {
    const r = panel.getBoundingClientRect();
    pending = [((e.clientX - r.left) / r.width) * 2 - 1,
               -((e.clientY - r.top) / r.height) * 2 + 1];
  });
  panel.addEventListener('pointerleave', () => { pending = null; hovered = null; });

  function pick() {
    if (!pending) return;
    ndc.set(pending[0], pending[1]);
    ray.setFromCamera(ndc, camera);
    // generous threshold: these are small objects at system scale
    ray.params.Points.threshold = 2;
    const targets = Object.keys(bodies).map(n => bodies[n].mesh).concat(sun ? [sun] : []);
    const hit = ray.intersectObjects(targets, true)[0];
    if (!hit) { hovered = null; return; }
    let o = hit.object, guard = 0;
    while (o && guard++ < 12) {
      const nm = Object.keys(bodies).find(n => bodies[n].mesh === o);
      if (nm) { hovered = nm; return; }
      if (o === sun) { hovered = 'Sun'; return; }
      o = o.parent;
    }
    hovered = null;
  }

  const v = new THREE.Vector3();
  const radii = new WeakMap();
  const _b = new THREE.Box3(), _s = new THREE.Vector3();
  function radiusOf(obj) {
    let r = radii.get(obj);
    if (r === undefined) {
      const own = obj.geometry && obj.geometry.parameters && obj.geometry.parameters.radius;
      if (own) r = own;
      else { _b.setFromObject(obj); _b.getSize(_s); r = Math.max(_s.x, _s.y, _s.z) / 2 || 1; }
      radii.set(obj, r);
    }
    return r;
  }

  let frame = 0;
  function tick() {
    requestAnimationFrame(tick);
    const w = panel.clientWidth, h = panel.clientHeight;
    if (!w || !h) return;
    if ((frame++ & 3) === 0) pick();   // raycast every 4th frame is plenty

    if (bodies.Earth) {
      let d = bodies.Earth.angle - lastAngle;
      if (d < -Math.PI) d += Math.PI * 2;
      lastAngle = bodies.Earth.angle;
      simDays += (d / (Math.PI * 2)) * 365.26;
      elEpoch.textContent = new Date(EPOCH0 + simDays * 86400000)
        .toISOString().slice(0, 10);
    }

    const dist = camera.position.length();
    const worldPerPx = (2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist) / h;
    const au = (worldPerPx * 100) / 100;
    elScale.textContent = au < 0.1 ? (au * 1000).toFixed(0) + '×10⁻³ AU' : au.toFixed(2) + ' AU';

    const zoomedIn = dist < 200;
    const roster = Object.assign({ Sun: { mesh: sun, isMoon: false } }, bodies);

    for (const name in roster) {
      const b = roster[name];
      const known = EPHEM[name] || rollup[name];
      const show = known && (!b.isMoon || zoomedIn);
      const e = show ? tagFor(name) : tags[name];
      if (!e) continue;
      if (!show) { e.style.display = 'none'; continue; }

      b.mesh.getWorldPosition(v);
      const d = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1) { e.style.display = 'none'; continue; }
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      const rPx = (radiusOf(b.mesh) / Math.max(d, 0.001)) * (h / 2) /
                  Math.tan((camera.fov * Math.PI / 180) / 2);
      const tx = x + Math.min(rPx + 7, w * 0.4);
      if (tx < 6 || tx > w - 90 || y < 14 || y > h - 60) { e.style.display = 'none'; continue; }

      // THIS is the decluttering: detail belongs to the focused body only.
      const active = hovered === name;
      e.style.display = 'block';
      e.classList.toggle('on', active);
      e.classList.toggle('has-pubs', !!rollup[name]);
      if (active) {
        const ep = EPHEM[name] || {};
        const n = zoomedIn ? pubCount[name] : rollup[name];
        e._sub.textContent = [
          ep.alt || (ep.au ? ep.au.toFixed(3) + ' AU' : ''),
          fmt(ep.days),
          n ? n + (n > 1 ? ' projects' : ' project') : '',
        ].filter(Boolean).join('  ·  ');
      } else {
        e._sub.textContent = '';
      }
      e.style.transform = `translate(${Math.round(tx)}px, ${Math.round(y)}px)`;
    }
  }
  tick();
})();
