/* OBJECT READOUT — instrument tag, attached to the object.
 *
 * Replaces the boxed card. That card was accurate but invasive: a 238px
 * panel parked in the scene, competing with the thing it described. This is
 * the instrument treatment instead — a tick, a name, one data line and a
 * publication badge, hanging off the object's lower-right and RIDING WITH IT
 * as it orbits.
 *
 * It stays on one object until you hover another or click the background,
 * so nothing has to be chased.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel || typeof bodies === 'undefined') return;

  // NASA planetary fact sheets.
  const EPHEM = {
    Sun:     { cls: 'G2V · central star' },
    Mercury: { au: 0.387, days: 87.97 },
    Venus:   { au: 0.723, days: 224.7 },
    Earth:   { au: 1.000, days: 365.26 },
    Moon:    { days: 27.32, cls: 'natural satellite' },
    Mars:    { au: 1.524, days: 686.98 },
    Jupiter: { au: 5.203, days: 4332.6 },
    Saturn:  { au: 9.537, days: 10759 },
    Uranus:  { au: 19.19, days: 30687 },
    Neptune: { au: 30.07, days: 60190 },
    ISS:     { days: 0.0645, cls: '408 km orbit' },
    LRO:     { days: 0.0806, cls: '50 km lunar orbit' },
    HWO:     { cls: 'Sun–Earth L2' },
    Starship:{ cls: 'lunar surface' },
    VIPER:   { cls: 'lunar south pole' },
  };

  const pubCount = {};
  (typeof PUBS !== 'undefined' ? PUBS : []).forEach(p => {
    pubCount[p.body] = (pubCount[p.body] || 0) + 1;
  });

  const layer = document.createElement('div');
  layer.className = 'obj-layer';
  layer.innerHTML = `
    <div class="obj-tag" id="objTag">
      <span class="obj-nm" id="objNm"></span>
      <span class="obj-sub" id="objSub"></span>
      <button class="obj-badge" id="objBadge" type="button"></button>
    </div>
    <div class="obj-corner">
      <span id="objEpoch">—</span><span class="obj-sep"></span><span id="objScale">—</span>
    </div>`;
  panel.appendChild(layer);

  const tag = layer.querySelector('#objTag');
  const elNm = layer.querySelector('#objNm');
  const elSub = layer.querySelector('#objSub');
  const elBadge = layer.querySelector('#objBadge');
  const elEpoch = layer.querySelector('#objEpoch');
  const elScale = layer.querySelector('#objScale');

  let simDays = 0, lastAngle = bodies.Earth ? bodies.Earth.angle : 0;
  const EPOCH0 = Date.UTC(2026, 0, 1);

  // ---- info toggle ------------------------------------------------------
  let infoOn = true;
  try { infoOn = localStorage.getItem('objInfo') !== 'off'; } catch (_) {}

  const toggle = document.createElement('button');
  toggle.className = 'obj-toggle';
  toggle.type = 'button';
  toggle.innerHTML = `<span class="obj-sw"><i></i></span><span class="obj-sw-lab"></span>`;
  panel.appendChild(toggle);

  function syncToggle() {
    toggle.classList.toggle('off', !infoOn);
    toggle.querySelector('.obj-sw-lab').textContent = 'Object info';
    toggle.title = infoOn ? 'Hide object info' : 'Show object info';
    toggle.setAttribute('aria-pressed', String(infoOn));
    layer.classList.toggle('no-info', !infoOn);
  }
  toggle.addEventListener('click', e => {
    e.stopPropagation();
    infoOn = !infoOn;
    try { localStorage.setItem('objInfo', infoOn ? 'on' : 'off'); } catch (_) {}
    if (!infoOn) close();
    syncToggle();
  });
  syncToggle();

  // ---- picking ----------------------------------------------------------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let ptr = null, locked = null;
  // While the tutorial is demonstrating a specific body, hover must not
  // steal the subject. Earth has ISS, Moon, HWO and more orbiting within a
  // few pixels of it, so a simulated pointer kept landing on a neighbour.
  let hoverLocked = false;

  function meshFor(name) {
    if (bodies[name]) return bodies[name].mesh;
    if (name === 'Sun' && typeof sun !== 'undefined') return sun;
    return null;
  }
  function nameOf(obj) {
    let o = obj, guard = 0;
    while (o && guard++ < 14) {
      const n = Object.keys(bodies).find(k => bodies[k].mesh === o);
      if (n) return n;
      if (typeof sun !== 'undefined' && o === sun) return 'Sun';
      o = o.parent;
    }
    return null;
  }

  const HOVER_TOLERANCE_PX = 16;
  function hit(nx, ny) {
    ndc.set(nx, ny);
    ray.setFromCamera(ndc, camera);
    const targets = Object.keys(bodies).map(n => bodies[n].mesh);
    if (typeof sun !== 'undefined') targets.push(sun);
    for (const h of ray.intersectObjects(targets, true)) {
      const n = nameOf(h.object);
      if (n) return n;
    }
    // Small bodies are only a few pixels across; requiring a direct hit on a
    // moving disc that size is not a fair pointer target.
    const w = panel.clientWidth, h = panel.clientHeight;
    const px = (nx * 0.5 + 0.5) * w, py = (-ny * 0.5 + 0.5) * h;
    let best = null, bestD = HOVER_TOLERANCE_PX;
    const probe = new THREE.Vector3();
    for (const n of Object.keys(bodies).concat(typeof sun !== 'undefined' ? ['Sun'] : [])) {
      const mesh = n === 'Sun' ? sun : bodies[n].mesh;
      if (!mesh) continue;
      mesh.getWorldPosition(probe);
      probe.project(camera);
      if (probe.z > 1) continue;
      const d = Math.hypot((probe.x * 0.5 + 0.5) * w - px, (-probe.y * 0.5 + 0.5) * h - py);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  panel.addEventListener('pointermove', e => {
    const r = panel.getBoundingClientRect();
    ptr = [((e.clientX - r.left) / r.width) * 2 - 1,
           -((e.clientY - r.top) / r.height) * 2 + 1];
  });
  panel.addEventListener('pointerleave', () => { ptr = null; });

  panel.addEventListener('pointerdown', e => {
    if (e.target.closest('.obj-tag, .obj-toggle, .controls, .t3-pill, .t3-replay, .t3-spot')) return;
    const r = panel.getBoundingClientRect();
    const n = hit(((e.clientX - r.left) / r.width) * 2 - 1,
                 -((e.clientY - r.top) / r.height) * 2 + 1);
    if (!n) close();
  }, true);

  const header = document.querySelector('.header');
  if (header) header.addEventListener('pointerdown', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  elBadge.addEventListener('click', e => {
    e.stopPropagation();
    const name = elBadge.dataset.open;
    const pub = (typeof PUBS !== 'undefined' ? PUBS : []).find(p => p.body === name);
    if (pub && typeof showDetail === 'function') showDetail(pub);
  });

  // Highlight lives on the object's own material, so it cannot outlive the
  // selection the way a drawn overlay did.
  let litName = null;
  function light(name) {
    if (litName === name) return;
    if (litName && typeof unhighlightBody === 'function') {
      try { unhighlightBody(litName); } catch (_) {}
    }
    litName = name;
    if (name && typeof highlightBody === 'function') {
      try { highlightBody(name); } catch (_) {}
    }
  }

  function close() {
    locked = null;
    hoverLocked = false;
    layer.classList.remove('on');
    light(null);
    // Also clear the stored pointer: otherwise the next frame re-tests the
    // same coordinates, finds the same body, and reopens immediately.
    ptr = null;
  }

  function fmtPeriod(d) {
    if (!d) return null;
    if (d < 1) return (d * 24).toFixed(1) + ' h';
    if (d < 400) return d.toFixed(1) + ' d';
    return (d / 365.26).toFixed(1) + ' yr';
  }

  function fill(name) {
    const d = EPHEM[name] || {};
    elNm.textContent = name.toUpperCase();
    const bits = [];
    if (d.au) bits.push(d.au.toFixed(3) + ' AU');
    const per = fmtPeriod(d.days);
    if (per) bits.push(per);
    if (d.cls) bits.push(d.cls);
    elSub.textContent = bits.join('  ·  ');
    elSub.style.display = bits.length ? 'block' : 'none';

    const n = pubCount[name] || 0;
    tag.classList.toggle('has-pubs', n > 0);
    elBadge.style.display = n ? 'inline-flex' : 'none';
    if (n) {
      elBadge.textContent = n + (n > 1 ? ' PUBS' : ' PUB');
      elBadge.dataset.open = name;
    }
  }

  // ---- geometry ---------------------------------------------------------
  const v = new THREE.Vector3();
  const radii = new WeakMap();
  const _b = new THREE.Box3(), _s = new THREE.Vector3();
  function radiusOf(mesh) {
    let r = radii.get(mesh);
    if (r === undefined) {
      const own = mesh.geometry && mesh.geometry.parameters && mesh.geometry.parameters.radius;
      if (own) r = own;
      else {
        _b.makeEmpty();
        const tmp = new THREE.Box3();
        mesh.traverse(o => { if (o.isMesh && o.geometry) { tmp.setFromObject(o); _b.union(tmp); } });
        if (_b.isEmpty()) _b.setFromObject(mesh);
        _b.getSize(_s);
        r = Math.max(_s.x, _s.y, _s.z) / 2 || 1;
      }
      radii.set(mesh, r);
    }
    return r;
  }

  let frame = 0;
  (function tick() {
    requestAnimationFrame(tick);
    const w = panel.clientWidth, h = panel.clientHeight;
    if (!w || !h) return;

    if (bodies.Earth) {
      let d = bodies.Earth.angle - lastAngle;
      if (d < -Math.PI) d += Math.PI * 2;
      lastAngle = bodies.Earth.angle;
      simDays += (d / (Math.PI * 2)) * 365.26;
      elEpoch.textContent = new Date(EPOCH0 + simDays * 86400000).toISOString().slice(0, 10);
    }
    const dist = camera.position.length();
    const worldPerPx = (2 * Math.tan((camera.fov * Math.PI / 180) / 2) * dist) / h;
    elScale.textContent = (worldPerPx).toFixed(2) + ' AU';

    if (infoOn && !hoverLocked && (frame++ & 3) === 0 && ptr) {
      const n = hit(ptr[0], ptr[1]);
      if (n && (!locked || locked.name !== n)) {
        const mesh = meshFor(n);
        if (mesh) {
          locked = { name: n, mesh };
          light(n);
          fill(n);
          layer.classList.add('on');
        }
      }
    }

    if (!locked) return;
    locked.mesh.getWorldPosition(v);
    const dCam = camera.position.distanceTo(v);
    v.project(camera);
    // Use a class, not an inline opacity: an inline value outranks the
    // stylesheet and silently forced the tag back to full strength.
    if (v.z > 1) { tag.classList.add('off-screen'); return; }

    const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
    // A tag clamped to the edge while its object is off-panel points at
    // nothing. Hide it rather than let it lie about where the object is.
    if (x < -8 || x > w + 8 || y < -8 || y > h + 8) { tag.classList.add('off-screen'); return; }
    const rPx = (radiusOf(locked.mesh) / Math.max(dCam, 0.001)) * (h / 2) /
                Math.tan((camera.fov * Math.PI / 180) / 2);

    // Anchor at the object's lower-right, clear of its disc, and ride along.
    const off = Math.min(rPx, 90) * 0.72 + 8;
    let tx = x + off, ty = y + off * 0.55;
    const tw = tag.offsetWidth || 150, th = tag.offsetHeight || 34;
    // Flip to the other side rather than run off the panel.
    if (tx + tw > w - 8) tx = x - off - tw;
    tx = Math.max(6, Math.min(w - tw - 6, tx));
    ty = Math.max(6, Math.min(h - th - 64, ty));
    tag.classList.remove('off-screen');
    tag.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`;
  })();

  // ---- context rules ----------------------------------------------------
  function setInfo(on, opts) {
    infoOn = !!on;
    if (!(opts && opts.silent)) {
      try { localStorage.setItem('objInfo', infoOn ? 'on' : 'off'); } catch (_) {}
    }
    if (!infoOn) close();
    syncToggle();
  }

  let wasFocused = false;
  (function contextTick() {
    requestAnimationFrame(contextTick);
    const focused =
      (typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive) ||
      (window.__cam && window.__cam.following) ||
      !!(document.getElementById('detailView') || {}).classList?.contains('active');
    if (focused === wasFocused) return;
    wasFocused = focused;
    setInfo(!focused, { silent: true });
  })();

  const resetBtn = document.getElementById('btnReset');
  if (resetBtn) resetBtn.addEventListener('click', () => setInfo(true, { silent: true }), true);

  // Drive the readout directly (used by the tutorial): pin one named body
  // and stop hover from switching away until released.
  function show(name, opts) {
    const mesh = meshFor(name);
    if (!mesh) return false;
    if (!infoOn) setInfo(true, { silent: true });
    locked = { name, mesh };
    light(name);
    fill(name);
    layer.classList.add('on');
    hoverLocked = !!(opts && opts.lock);
    return true;
  }
  function release() { hoverLocked = false; }

  window.__objReadout = {
    close, setInfo, show, release,
    get on() { return infoOn; },
    get subject() { return locked && locked.name; },
  };
})();
