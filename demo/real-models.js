/* REAL SPACECRAFT — NASA's own models (public domain, github.com/nasa/NASA-3D-Resources)
 *
 * Swaps only the VISUAL children of each existing group, so every reference
 * app.js holds — orbit maths, raycast targets, highlight handling, zoomToBody
 * — keeps working untouched. Loaded on idle, after first paint.
 *
 * Covers the main solar-system scene AND the Moon-surface scene, which is
 * built lazily the first time the visitor enters it.
 *
 * On Starship HLS, honestly: NASA publishes no Starship model (it is a SpaceX
 * vehicle), so there is no photoreal public-domain option the way there is
 * for ISS and LRO. Choices are the existing procedural HLS or the real Apollo
 * Lunar Module, which is a genuine lander but a DIFFERENT vehicle.
 */
(function () {
  if (typeof THREE.GLTFLoader === 'undefined') return;

  const P = new URLSearchParams(location.search);
  // HWO stays procedural by default. ATLAST reads as a large blank slab from
  // most angles — you see the sunshield, not a telescope — whereas the
  // procedural build shows its segmented hexagonal primary, which is what
  // makes it legible as an observatory at a glance.
  const HWO_VARIANT = P.get('hwo') || 'procedural';  // procedural | atlast | jwst | roman
  const LANDER = P.get('lander') || 'procedural';   // procedural | apollo

  const HWO_URLS = {
    atlast: 'assets/models/hwo-atlast.glb',
    jwst:   'assets/models/hwo-jwst.glb',
    roman:  'assets/models/hwo-roman.glb',
  };

  const loader = new THREE.GLTFLoader();
  if (THREE.DRACOLoader) {
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath('vendor/loaders/draco/');
    loader.setDRACOLoader(draco);
  }

  const cache = {};
  function load(url) {
    if (!cache[url]) cache[url] = new Promise((res, rej) =>
      loader.load(url, g => res(g.scene), undefined, rej));
    return cache[url];
  }

  const box = new THREE.Box3(), size = new THREE.Vector3();
  function longestSide(obj) {
    box.setFromObject(obj); box.getSize(size);
    return Math.max(size.x, size.y, size.z) || 1;
  }

  const LOD_DIST = 55;
  const lods = [];

  function swap(group, src, opts) {
    const o = Object.assign({ lod: true, scale: 1 }, opts);
    const model = src.clone(true);
    const target = longestSide(group) * o.scale;
    const cheap = group.children.filter(c => !c.isLineSegments);

    // Parent FIRST, then size: setFromObject reports world-space bounds and
    // these groups carry their own scale, so measuring while detached
    // silently mis-sizes the model.
    group.add(model);
    model.scale.multiplyScalar(target / longestSide(model));

    box.setFromObject(model);
    const c = group.worldToLocal(box.getCenter(new THREE.Vector3()));
    model.position.sub(c);

    if (renderer.outputEncoding === THREE.sRGBEncoding) {
      model.traverse(n => {
        if (!n.isMesh) return;
        (Array.isArray(n.material) ? n.material : [n.material]).forEach(m => {
          if (m && m.map && m.map.encoding !== THREE.sRGBEncoding) {
            m.map.encoding = THREE.sRGBEncoding; m.needsUpdate = true;
          }
        });
      });
    }

    // NASA's ISS (B) carries a detached cluster of flat discs floating well
    // above the station — 7 meshes at +2.75 against a next-nearest of -0.48.
    // Not part of the ISS; hide anything sitting far above the main body.
    if (o.stripFloaters) {
      const whole = new THREE.Box3().setFromObject(model);
      const centre = whole.getCenter(new THREE.Vector3());
      const half = whole.getSize(new THREE.Vector3()).y / 2;
      const _mb = new THREE.Box3(), _mc = new THREE.Vector3();
      model.traverse(n => {
        if (!n.isMesh) return;
        _mb.setFromObject(n); _mb.getCenter(_mc);
        if (_mc.y - centre.y > half * 0.85) n.visible = false;
      });
    }

    group.userData.realModel = true;
    if (o.lod) {
      model.visible = false;                   // far LOD by default
      lods.push({ group, cheap, real: model });
    } else {
      cheap.forEach(x => { x.visible = false; });
    }
    return model;
  }

  // ---- mobile: fetch on approach, not on startup ------------------------
  // iss.glb (466K) + lro.glb (639K) pull in the Draco decoder they are
  // compressed with (274.9K wasm + 52.3K wrapper), which measured as the LAST
  // two resources to finish loading on the page. 1.43 MB in total.
  //
  // The LOD below hides both behind their procedural stand-ins until the
  // camera is within LOD_DIST (55). The opening pose sits ~370 units out and
  // the ISS orbits Earth at ~110 from the Sun, so the closest the camera ever
  // gets at rest is ~260 - the real models cannot be on screen at load. On a
  // phone that 1.43 MB is competing for bandwidth with the textures and
  // figures the visitor CAN see.
  //
  // So on mobile the main-scene models are queued and fetched when the camera
  // comes near, which includes the flight that opening their publication
  // starts. Desktop keeps the eager idle-time load exactly as it was.
  //
  // Only LOD'd attaches are deferred. The Moon-surface ones pass lod:false
  // because you are standing next to them, and they are already lazy in
  // practice: that scene is not built until the visitor enters it.
  const DEFER = document.documentElement.classList.contains('mobile-device');
  const LOAD_DIST = LOD_DIST * 3;      // begin fetching before it is needed
  const queued = [];

  function startLoad(group, url, opts) {
    load(url).then(src => {
      try { swap(group, src, opts); }
      catch (e) { console.warn('[real-models] swap failed', url, e); }
    }).catch(e => console.warn('[real-models] load failed', url, e));
  }

  function attach(group, url, opts) {
    if (!group || group.userData.realModel) return;
    if (DEFER && (!opts || opts.lod !== false)) { queued.push({ group, url, opts }); return; }
    startLoad(group, url, opts);
  }

  // ---- main scene -------------------------------------------------------
  function doMainScene() {
    if (typeof bodies === 'undefined') return;
    attach(bodies.ISS && bodies.ISS.mesh, 'assets/models/iss.glb', { stripFloaters: true });
    attach(bodies.LRO && bodies.LRO.mesh, 'assets/models/lro.glb');
    if (HWO_URLS[HWO_VARIANT]) {
      attach(bodies.HWO && bodies.HWO.mesh, HWO_URLS[HWO_VARIANT]);
    }
    if (LANDER === 'apollo') {
      attach(bodies.Starship && bodies.Starship.mesh, 'assets/models/lander-apollo-lm.glb');
    }
  }

  // ---- Moon-surface scene ----------------------------------------------
  // Built lazily on first entry, so watch for it rather than assuming it
  // exists. No LOD here: the visitor is standing on the surface, always close.
  function doMoonScene() {
    // On a phone this is another 639K plus the 327K Draco decoder, for a
    // scene the visitor may never open. The comment above says "built lazily
    // on first entry", but app.js assigns moonLRO during startup, so the
    // 500ms poll in ready() attached it immediately - which is how lro.glb
    // and the whole decoder stayed on the critical path even after the main
    // scene was deferred. Wait until the visitor is actually standing there.
    // (Desktop keeps loading it up front, unchanged.)
    if (DEFER && !(typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive)) return;
    // moon-view.js sets keepProcedural: at surface scale the original
    // procedural LRO was preferred, so this scene opts out of the swap.
    if (typeof moonLRO !== 'undefined' && moonLRO &&
        !moonLRO.userData.realModel && !moonLRO.userData.keepProcedural) {
      attach(moonLRO, 'assets/models/lro.glb', { lod: false });
    }
    if (LANDER === 'apollo' &&
        typeof moonStarship !== 'undefined' && moonStarship && !moonStarship.userData.realModel) {
      attach(moonStarship, 'assets/models/lander-apollo-lm.glb', { lod: false });
    }
  }

  function ready() {
    doMainScene();
    doMoonScene();
    // Poll briefly for the Moon scene; stop once it has been handled or after
    // a bounded number of attempts, so this never becomes a permanent timer.
    let tries = 0;
    const iv = setInterval(() => {
      doMoonScene();
      const done = typeof moonLRO !== 'undefined' && moonLRO && moonLRO.userData.realModel;
      if (done || ++tries > 600) clearInterval(iv);   // ~5 min ceiling
    }, 500);
  }

  if ('requestIdleCallback' in window) requestIdleCallback(ready, { timeout: 4000 });
  else setTimeout(ready, 1500);

  // ---- LOD tick ---------------------------------------------------------
  const camPos = new THREE.Vector3(), objPos = new THREE.Vector3();
  let moonReleased = false;
  (function lodTick() {
    requestAnimationFrame(lodTick);
    // Entering the Moon surface is the trigger for that scene's models. This
    // rides the loop that already exists rather than adding a timer, and
    // ready()'s poll gives up after ~5 minutes, which a visitor can outlast.
    if (DEFER && !moonReleased &&
        typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive) {
      moonReleased = true;
      doMoonScene();
    }
    if (!lods.length && !queued.length) return;
    camera.getWorldPosition(camPos);
    // release a queued model once the camera is close enough to want it soon
    for (let i = queued.length - 1; i >= 0; i--) {
      const q = queued[i];
      q.group.getWorldPosition(objPos);
      if (camPos.distanceTo(objPos) > LOAD_DIST) continue;
      queued.splice(i, 1);
      startLoad(q.group, q.url, q.opts);
    }
    if (!lods.length) return;
    for (const l of lods) {
      l.group.getWorldPosition(objPos);
      const near = camPos.distanceTo(objPos) < LOD_DIST;
      if (l.real.visible === near) continue;
      l.real.visible = near;
      l.cheap.forEach(c => { c.visible = !near; });
    }
  })();
})();
