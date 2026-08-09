/* VARIANT A — INSTRUMENT
 * Additive overlay on the live scene. Adds a mission-console HUD:
 * projected body labels with real orbital data, an epoch clock driven by
 * Earth's own orbital angle, a zoom-aware AU scale bar, and orbit lines
 * weighted by whether the body carries published work.
 * Touches nothing in app.js — it reads `scene`, `camera`, `bodies`, `PUBS`.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel || typeof bodies === 'undefined') return;

  // ---- real orbital data, for labels. Source: NASA planetary fact sheets.
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
    ISS:     { alt: '408 km', days: 0.0645 },
    LRO:     { alt: '50 km', days: 0.0806 },
    HWO:     { alt: 'Sun–Earth L2', days: 365.26 },
    Sun:     { alt: 'G2V · CENTRAL STAR' },
  };

  const pubCount = {};
  (typeof PUBS !== 'undefined' ? PUBS : []).forEach(p => {
    pubCount[p.body] = (pubCount[p.body] || 0) + 1;
  });

  // Zoomed out, six separate "1 PUB" badges stacked on Earth is noise, not
  // information. Roll each satellite's count up its parent chain so the far
  // view shows one honest total per system, and the detail appears on zoom.
  const rollup = Object.assign({}, pubCount);
  Object.keys(bodies).forEach(n => {
    if (!pubCount[n]) return;
    let p = bodies[n] && bodies[n].parent, guard = 0;
    while (p && guard++ < 8) {
      rollup[p] = (rollup[p] || 0) + pubCount[n];
      p = bodies[p] && bodies[p].parent;
    }
  });

  // ---- HUD chrome
  const hud = document.createElement('div');
  hud.className = 'inst-hud';
  hud.innerHTML = `
    <div class="inst-topbar">
      <div class="inst-title">SOLAR SYSTEM RESEARCH MAP</div>
      <div class="inst-readout">
        <span class="inst-k">EPOCH</span><span class="inst-v" id="instEpoch">—</span>
        <span class="inst-k">RATE</span><span class="inst-v" id="instRate">—</span>
        <span class="inst-k">BODIES</span><span class="inst-v" id="instCount">—</span>
      </div>
    </div>
    <div class="inst-labels" id="instLabels"></div>
    <div class="inst-scale">
      <div class="inst-scalebar"><i></i></div>
      <div class="inst-scaleval" id="instScale">—</div>
    </div>
    <div class="inst-focus" id="instFocus"></div>`;
  panel.appendChild(hud);

  const labelLayer = document.getElementById('instLabels');
  const elEpoch = document.getElementById('instEpoch');
  const elRate = document.getElementById('instRate');
  const elScale = document.getElementById('instScale');
  const elFocus = document.getElementById('instFocus');
  document.getElementById('instCount').textContent =
    String(Object.keys(bodies).length + 1).padStart(2, '0');

  // ---- orbit restyle: solid hairlines, brighter where work exists
  orbits.forEach(line => {
    const name = Object.keys(bodies).find(
      n => !bodies[n].isMoon && Math.abs(bodies[n].orbit - line.geometry.attributes.position.getX(0)) < 0.5
    );
    const hot = name && pubCount[name];
    line.material = new THREE.LineBasicMaterial({
      color: hot ? 0xffd27f : 0x6f86ad,
      transparent: true,
      opacity: hot ? 0.55 : 0.22,
    });
  });

  // ---- epoch clock, integrated from Earth's own orbital angle
  let simDays = 0, lastEarthAngle = bodies.Earth ? bodies.Earth.angle : 0;
  const EPOCH0 = Date.UTC(2026, 0, 1);

  // ---- label elements, created once and reused
  const tags = {};
  function tagFor(name) {
    if (tags[name]) return tags[name];
    const e = document.createElement('div');
    e.className = 'inst-tag' + (rollup[name] ? ' has-pubs' : '');
    const d = EPHEM[name];
    const sub = d
      ? (d.alt ? d.alt : d.au ? d.au.toFixed(3) + ' AU · ' + fmtPeriod(d.days) : '')
      : '';
    e.innerHTML =
      `<span class="inst-tick"></span>` +
      `<span class="inst-nm">${name.toUpperCase()}</span>` +
      (sub ? `<span class="inst-sub">${sub}</span>` : '') +
      (rollup[name] ? `<span class="inst-badge"></span>` : '');
    labelLayer.appendChild(e);
    e._badge = e.querySelector('.inst-badge');
    return (tags[name] = e);
  }

  function fmtPeriod(d) {
    if (d < 1) return (d * 24).toFixed(1) + ' h';
    if (d < 400) return d.toFixed(1) + ' d';
    return (d / 365.26).toFixed(1) + ' yr';
  }

  // ---- per-frame projection. Own rAF loop; app.js is untouched.
  const v = new THREE.Vector3();

  // Bounding radius, cached — geometry does not change after build, and
  // recomputing a Box3 per body per frame is pure waste.
  const radii = new WeakMap();
  const _b = new THREE.Box3(), _s = new THREE.Vector3(), _acc = new THREE.Box3();
  function worldRadius(obj) {
    let r = radii.get(obj);
    if (r === undefined) {
      // Prefer the body's own sphere radius. Any bounds-based measure
      // swallows the Sun's corona, flares and prominences — 55.6 against a
      // true core of 18 — and throws the label three disc-widths off.
      const own = obj.geometry && obj.geometry.parameters && obj.geometry.parameters.radius;
      if (own) { radii.set(obj, own); return own; }

      _acc.makeEmpty();
      obj.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        _b.setFromObject(o);
        _acc.union(_b);
      });
      if (_acc.isEmpty()) _acc.setFromObject(obj);
      _acc.getSize(_s);
      r = Math.max(_s.x, _s.y, _s.z) / 2 || 1;
      radii.set(obj, r);
    }
    return r;
  }
  function tick() {
    requestAnimationFrame(tick);
    const w = panel.clientWidth, h = panel.clientHeight;
    if (!w || !h) return;

    // epoch
    if (bodies.Earth) {
      let d = bodies.Earth.angle - lastEarthAngle;
      if (d < -Math.PI) d += Math.PI * 2;
      lastEarthAngle = bodies.Earth.angle;
      simDays += (d / (Math.PI * 2)) * 365.26;
      const t = new Date(EPOCH0 + simDays * 86400000);
      elEpoch.textContent = t.toISOString().slice(0, 10) + 'T' + t.toISOString().slice(11, 16) + 'Z';
    }
    elRate.textContent = (typeof animationSpeed !== 'undefined' ? animationSpeed : 1).toFixed(2) + '×';

    // scale bar: 120 px measured at the camera's distance to the ecliptic origin
    const dist = camera.position.length();
    const worldPerPx = (2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist) / h;
    const au = (worldPerPx * 120) / 100; // orbit radius 100 == 1 AU in this scene
    elScale.textContent = au < 0.1 ? (au * 1000).toFixed(0) + ' ×10⁻³ AU' : au.toFixed(2) + ' AU';

    // labels
    const zoomedIn = dist < 200;
    // The Sun lives outside the `bodies` registry, so give it a stand-in.
    const roster = Object.assign({ Sun: { mesh: sun, isMoon: false } }, bodies);
    for (const name in roster) {
      const b = roster[name];
      const known = EPHEM[name] || rollup[name];
      // Satellites stay folded into their parent until you actually fly in.
      const show = known && (!b.isMoon || zoomedIn);
      const e = show ? tagFor(name) : tags[name];
      if (!e) continue;
      if (!show) { e.style.display = 'none'; continue; }
      if (e._badge) {
        const n = zoomedIn ? pubCount[name] : rollup[name];
        e._badge.textContent = n ? n + ' PUB' + (n > 1 ? 'S' : '') : '';
        e._badge.style.display = n ? '' : 'none';
      }

      b.mesh.getWorldPosition(v);
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1) { e.style.display = 'none'; continue; }
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      // Push the tag clear of the body's own disc. A fixed offset buries the
      // label inside big bodies — the Sun swallowed its own label entirely.
      const rWorld = worldRadius(b.mesh);
      const rPx = (rWorld / Math.max(dist, 0.001)) * (h / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);
      const tagX = x + Math.min(rPx + 6, w * 0.45);
      // Test where the LABEL lands, not where the body is: a body just off
      // the left edge was still leaking a half-clipped tag into the frame.
      if (tagX < 6 || tagX > w - 96 || y < 46 || y > h - 46) { e.style.display = 'none'; continue; }
      e.style.display = 'block';
      e.style.transform = `translate(${Math.round(tagX)}px, ${Math.round(y)}px)`;
      e.style.opacity = String(Math.max(0.35, 1 - Math.max(0, v.z) * 0.55));
    }

    if (typeof selectedBody !== 'undefined' && selectedBody) {
      elFocus.textContent = 'FOCUS → ' + String(selectedBody).toUpperCase();
      elFocus.style.opacity = '1';
    } else {
      elFocus.style.opacity = '0';
    }
  }
  tick();
})();
