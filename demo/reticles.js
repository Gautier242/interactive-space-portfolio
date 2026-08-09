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

  (function tick() {
    requestAnimationFrame(tick);
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
