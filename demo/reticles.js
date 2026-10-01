/* RETICLES — show them only while they are doing work.
 *
 * The yellow corner brackets exist to say "this object is worth clicking".
 * Once you are close enough that the object fills a good part of the frame,
 * that job is done and the brackets are just furniture sitting on top of the
 * thing you came to look at.
 *
 * So: hide a reticle when its object is already large on screen, keep it
 * when the object is small — which is exactly the case that matters for
 * something like HWO, a few pixels wide and impossible to find otherwise.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel || typeof bodies === 'undefined') return;

  const HIDE_ABOVE_PX = 90;      // apparent diameter at which brackets go
  const SHOW_BELOW_PX = 70;      // hysteresis, so they do not flicker

  const v = new THREE.Vector3();
  const radii = new WeakMap();
  const _b = new THREE.Box3(), _s = new THREE.Vector3();

  function radiusOf(mesh) {
    let r = radii.get(mesh);
    if (r === undefined) {
      const own = mesh.geometry && mesh.geometry.parameters && mesh.geometry.parameters.radius;
      if (own) r = own;
      else {
        // measure only real geometry; the reticle itself would inflate this
        _b.makeEmpty();
        const tmp = new THREE.Box3();
        mesh.traverse(o => {
          if (!o.isMesh || !o.geometry) return;
          tmp.setFromObject(o); _b.union(tmp);
        });
        if (_b.isEmpty()) _b.setFromObject(mesh);
        _b.getSize(_s);
        r = Math.max(_s.x, _s.y, _s.z) / 2 || 1;
      }
      radii.set(mesh, r);
    }
    return r;
  }

  // Collect every reticle with the mesh it belongs to. app.js builds them as
  // LineSegments children (and stores one on sun.userData.reticle).
  const items = [];
  function collect() {
    items.length = 0;
    const push = (mesh, ret) => { if (mesh && ret) items.push({ mesh, ret }); };
    Object.keys(bodies).forEach(n => {
      const m = bodies[n].mesh;
      if (!m) return;
      m.children.forEach(c => { if (c.isLineSegments) push(m, c); });
      if (m.userData && m.userData.reticle) push(m, m.userData.reticle);
    });
    if (typeof sun !== 'undefined' && sun && sun.userData && sun.userData.reticle) {
      push(sun, sun.userData.reticle);
    }
  }
  collect();
  setTimeout(collect, 3000);      // spacecraft models arrive on idle

  // While "How to explore" is open, the brackets it describes pulse on the
  // three planets-and-star only: the spacecraft brackets crowd round Earth,
  // and pulsing those too turned the map into a Christmas tree. app.js
  // rewrites every reticle's OPACITY each frame, before this loop runs, so
  // the pulse uses scale and colour, which nothing else touches.
  const legend = document.getElementById('legendText');
  const PULSE = new Set(['Sun', 'Earth', 'Mars']);
  const YELLOW = new THREE.Color(0xffff00), WHITE = new THREE.Color(0xffffff);
  let pulsing = false;
  const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // WebGL draws every line one pixel wide whatever linewidth says, so the
  // brackets cannot be made thicker as lines. While the legend is open each
  // corner is filled instead: a solid triangle under the outline, built from
  // the reticle's own size and parented to it, so it follows its lookAt and
  // its pulse for free.
  function fillFor(ret) {
    if (ret.userData.fill) return ret.userData.fill;
    const p = ret.geometry.attributes.position.array;
    let s = 0;
    for (let i = 0; i < p.length; i += 3) s = Math.max(s, Math.abs(p[i]));
    const l = s * 0.3;
    const tri = [];
    for (const [x, y] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      tri.push(x * s, y * s, 0,  x * (s - l), y * s, 0,  x * s, y * (s - l), 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: 0xffff00, transparent: true, opacity: 0.9,
      side: THREE.DoubleSide, depthWrite: false,
      toneMapped: false,     // ACES greyed pure yellow to olive
    }));
    m.visible = false;
    ret.add(m);
    return (ret.userData.fill = m);
  }

  function pulse(on) {
    // ~1 Hz; held at a steady highlight if the visitor asked for less motion
    const t = !on ? 0 : STILL ? 0.6 : (Math.sin(performance.now() * 0.006) + 1) / 2;
    for (const it of items) {
      const name = it.mesh === sun ? 'Sun' : it.mesh.userData && it.mesh.userData.name;
      if (!PULSE.has(name)) continue;
      // kept on the reticle, not the item: collect() rebuilds the items at 3 s,
      // and a base re-read mid-pulse would ratchet the brackets bigger
      const u = it.ret.userData;
      if (u.baseScale === undefined) u.baseScale = it.ret.scale.x;
      it.ret.scale.setScalar(u.baseScale * (1 + 0.28 * t));
      if (it.ret.material.color) it.ret.material.color.copy(YELLOW).lerp(WHITE, 0.55 * t);
      const fill = fillFor(it.ret);
      fill.visible = on;
      if (on) fill.material.color.copy(it.ret.material.color);
    }
  }

  (function tick() {
    requestAnimationFrame(tick);
    const want = !!legend && legend.classList.contains('active');
    if (want || pulsing) pulse(want);
    pulsing = want;
    if (typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive) return;
    const h = panel.clientHeight;
    if (!h || !items.length) return;
    const k = (h / 2) / Math.tan((camera.fov * Math.PI / 180) / 2);

    for (const it of items) {
      it.mesh.getWorldPosition(v);
      const d = camera.position.distanceTo(v);
      const px = (radiusOf(it.mesh) / Math.max(d, 0.001)) * k * 2;
      if (it.ret.visible && px > HIDE_ABOVE_PX) it.ret.visible = false;
      else if (!it.ret.visible && px < SHOW_BELOW_PX) it.ret.visible = true;
    }
  })();
})();
