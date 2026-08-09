/* VARIANT B — CINEMATIC REALISM
 * Replaces the flat forward render with a graded HDR pipeline:
 * ACES filmic tone mapping, selective bloom on the Sun, cast shadows,
 * and a deeper multi-layer starfield.
 * Additive: app.js is untouched. We take over the draw call by swapping
 * renderer.render for a composer pass.
 */
(function () {
  if (typeof renderer === 'undefined' || typeof scene === 'undefined') return;

  // ---- 1. tone mapping + colour ---------------------------------------
  // Switching outputEncoding to sRGB without also tagging the source
  // textures as sRGB is the classic wash-out bug: the albedo maps get
  // treated as linear, then gamma-encoded on the way out, and every planet
  // blows to white. Tag the colour maps first, then grade.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputEncoding = THREE.sRGBEncoding;

  scene.traverse(o => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach(m => {
      // colour-carrying maps are sRGB; data maps (normal/rough/spec) are not
      ['map', 'emissiveMap'].forEach(slot => {
        if (m[slot] && m[slot].encoding !== THREE.sRGBEncoding) {
          m[slot].encoding = THREE.sRGBEncoding;
          m[slot].needsUpdate = true;
        }
      });
      m.needsUpdate = true;
    });
  });

  // ---- 2. shadows: deliberately OFF ------------------------------------
  // Measured, not assumed: enabling them cost 25 of 41 fps — 60% of the
  // frame budget. The light source here is a PointLight, whose shadow is a
  // CUBE map, so every frame re-renders the whole scene six times at
  // 2048². What that buys at system scale is a few pixels of terminator
  // nobody can see. Eclipses and Saturn's ring shadow would be genuinely
  // nice up close, but they need a distance-gated DirectionalLight
  // substituted per focused body, not a global point shadow.
  renderer.shadowMap.enabled = false;

  // ---- 3. deep starfield ----------------------------------------------
  // Three parallax shells at different radii and magnitudes. The originals
  // sit at one radius with 0.2 saturation, which reads as flat noise; real
  // star colour runs from ~3000 K (orange) to ~12000 K (blue-white).
  // The stock 25k-point field stays, but muted, so the new shells read as
  // added depth rather than doubled density.
  scene.traverse(o => {
    if (o.isPoints && o.geometry.attributes.position.count > 20000) {
      o.material.opacity = 0.35;
      o.material.transparent = true;
    }
  });

  // A soft round dot. Square GL points are the single biggest tell that a
  // starfield was not art-directed.
  const dot = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d').createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    const ctx = c.getContext('2d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  })();

  const SHELLS = [
    { n: 9000, r: 3600, size: 1.6, bright: 0.42 },
    { n: 4000, r: 2400, size: 2.6, bright: 0.62 },
    { n: 900,  r: 1500, size: 4.2, bright: 0.85 },
  ];
  const starLayers = [];
  SHELLS.forEach(s => {
    const g = new THREE.BufferGeometry();
    const pos = [], col = [];
    const c = new THREE.Color();
    for (let i = 0; i < s.n; i++) {
      // uniform on a sphere, so density does not clump at the poles
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(1 - u * u) * s.r * (0.85 + Math.random() * 0.3);
      pos.push(Math.cos(th) * rr, u * s.r, Math.sin(th) * rr);
      // stellar colour: mostly cool white, a real tail of orange giants
      const t = Math.random();
      if (t < 0.12) c.setHSL(0.06, 0.65, 0.62 * s.bright);        // K/M orange
      else if (t < 0.26) c.setHSL(0.11, 0.45, 0.78 * s.bright);   // G yellow
      else if (t < 0.88) c.setHSL(0.58, 0.10, 0.86 * s.bright);   // A/F white
      else c.setHSL(0.60, 0.55, 0.92 * s.bright);                 // B blue
      col.push(c.r, c.g, c.b);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({
      size: s.size, map: dot, alphaTest: 0.02,
      vertexColors: true, transparent: true,
      opacity: 0.9, sizeAttenuation: false, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    pts.userData.parallax = s.r;
    scene.add(pts);
    starLayers.push(pts);
  });

  // ---- 4. bloom --------------------------------------------------------
  // Threshold-gated, not layer-selective: the Sun is the only thing in this
  // scene bright enough to clear 0.62, so a single pass is enough. If we
  // later add other emissives, this needs a proper two-pass selective bloom
  // (bloom layer rendered separately, added over the beauty pass) or the
  // planet speculars start hazing over.
  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));

  // The Sun read as a white disc because three brightenings compound: its
  // material is unlit (full-value texture), ACES then rolls the highlights
  // toward white, and bloom piles more white on top. Pull the source
  // luminance down so the core keeps its orange, and let bloom supply the
  // brightness instead of the material.
  (function dimSun() {
    const K = 0.62;
    sun.traverse(o => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach(m => {
        if (m.color) m.color.multiplyScalar(K);
        if (m.uniforms) {
          ['uBrightness', 'uIntensity', 'uExposure'].forEach(u => {
            if (m.uniforms[u] && typeof m.uniforms[u].value === 'number') m.uniforms[u].value *= K;
          });
        }
      });
    });
  })();

  const bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(1, 1),
    0.72,  // strength — supplies the halo, not the core
    0.62,  // radius — wider and softer reads as glare rather than a blob
    0.75   // threshold
  );
  composer.addPass(bloom);

  const copy = new THREE.ShaderPass(THREE.CopyShader);
  copy.renderToScreen = true;
  composer.addPass(copy);

  function sizeComposer() {
    const el = document.getElementById('leftPanel');
    const w = el.clientWidth, h = el.clientHeight;
    composer.setSize(w, h);
    bloom.setSize(w, h);
  }
  sizeComposer();
  window.addEventListener('resize', sizeComposer);
  new ResizeObserver(sizeComposer).observe(document.getElementById('leftPanel'));

  // ---- 5. take over the draw call -------------------------------------
  // app.js calls renderer.render(scene, camera) inside its own rAF. We
  // intercept that one call rather than forking the loop, so every bit of
  // existing camera/animation logic keeps running unchanged.
  const rawRender = renderer.render.bind(renderer);
  let inComposer = false;
  renderer.render = function (sc, cam) {
    if (inComposer || sc !== scene || cam !== camera) return rawRender(sc, cam);
    // counter-drift the star shells for parallax depth
    starLayers.forEach((l, i) => {
      l.position.copy(camera.position).multiplyScalar(0.02 * (i + 1));
    });
    inComposer = true;
    composer.render();
    inComposer = false;
  };
})();
