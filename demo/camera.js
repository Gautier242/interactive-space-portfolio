/* CAMERA — zoom that actually reaches the object, true follow, and a
 * composed "hero" view when a publication is opened.
 *
 * Three defects this fixes, all in the original wheel/follow logic:
 *
 * 1. ZOOM FLOOR. The wheel handler pivoted around a point 30% of the
 *    camera's distance FROM THE SUN along the view direction, then clamped
 *    the pivot offset to a minimum length of 10. Near a small body that
 *    bottoms out ~10 units away — an ISS 4 units across can never fill the
 *    frame however hard you scroll. Now the pivot is the thing you are
 *    actually looking at, and the floor is derived from that object's own
 *    radius, so every object can be inspected closely.
 *
 * 2. FOLLOW WAS A NO-OP. app.js did
 *        offset = camPos - target;  camPos = target + offset
 *    which is the identity — it only re-aimed. The object then orbited out
 *    of frame while the camera sat still. We store the offset once and
 *    re-apply it, so the camera rides along.
 *
 * 3. NO COMPOSED VIEW. Opening a publication cut to whatever angle the
 *    camera happened to hold. Now it settles on a lit three-quarter view.
 */
(function () {
  const canvas = document.getElementById('canvas3d');
  if (!canvas || typeof camera === 'undefined') return;

  const V = () => new THREE.Vector3();
  const _a = V(), _b = V(), _c = V();

  // ---- what are we looking at? -----------------------------------------
  let follow = null;          // { name, mesh, offset:Vector3 }

  function meshFor(name) {
    if (typeof bodies !== 'undefined' && bodies[name]) return bodies[name].mesh;
    if (name === 'Sun' && typeof sun !== 'undefined') return sun;
    return null;
  }

  const radii = new WeakMap();
  const _box = new THREE.Box3(), _size = V();
  function radiusOf(mesh) {
    let r = radii.get(mesh);
    if (r === undefined) {
      const own = mesh.geometry && mesh.geometry.parameters && mesh.geometry.parameters.radius;
      if (own) r = own;
      else { _box.setFromObject(mesh); _box.getSize(_size); r = Math.max(_size.x, _size.y, _size.z) / 2 || 1; }
      radii.set(mesh, r);
    }
    return r;
  }

  // ---- zoom -------------------------------------------------------------
  // Intercept before the original canvas listener so its clamp never runs.
  document.addEventListener('wheel', e => {
    if (e.target !== canvas) return;
    if (typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive) return;
    e.preventDefault();
    e.stopPropagation();          // suppress app.js's own wheel handler

    // Pivot: the followed body if there is one, else a point ahead of the
    // camera at its current viewing distance.
    let pivot, minDist;
    if (follow && follow.mesh) {
      pivot = follow.mesh.getWorldPosition(_a.set(0, 0, 0));
      // Let the visitor get to ~1.6 radii — close enough to inspect a
      // spacecraft, far enough not to clip through it.
      minDist = Math.max(radiusOf(follow.mesh) * 1.6, 0.6);
    } else {
      camera.getWorldDirection(_b);
      pivot = _a.copy(camera.position).add(_b.multiplyScalar(camera.position.length() * 0.35));
      minDist = 6;
    }

    const step = e.deltaY > 0 ? 1.18 : 0.84;
    _c.subVectors(camera.position, pivot);
    let len = _c.length() * step;
    len = Math.max(minDist, Math.min(3000, len));
    camera.position.copy(pivot).add(_c.normalize().multiplyScalar(len));
    camera.lookAt(pivot);

    if (follow) follow.offset.subVectors(camera.position, pivot);
  }, { capture: true, passive: false });

  // ---- true follow ------------------------------------------------------
  const _q = new THREE.Quaternion();
  (function followTick() {
    requestAnimationFrame(followTick);
    if (!follow || !follow.mesh) return;
    if (typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive) return;
    follow.mesh.getWorldPosition(_a);
    if (follow.localOffset) {
      // These bodies spin on their own axis, so a fixed WORLD offset slides
      // around the object as it rotates — HWO ended up 66° off its aperture
      // instead of the intended 10°. Carrying the offset in the object's
      // local frame keeps the camera parked in front of the face.
      follow.mesh.getWorldQuaternion(_q);
      camera.position.copy(_a).add(_b.copy(follow.localOffset).applyQuaternion(_q));
    } else {
      camera.position.copy(_a).add(follow.offset);
    }
    camera.lookAt(_a);
  })();

  // ---- composed hero view ----------------------------------------------
  // Put the camera off the Sun→object axis so the object shows a mostly lit
  // face with a visible terminator — flat-on lighting reads as a sticker,
  // fully back-lit hides the subject.
  const SUN_OFFSET_DEG = 28;
  const FILL = 0.42;             // fraction of viewport height the body fills

  // Some craft have a definite "front" that the Sun-side rule gets wrong.
  // A telescope points AWAY from the Sun — its sunshield faces sunward — so
  // the lit-side view shows its back. For these, frame the face instead,
  // in the object's own local space.
  const FACE = {
    HWO: new THREE.Vector3(0, 0, 1),     // segmented primary faces +Z
  };

  function heroPose(mesh, name) {
    const target = mesh.getWorldPosition(V());
    const r = radiusOf(mesh);
    const dist = Math.max(r * 2.2, r / Math.tan((camera.fov * Math.PI / 360)) / FILL);

    const face = FACE[name];
    if (face) {
      const dir = face.clone()
        .applyQuaternion(mesh.getWorldQuaternion(new THREE.Quaternion()))
        .normalize();
      // Only a slight lift and swing. Enough that it reads as an object in
      // space rather than a flat elevation drawing, but not so much that the
      // aperture turns edge-on — at 0.22/0.30 the primary was nearly hidden.
      const up = V().set(0, 1, 0);
      const side = V().crossVectors(up, dir).normalize();
      dir.addScaledVector(up, 0.10).addScaledVector(side, 0.13).normalize();
      return { target, pos: target.clone().addScaledVector(dir, dist) };
    }

    // direction from Sun to object; camera sits near that line, offset in
    // azimuth so the lit side faces us, and lifted slightly for depth
    const sunPos = (typeof sun !== 'undefined') ? sun.getWorldPosition(V()) : V();
    const toObj = V().subVectors(target, sunPos);
    if (toObj.lengthSq() < 1e-6) toObj.set(1, 0, 0);
    toObj.normalize();

    // The camera must sit on the SUN'S side of the object to see a lit face.
    // Placing it along +toObj puts it beyond the object looking back at the
    // night side — which framed the ISS against Earth's dark limb.
    const toSun = toObj.clone().negate();
    const up = V().set(0, 1, 0);
    const side = V().crossVectors(up, toSun).normalize();
    const a = SUN_OFFSET_DEG * Math.PI / 180;
    const dir = V()
      .addScaledVector(toSun, Math.cos(a))
      .addScaledVector(side, Math.sin(a))
      .addScaledVector(up, 0.30)
      .normalize();

    return { target, pos: target.clone().addScaledVector(dir, dist) };
  }

  let flying = null;
  function flyTo(name, opts) {
    const mesh = meshFor(name);
    if (!mesh) return false;
    const { target, pos } = heroPose(mesh, name);
    const from = camera.position.clone();
    const t0 = performance.now();
    const ms = (opts && opts.ms) || 900;
    flying = true;
    follow = { name, mesh, offset: V().subVectors(pos, target) };

    // Face-framed bodies spin, so remember where to sit in THEIR frame.
    if (FACE[name]) {
      const wq = mesh.getWorldQuaternion(new THREE.Quaternion());
      follow.localOffset = follow.offset.clone().applyQuaternion(wq.clone().invert());
    }

    (function step(now) {
      const t = Math.min(1, ((now || performance.now()) - t0) / ms);
      const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      mesh.getWorldPosition(_a);
      let want;
      if (follow.localOffset) {
        mesh.getWorldQuaternion(_q);
        want = _a.clone().add(follow.localOffset.clone().applyQuaternion(_q));
      } else {
        want = _a.clone().add(follow.offset);
      }
      camera.position.lerpVectors(from, want, e);
      camera.lookAt(_a);
      if (t < 1) requestAnimationFrame(step);
      else {
        flying = null;
        if (!follow.localOffset) follow.offset.subVectors(camera.position, _a);
      }
    })(t0);
    return true;
  }

  // ---- hook publication opening ----------------------------------------
  // Wrap zoomToBody rather than editing app.js. Moon and VIPER keep their
  // own dedicated views, so pass those straight through.
  const rawZoom = window.zoomToBody;
  if (typeof rawZoom === 'function') {
    window.zoomToBody = function (name) {
      if (name === 'Moon' || name === 'VIPER') return rawZoom.call(this, name);
      if (typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive) return rawZoom.call(this, name);
      // Hold the scene still on the hero view; the visitor presses play when
      // they want motion back, and the camera then rides with the object.
      if (typeof pausedPlanets !== 'undefined') {
        pausedPlanets = true;
        const b = document.getElementById('btnPause');
        if (b) b.textContent = '▶';
      }
      if (typeof cameraFollowTarget !== 'undefined') cameraFollowTarget = null;  // disable app.js's re-aim
      if (!flyTo(name)) return rawZoom.call(this, name);
    };
  }

  // ---- reset clears the lock -------------------------------------------
  const reset = document.getElementById('btnReset');
  if (reset) reset.addEventListener('click', () => { follow = null; flying = null; }, true);

  // After the hero view lands, the visitor owns the camera. The follow lock
  // re-applies camera.position every frame, which silently fights pan and
  // orbit — the drag moves the camera and the next frame puts it back. So
  // once they drag, the lock is released and manual control is absolute.
  // Play/pause and zoom keep working either way.
  canvas.addEventListener('pointerdown', () => {
    if (!follow) return;
    let moved = 0;
    const onMove = e => {
      moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
      if (moved > 6) follow = null;         // hand the camera over for good
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
  }, true);

  window.__cam = {
    flyTo,
    clear() { follow = null; },
    get following() { return follow && follow.name; },
  };
})();
