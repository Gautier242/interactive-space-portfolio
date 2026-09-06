/* MOON SURFACE — touch that behaves like the rest of the app.
 *
 * The surface view grew a single one-finger orbit handler and nothing else:
 * no pinch, and selection routed through a `click` listener guarded by
 * `isDragging`, a flag the MAIN canvas also writes. Land on the surface after
 * dragging the solar system and that flag could still be true, so the first
 * taps were swallowed — hence "I have to tap Starship several times".
 *
 * LRO was worse than swallowed: it is a 0.6-unit satellite drawn small in the
 * sky, so a fingertip almost never produced a direct ray hit at all.
 */
(function () {
  const moonCanvas = document.getElementById('moonSurface');
  if (!moonCanvas || typeof THREE === 'undefined') return;

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const _v = new THREE.Vector3();

  function active() {
    try { return !!moonSurfaceActive; } catch (_) { return false; }
  }
  function clickables() {
    try {
      return [moonStarship, moonViper, moonLRO, moonEarth].filter(Boolean);
    } catch (_) { return []; }
  }
  function nameOf(o) {
    while (o && !(o.userData && o.userData.name)) o = o.parent;
    return o ? o.userData.name : null;
  }

  // ---- pick with a fingertip's tolerance ---------------------------------
  // Try the exact ray first. If it misses, take the nearest clickable whose
  // centre projects within PAD pixels of the touch — the same allowance a
  // native tap target gets, and the only way a satellite a few pixels across
  // is ever selectable on glass.
  const PAD = 44;
  function pick(clientX, clientY) {
    const r = moonCanvas.getBoundingClientRect();
    ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, moonCamera);
    const list = clickables();
    const hits = ray.intersectObjects(list, true);
    if (hits.length) return nameOf(hits[0].object);

    let best = null, bestD = PAD;
    for (const o of list) {
      o.getWorldPosition(_v);
      _v.project(moonCamera);
      if (_v.z > 1) continue;                       // behind the camera
      const x = r.left + (_v.x * 0.5 + 0.5) * r.width;
      const y = r.top + (-_v.y * 0.5 + 0.5) * r.height;
      // must actually be on screen: an object just past the edge should not
      // be reachable by a tap near that edge
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
      const d = Math.hypot(x - clientX, y - clientY);
      if (d < bestD) { bestD = d; best = nameOf(o); }
    }
    return best;
  }

  // ---- act on a pick -----------------------------------------------------
  // Mirrors app.js's own moon click handler, which is not callable from here.
  function select(name) {
    if (!name) return;
    if (name === 'Earth') {
      if (typeof exitMoonMission === 'function') exitMoonMission();
      return;
    }
    if (name === 'VIPER') {
      let driving = false;
      try { driving = !!roverPOVMode; } catch (_) {}
      if (!driving) { if (typeof enterRoverMode === 'function') enterRoverMode(); return; }
    } else {
      let driving = false;
      try { driving = !!roverPOVMode; } catch (_) {}
      if (driving && typeof exitRoverToMoon === 'function') exitRoverToMoon();
    }
    const pub = (typeof PUBS !== 'undefined') && PUBS.find(p => p.body === name);
    if (pub && typeof showDetail === 'function') {
      showDetail(pub);
      if (typeof highlightPublication === 'function') highlightPublication(name);
    }
  }

  // ---- gestures ----------------------------------------------------------
  let x0 = 0, y0 = 0, moved = 0, touching = false, pinchPrev = 0;

  moonCanvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      touching = true; moved = 0;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    } else {
      touching = false;
    }
    pinchPrev = 0;
  }, { passive: true });

  moonCanvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      // Pinch. app.js's moon handler only ever looked at a single finger, so
      // two fingers did nothing at all here.
      e.preventDefault();
      touching = false;
      const d = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY);
      if (!d) return;
      if (!pinchPrev) { pinchPrev = d; return; }
      const step = Math.min(1.2, Math.max(0.83, pinchPrev / d));
      pinchPrev = d;
      const t = new THREE.Vector3(0, 0, 0);
      const off = new THREE.Vector3().subVectors(moonCamera.position, t);
      const len = Math.max(3, Math.min(150, off.length() * step));
      moonCamera.position.copy(t).add(off.setLength(len));
      moonCamera.lookAt(t);
      return;
    }
    if (e.touches.length === 1 && touching) {
      moved = Math.max(moved,
        Math.hypot(e.touches[0].clientX - x0, e.touches[0].clientY - y0));
    }
  }, { passive: false });

  // Selection on touchend, with its own movement threshold. Independent of
  // app.js's shared isDragging flag and of the click event's ~300ms delay.
  moonCanvas.addEventListener('touchend', e => {
    pinchPrev = 0;
    if (!touching || !active()) { touching = false; return; }
    touching = false;
    if (moved > 12) return;                     // that was a drag, not a tap
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const name = pick(t.clientX, t.clientY);
    if (name) { e.preventDefault(); select(name); }
  }, { passive: false });

  moonCanvas.addEventListener('touchcancel', () => { touching = false; pinchPrev = 0; });

  window.__moonPick = pick;
})();
