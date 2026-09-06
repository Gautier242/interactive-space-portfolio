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
  const UPV = V().set(0, 1, 0);

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

    zoomBy(e.deltaY > 0 ? 1.18 : 0.84);
  }, { capture: true, passive: false });

  // One zoom for every input. The wheel used to own this maths inline; touch
  // then grew a second, wrong copy in app.js that pivoted on
  // getCurrentViewTarget() — a point 100 units IN FRONT of the camera, not a
  // centre to orbit — which threw the camera backwards on every pinch frame.
  // step > 1 pulls back, step < 1 moves closer.
  function zoomBy(step) {
    // Never while a flight is running. This function mutates follow.offset,
    // and the flight reads that offset every frame to decide where it is
    // going — so a zoom mid-flight multiplies the offset by the distance the
    // camera has not covered yet, and the flight then chases the inflated
    // target. Mobile hit this every time: opening a publication starts the
    // flight AND changes the split, and the split calls zoomBy. The camera
    // ended up thousands of units out, past Neptune, so every body looked
    // like it had stopped zooming. Desktop has no split control, which is
    // exactly why it only ever broke on the phone.
    if (flying) return;
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
    _c.subVectors(camera.position, pivot);
    let len = _c.length() * step;
    len = Math.max(minDist, Math.min(3000, len));
    camera.position.copy(pivot).add(_c.normalize().multiplyScalar(len));
    camera.lookAt(pivot);
    if (follow) follow.offset.subVectors(camera.position, pivot);
  }

  // ---- true follow ------------------------------------------------------
  const _q = new THREE.Quaternion();
  // What this loop last wrote. Anything else in camera.position at the top of
  // the next frame was put there by the visitor — the +/- buttons, a drag, a
  // pinch — and has to be honoured, not overwritten. Without this the follow
  // loop stomped every control once a publication was open, so the view felt
  // frozen: you could press zoom and nothing happened, because the next frame
  // put the camera straight back.
  const _written = V();
  let hasWritten = false;
  (function followTick() {
    requestAnimationFrame(followTick);
    if (!follow || !follow.mesh) { hasWritten = false; return; }
    if (typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive) { hasWritten = false; return; }
    follow.mesh.getWorldPosition(_a);
    // absorb whatever the visitor did into the offset we ride at
    if (hasWritten && !flying && camera.position.distanceToSquared(_written) > 1e-8) {
      if (follow.localOffset) {
        follow.mesh.getWorldQuaternion(_q);
        follow.localOffset.subVectors(camera.position, _a).applyQuaternion(_q.invert());
      } else {
        follow.offset.subVectors(camera.position, _a);
      }
    }
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
    _written.copy(camera.position);
    hasWritten = true;
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
    let dist = Math.max(r * 2.2, r / Math.tan((camera.fov * Math.PI / 360)) / FILL);
    // The Lunar Foundation Model is about the Moon; LRO is how it is pinned to
    // the map. Framed to fill, the orbiter is a speck against black — pull
    // back far enough that the Moon it orbits is in the shot with it.
    if (name === 'LRO' && typeof bodies !== 'undefined' && bodies.Moon && bodies.Moon.mesh) {
      const moonPos = bodies.Moon.mesh.getWorldPosition(V());
      dist = Math.max(dist, moonPos.distanceTo(target) * 2.6);
    }

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

    return { target, pos: unblocked(target, dir, dist, mesh) };
  }

  // Sun-side framing still leaves the ISS behind Earth about as often as not:
  // being lit says nothing about what sits between us and it. Swing the
  // camera around the target until the sight line is clear, keeping the first
  // angle that works so the pose stays as close to the lit one as possible.
  function occluder(from, target, selfMesh) {
    if (typeof bodies === 'undefined') return null;
    const seg = V().subVectors(target, from);
    const segLen = seg.length();
    if (segLen < 1e-6) return null;
    seg.divideScalar(segLen);
    for (const key in bodies) {
      const m = bodies[key] && bodies[key].mesh;
      if (!m || m === selfMesh) continue;
      const c = m.getWorldPosition(V());
      const t = V().subVectors(c, from).dot(seg);
      if (t <= 0 || t >= segLen) continue;          // not between us and it
      const perp = V().copy(from).addScaledVector(seg, t).distanceTo(c);
      if (perp < radiusOf(m) * 1.25) return key;
    }
    return null;
  }

  function unblocked(target, dir, dist, selfMesh) {
    const up = V().set(0, 1, 0);
    let best = target.clone().addScaledVector(dir, dist);
    if (!occluder(best, target, selfMesh)) return best;
    const tries = [30, -30, 60, -60, 90, -90, 130, -130, 180];
    for (const deg of tries) {
      const d2 = dir.clone().applyAxisAngle(up, deg * Math.PI / 180).normalize();
      const pos = target.clone().addScaledVector(d2, dist);
      if (!occluder(pos, target, selfMesh)) return pos;
    }
    return best;                                    // nothing clear; keep the lit pose
  }

  // ---- key light --------------------------------------------------------
  // The scene is lit by one point light at the Sun, which is correct and is
  // exactly why the ISS opened as a black silhouette against Earth's night
  // side: swinging to an unblocked angle does not help if that angle is unlit.
  //
  // A directional fill is parented to the camera, so it always shines along
  // the view direction with no per-frame work and no distance falloff (a
  // PointLight with decay would be worth nothing 1000 units out). It is only
  // on while a body is focused, so the rest of the system keeps its real
  // terminator.
  const keyLight = new THREE.DirectionalLight(0xcfe0ff, 0);
  keyLight.position.set(0.45, 0.8, 1);        // over the viewer's shoulder
  keyLight.target.position.set(0, 0, -1);     // ...pointing where we look
  camera.add(keyLight);
  camera.add(keyLight.target);
  // the camera is not in the graph in this app, so it needs updating itself
  if (!camera.parent) scene.add(camera);
  const KEY_ON = 0.85;
  function setKey(on) { keyLight.intensity = on ? KEY_ON : 0; }

  // Tie it to "a publication is open", not to `follow` — follow persists until
  // Reset, and a headlight left on permanently washes out every planet's
  // terminator, which is the look the map is for.
  const detailEl = document.getElementById('detailView');
  if (detailEl) {
    new MutationObserver(() => {
      if (detailEl.classList.contains('active')) return;
      // Closing a publication returns the map to the view you landed on, so
      // the X is always a way out — including out of the Moon surface view,
      // which otherwise swallowed every later click.
      setKey(false);
      follow = null;
      flying = null;
      exitSurface();
      const F = window.__framing;
      if (F && F.place) { F.resume && F.resume(); F.place(); }
    }).observe(detailEl, { attributes: true, attributeFilter: ['class'] });
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
    // framing.js's idle drift calls place() every frame and only stops on the
    // first real pointer/wheel/key event. A publication opened any other way
    // (the tour, a deep link, a programmatic open) would be fought frame for
    // frame and the camera would never leave the default pose. Suspend it for
    // the duration; closing the publication resumes and re-places it.
    if (window.__framing && window.__framing.suspend) window.__framing.suspend();
    follow = { name, mesh, offset: V().subVectors(pos, target) };
    setKey(true);

    // Face-framed bodies spin, so remember where to sit in THEIR frame.
    if (FACE[name]) {
      const wq = mesh.getWorldQuaternion(new THREE.Quaternion());
      follow.localOffset = follow.offset.clone().applyQuaternion(wq.clone().invert());
    }

    const leg = follow;                 // this flight's own target
    (function step(now) {
      // The flight can be cancelled mid-air now that closing a publication
      // clears the follow lock. Hold the leg locally and stop if it is no
      // longer the current one, rather than dereferencing a null `follow`.
      if (follow !== leg) return;
      // Clamp BOTH ends. A rAF timestamp is the time the frame started, which
      // can be EARLIER than the performance.now() captured when flyTo was
      // called mid-frame — so t went negative, and the easing curve happily
      // extrapolates: at t = -2 it returns e = 8, and lerpVectors then threw
      // the camera eight times PAST its target, thousands of units out. Every
      // body after that looked like it had stopped zooming. It depended on
      // where in the frame the tap landed, which is why it came and went and
      // survived a reload, and why a phone (longer frames) hit it far more
      // often than a desktop.
      const t = Math.min(1, Math.max(0, ((now || performance.now()) - t0) / ms));
      const e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      mesh.getWorldPosition(_a);
      let want;
      if (leg.localOffset) {
        mesh.getWorldQuaternion(_q);
        want = _a.clone().add(leg.localOffset.clone().applyQuaternion(_q));
      } else {
        want = _a.clone().add(leg.offset);
      }
      camera.position.lerpVectors(from, want, e);
      camera.lookAt(_a);
      if (t < 1) requestAnimationFrame(step);
      else {
        flying = null;
        if (!leg.localOffset) leg.offset.subVectors(camera.position, _a);
      }
    })(t0);
    return true;
  }

  // ---- hook publication opening ----------------------------------------
  // Wrap zoomToBody rather than editing app.js. Moon and VIPER keep their
  // own dedicated views, so pass those straight through.
  // Starship, VIPER and LRO have their own presence on the Moon surface.
  // LRO is shown from outside, in the solar-system view — it is the map's
  // handle on the Lunar Foundation Model, not a thing you stand next to.
  const ON_SURFACE = { Starship: 1, VIPER: 1 };

  // The same teardown app.js performs when you tap Earth in the Moon sky.
  // app.js has no callable helper for it, so it is spelled out here rather
  // than editing app.js.
  function exitSurface() {
    try { if (typeof roverPOVMode !== 'undefined' && roverPOVMode) leaveRoverMode(); } catch (_) {}
    try { moonSurfaceActive = false; } catch (_) {}
    if (typeof restoreSimState === 'function') restoreSimState();
    const c = document.getElementById('moonSurface');
    if (c) c.classList.remove('active');
    if (typeof MoonMission !== 'undefined' && MoonMission.hideMission) MoonMission.hideMission();
  }
  const rawZoom = window.zoomToBody;
  if (typeof rawZoom === 'function') {
    window.zoomToBody = function (name) {
      if (name === 'Moon' || name === 'VIPER') return rawZoom.call(this, name);
      // Anything that is not ON the surface has to leave the surface view
      // first. Without this, one visit to the Moon or VIPER left
      // moonSurfaceActive true and every later publication fell through to
      // rawZoom, so the main map never moved again — Sun, Mars and Earth all
      // looked broken until a reload, and the moon canvas stayed on top.
      if (typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive) {
        if (ON_SURFACE[name]) return rawZoom.call(this, name);
        exitSurface();
      }
      // Hold the scene still on the hero view; the visitor presses play when
      // they want motion back, and the camera then rides with the object.
      if (typeof pausedPlanets !== 'undefined') {
        pausedPlanets = true;
        const b = document.getElementById('btnPause');
        if (b) b.className = 'is-play';
      }
      if (typeof cameraFollowTarget !== 'undefined') cameraFollowTarget = null;  // disable app.js's re-aim
      if (!flyTo(name)) return rawZoom.call(this, name);
    };
  }

  // ---- reset clears the lock -------------------------------------------
  const reset = document.getElementById('btnReset');
  if (reset) reset.addEventListener('click', () => { follow = null; flying = null; setKey(false); }, true);

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
    zoomBy,
    clear() { follow = null; setKey(false); },
    get keyLight() { return keyLight; },
    get following() { return follow && follow.name; },
    // the pose the follow loop will settle on, for verification
    get pose() {
      if (!follow) return null;
      const p = follow.mesh.getWorldPosition(V());
      return { name: follow.name, gap: +(follow.localOffset || follow.offset).length().toFixed(1),
               targetLen: +p.length().toFixed(1) };
    },
  };
})();
