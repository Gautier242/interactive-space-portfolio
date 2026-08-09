/* MOON SURFACE VIEW — simplified and restricted.
 *
 * Asked for:
 *   - keep the ORIGINAL procedural LRO here (preferred over the NASA model
 *     at this scale), so real-models.js must not touch the Moon scene
 *   - only the objects that are actually on/above the Moon are selectable:
 *     Starship, VIPER, LRO, Earth — plus the Sun, and only while it is
 *     genuinely above the horizon
 *   - no orbital accuracy needed here: a fixed Moon with Earth (and the Sun)
 *     moving in the sky is enough
 */
(function () {
  // 1. Keep the procedural LRO on the Moon. real-models.js checks this flag
  //    before swapping, so setting it early is enough to opt out.
  const guard = setInterval(() => {
    if (typeof moonLRO !== 'undefined' && moonLRO) {
      moonLRO.userData.keepProcedural = true;
      clearInterval(guard);
    }
  }, 300);
  setTimeout(() => clearInterval(guard), 120000);

  // 2. No Sun disc in the Moon's sky.
  //    At the south-pole site the Sun sits at grazing elevation and is not
  //    what you are meant to be looking at; the version I added read as a
  //    bright blob parked beside Starship. The directional light already
  //    carries the lighting story through the long shadows.
  const SHOW_SUN = false;

  let moonSun = null;
  function ensureSun() {
    if (!SHOW_SUN) return;
    if (moonSun || typeof moonScene === 'undefined' || !moonScene) return;
    const g = new THREE.Mesh(
      new THREE.SphereGeometry(6, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff4d6 })
    );
    g.userData = { name: 'Sun', type: 'clickable' };
    // Low in the sky: the long shadows are what make a lunar scene read.
    g.position.set(-180, 55, -260);
    moonScene.add(g);

    // A SpriteMaterial with no map draws its full quad — which rendered as
    // an opaque beige SQUARE hanging in the lunar sky. A sprite glow needs
    // an actual radial-falloff texture.
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0.00, 'rgba(255,246,220,0.95)');
    grd.addColorStop(0.18, 'rgba(255,238,190,0.55)');
    grd.addColorStop(0.45, 'rgba(255,228,160,0.16)');
    grd.addColorStop(1.00, 'rgba(255,220,140,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 64, 64);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(34, 34, 1);
    halo.raycast = () => {};          // decoration must not be clickable
    g.add(halo);
    moonSun = g;
  }

  // 3. Restrict what can be picked. app.js builds its own clickable list per
  //    click; rather than patch three call sites, hide anything that should
  //    not be selectable from the raycaster entirely.
  // 3. Frame the site with Earth BEHIND it. Not a zoom onto Earth — the
  //    surface hardware stays the subject in the foreground, and Earth hangs
  //    in the sky behind, which is what makes the shot read as "the Moon".
  //    So: stand on the far side of the objects from Earth and look past
  //    them toward it.
  function frameWithEarthBehind() {
    if (typeof moonEarth === 'undefined' || !moonEarth ||
        typeof moonCamera === 'undefined' || !moonCamera) return false;

    const earth = moonEarth.getWorldPosition(new THREE.Vector3());

    // Anchor on the hardware that is actually ON the ground. LRO orbits 30
    // units overhead, and including it in the centroid dragged the standpoint
    // off the surface cluster entirely — Starship ended up 53° out of frame.
    const pts = [];
    [typeof moonStarship !== 'undefined' && moonStarship,
     typeof moonViper !== 'undefined' && moonViper].forEach(o => {
      if (o) pts.push(o.getWorldPosition(new THREE.Vector3()));
    });
    const site = pts.length
      ? pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length)
      : new THREE.Vector3(-10, 0, -18);

    // horizontal direction from the site toward Earth
    const toEarth = earth.clone().sub(site); toEarth.y = 0; toEarth.normalize();

    // The hardware is spread ~50 units across, and the left panel is taller
    // than it is wide, so the horizontal field is the binding constraint.
    // At BACK=62 only VIPER stayed in frame; this pulls back far enough to
    // hold all three with Earth still in the sky behind them.
    // STANDING ON THE SURFACE, not surveying it from above. The previous
    // pose looked down from ~90 units up, which reads as a map. Eye height
    // with a level horizon is what makes it feel like being there: the
    // regolith fills the lower half, the hardware stands on the horizon line,
    // and Earth hangs in the black above it.
    const EYE = 2.4;                       // a person's eye height
    const surfaceY = (typeof MoonMission !== 'undefined' && MoonMission.heightAt)
      ? MoonMission.heightAt(site.x, site.z) : site.y;

    // Must be in frame: the surface hardware and Earth. LRO is a bonus —
    // requiring it too over-constrains a portrait frame.
    const targets = pts.concat([earth]);
    const probe = moonCamera.clone();

    const RIGHT = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), toEarth).normalize();

    function poseFor(back, lat, tilt) {
      // Stand back from the hardware and OFF to one side. Directly behind it
      // would line the Starship up in front of Earth and hide it; stepping
      // sideways puts the hardware on one edge with Earth clear in the sky.
      const pos = site.clone().addScaledVector(toEarth, -back).addScaledVector(RIGHT, lat);
      pos.y = ((typeof MoonMission !== 'undefined' && MoonMission.heightAt)
        ? MoonMission.heightAt(pos.x, pos.z) : surfaceY) + EYE;
      // Aim level toward Earth, tilted only slightly, so the horizon sits low
      // and most of the frame is sky — the view from standing there.
      const dirE = earth.clone().sub(pos).normalize();
      const flat = new THREE.Vector3(dirE.x, 0, dirE.z).normalize();
      const right = new THREE.Vector3().crossVectors(flat, new THREE.Vector3(0, 1, 0)).normalize();
      const aimDir = flat.clone().applyAxisAngle(right, -tilt);   // +θ tilts up
      return { pos, aim: pos.clone().addScaledVector(aimDir, 150) };
    }

    function score(p) {
      probe.position.copy(p.pos);
      probe.lookAt(p.aim);
      probe.updateMatrixWorld(true);
      let worst = 0;
      for (const t of targets) {
        const q = t.clone().project(probe);
        if (q.z > 1) return Infinity;
        worst = Math.max(worst, Math.abs(q.x), Math.abs(q.y));
      }
      return worst;   // < 1 means everything is inside the frame
    }

    // Closest acceptable pose, not the best-scoring one: scoring on smallest
    // deviation rewards backing away until the hardware is specks.
    const FIT = 0.85;
    let best = null, fallback = null, fallbackScore = Infinity;
    outer:
    for (let back = 26; back <= 150; back += 4) {
      for (let lat = 0; lat <= 60; lat += 6) {
        for (let tiltDeg = -12; tiltDeg <= 8; tiltDeg += 2) {
          const p = poseFor(back, lat, tiltDeg * Math.PI / 180);
          const s = score(p);
          if (s < fallbackScore) { fallbackScore = s; fallback = p; }
          if (s < FIT) { best = p; break outer; }
        }
      }
    }
    best = best || fallback;
    if (!best) return false;
    const want = best.pos, aim = best.aim;

    // Cut straight to the final pose — no lerp. app.js sets its own overview
    // framing synchronously on entry, so animating from it showed TWO moon
    // views: the overview, then a slide to this one. Snapping means the
    // visitor only ever sees the standing view.
    moonCamera.position.copy(want);
    moonCamera.lookAt(aim);
    return true;
  }

  // ---- warm the Moon scene ---------------------------------------------
  // Clicking the Moon took ~10s to show anything. Measured: building the
  // scene is only 258ms — the other ~9.9s is the FIRST RENDER compiling
  // shaders and uploading textures for 154 objects. So build it and
  // precompile on idle, long before anyone clicks. renderer.compile() does
  // exactly this without drawing a frame.
  let warmed = false;
  function warmMoon() {
    if (warmed) return;
    warmed = true;
    try {
      if (typeof moonScene === 'undefined' || !moonScene) {
        if (typeof initMoonSurface === 'function') initMoonSurface();
      }
      if (typeof moonRenderer !== 'undefined' && moonRenderer && moonScene && moonCamera) {
        // compile() alone left ~6.8s of stall: it prepares programs but the
        // textures only upload on the first real draw. Actually rendering a
        // frame (to the hidden canvas) pays that cost here instead.
        moonRenderer.compile(moonScene, moonCamera);
        moonRenderer.render(moonScene, moonCamera);
      }
    } catch (e) { console.warn('[moon-view] warm failed', e); warmed = false; }
  }
  if ('requestIdleCallback' in window) requestIdleCallback(warmMoon, { timeout: 8000 });
  else setTimeout(warmMoon, 6000);

  // Frame it in the SAME tick app.js sets its overview pose. A rAF watcher
  // necessarily runs a frame later, so the overview was rendering for a few
  // frames first and read as a jump between two moon views. initMoonSurface
  // runs synchronously inside zoomToBody, so by the time it returns the
  // scene and its objects exist and can be framed immediately.
  const rawZoom = window.zoomToBody;
  if (typeof rawZoom === 'function') {
    window.zoomToBody = function (name) {
      const r = rawZoom.apply(this, arguments);
      if (name === 'Moon') {
        if (window.__objReadout) window.__objReadout.setInfo(false, { silent: true });
        restrict();
        frameWithEarthBehind();
      }
      return r;
    };
  }

  let wasOnMoon = false;
  (function watchEntry() {
    requestAnimationFrame(watchEntry);
    const on = typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive;
    if (on === wasOnMoon) return;
    wasOnMoon = on;
    if (!on) return;
    if (window.__objReadout) window.__objReadout.setInfo(false, { silent: true });
    // Same frame if the scene is already built (initMoonSurface runs
    // synchronously), so the overview pose is never rendered. The retry
    // covers the very first entry, where the scene is created on the way in.
    if (!frameWithEarthBehind()) setTimeout(() => { restrict(); frameWithEarthBehind(); }, 60);
    else restrict();
  })();

  function restrict() {
    if (typeof moonScene === 'undefined' || !moonScene) return;
    ensureSun();
    const allowed = new Set(['Starship', 'VIPER', 'LRO', 'Earth']);
    moonScene.traverse(o => {
      const n = o.userData && o.userData.name;
      if (!n) return;
      if (!allowed.has(n) && o.userData.type === 'clickable') {
        o.userData.type = null;
      }
    });
    // The Sun is only a target while it is actually up.
    if (moonSun) {
      const up = moonSun.position.y > 2;
      moonSun.userData.type = up ? 'clickable' : null;
      moonSun.visible = up;
    }
  }

  let tries = 0;
  const iv = setInterval(() => {
    if (typeof moonScene !== 'undefined' && moonScene) { restrict(); clearInterval(iv); }
    if (++tries > 600) clearInterval(iv);
  }, 500);
})();
