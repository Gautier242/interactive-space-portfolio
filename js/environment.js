// ============================================================================
// FIRST LIGHT — deep-space environment
// Multi-layer starfield (far twinkle dome / mid parallax field / near flare
// stars), procedural Milky Way + nebula dome, and the granulated sun with
// corona. Everything is generated in-code: no textures downloaded, nothing
// licensed. Exposes window.SpaceEnv = { init, initSun, update }.
// ============================================================================
(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Low tier: mobile devices or low-memory machines get half the stars and a
  // smaller nebula canvas. (navigator.deviceMemory is Chrome-only; undefined
  // elsewhere, which keeps the high tier.)
  var lowTier = document.documentElement.classList.contains('mobile-device') ||
    (navigator.deviceMemory !== undefined && navigator.deviceMemory <= 4);

  var timeUniforms = [];

  // --- shared star color palette (cool white / warm white / amber-orange) ---
  function starColor(target) {
    var t = Math.random();
    if (t < 0.62) target.setHSL(0.58, 0.25, 0.82 + Math.random() * 0.18);
    else if (t < 0.85) target.setHSL(0.13, 0.22, 0.9);
    else if (t < 0.97) target.setHSL(0.07, 0.55, 0.88);
    else target.setHSL(0.62, 0.7, 0.85); // rare hot blue
    return target;
  }

  function pointOnShell(rMin, rMax) {
    var r = rMin + Math.random() * (rMax - rMin);
    var u = Math.random() * 2 - 1;
    var theta = Math.random() * Math.PI * 2;
    var s = Math.sqrt(1 - u * u);
    return [r * s * Math.cos(theta), r * u, r * s * Math.sin(theta)];
  }

  // --------------------------------------------------------------------------
  // Layer 1 — far dome: fixed-size shader points with individual twinkle
  // --------------------------------------------------------------------------
  function makeStarDome() {
    var count = lowTier ? 2600 : 5200;
    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    var size = new Float32Array(count);
    var phase = new Float32Array(count);
    var c = new THREE.Color();
    for (var i = 0; i < count; i++) {
      var p = pointOnShell(5600, 5900);
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      starColor(c);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      // mostly faint, a few bright anchors
      var s = Math.pow(Math.random(), 2.6);
      size[i] = 1.1 + s * 3.4;
      phase[i] = Math.random() * Math.PI * 2;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

    var mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: [
        'attribute vec3 aColor;',
        'attribute float aSize;',
        'attribute float aPhase;',
        'uniform float uTime;',
        'varying vec3 vColor;',
        'varying float vTwinkle;',
        'void main() {',
        '  vColor = aColor;',
        '  vTwinkle = 0.8 + 0.2 * sin(uTime * (0.6 + fract(aPhase) * 1.7) + aPhase * 7.0);',
        '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
        '  gl_PointSize = aSize;',
        '  gl_Position = projectionMatrix * mv;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vColor;',
        'varying float vTwinkle;',
        'void main() {',
        '  vec2 uv = gl_PointCoord - 0.5;',
        '  float d = length(uv);',
        '  float a = smoothstep(0.5, 0.08, d) * vTwinkle;',
        '  gl_FragColor = vec4(vColor, a);',
        '}'
      ].join('\n'),
      transparent: true,
      depthWrite: false
    });
    timeUniforms.push(mat.uniforms.uTime);
    return new THREE.Points(geo, mat);
  }

  // --------------------------------------------------------------------------
  // Layer 2 — mid field: classic attenuated points for camera parallax
  // --------------------------------------------------------------------------
  function makeMidStars() {
    var count = lowTier ? 3500 : 7500;
    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    var c = new THREE.Color();
    for (var i = 0; i < count; i++) {
      var p = pointOnShell(700, 3800);
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      starColor(c);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false
    });
    return new THREE.Points(geo, mat);
  }

  // --------------------------------------------------------------------------
  // Layer 3 — near flare stars: sparse bright points with a cross-flare sprite
  // --------------------------------------------------------------------------
  function makeFlareTexture() {
    var s = 128;
    var cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.12, 'rgba(255,250,240,0.75)');
    g.addColorStop(0.4, 'rgba(220,230,255,0.12)');
    g.addColorStop(1, 'rgba(200,220,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    // diffraction spikes
    ctx.globalCompositeOperation = 'lighter';
    var spike = ctx.createLinearGradient(0, s / 2, s, s / 2);
    spike.addColorStop(0, 'rgba(255,255,255,0)');
    spike.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    spike.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spike;
    ctx.fillRect(0, s / 2 - 1, s, 2);
    var spikeV = ctx.createLinearGradient(s / 2, 0, s / 2, s);
    spikeV.addColorStop(0, 'rgba(255,255,255,0)');
    spikeV.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    spikeV.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spikeV;
    ctx.fillRect(s / 2 - 1, 0, 2, s);
    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function makeNearFlares() {
    var count = lowTier ? 50 : 110;
    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    var c = new THREE.Color();
    for (var i = 0; i < count; i++) {
      var p = pointOnShell(500, 1600);
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      starColor(c);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 30,
      map: makeFlareTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
  }

  // --------------------------------------------------------------------------
  // Nebula / Milky Way dome — procedural canvas texture, generated once
  // --------------------------------------------------------------------------
  function blob(ctx, x, y, r, rgb, alpha) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + alpha + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function makeNebulaDome() {
    var W = lowTier ? 1024 : 2048;
    var H = W / 2;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');

    // Milky Way: a soft diagonal band built from many overlapping dim blobs.
    // Kept intentionally low-luminance so foreground text/objects stay crisp.
    var i, t, x, y, r;
    for (i = 0; i < 260; i++) {
      t = Math.random();
      x = t * W;
      y = H * 0.5 + Math.sin(t * Math.PI * 2.0) * H * 0.13 + (Math.random() - 0.5) * H * 0.16;
      r = (20 + Math.random() * 70) * (W / 1024);
      var kind = Math.random();
      if (kind < 0.55) blob(ctx, x, y, r, '120,150,190', 0.028);        // cool dust
      else if (kind < 0.8) blob(ctx, x, y, r, '190,170,140', 0.022);    // warm dust
      else if (kind < 0.94) blob(ctx, x, y, r, '150,190,200', 0.02);    // teal haze
      else blob(ctx, x, y, r, '60,50,70', 0.05);                        // dark lane
    }
    // sparse wide haze off-band for overall depth
    for (i = 0; i < 34; i++) {
      x = Math.random() * W;
      y = Math.random() * H;
      r = (60 + Math.random() * 120) * (W / 1024);
      blob(ctx, x, y, r, Math.random() < 0.5 ? '110,140,185' : '170,150,130', 0.012);
    }
    // unresolved-star grain along the band
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < (lowTier ? 900 : 2200); i++) {
      t = Math.random();
      x = t * W;
      y = H * 0.5 + Math.sin(t * Math.PI * 2.0) * H * 0.13 + (Math.random() - 0.5) * H * 0.1;
      var a = 0.04 + Math.random() * 0.1;
      ctx.fillStyle = 'rgba(235,240,255,' + a + ')';
      ctx.fillRect(x, y, 1.4, 1.4);
    }

    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    var geo = new THREE.SphereGeometry(6300, 40, 24);
    var mat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = 0.42; // tilt the galactic band across the view
    mesh.rotation.x = 0.15;
    return mesh;
  }

  // --------------------------------------------------------------------------
  // Sun — animated granulation shader + corona sprite + chromosphere rim
  // --------------------------------------------------------------------------
  var SUN_NOISE = [
    // simplex-ish value noise + fbm, compact GLSL
    'vec3 hash3(vec3 p) {',
    '  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),',
    '           dot(p, vec3(269.5, 183.3, 246.1)),',
    '           dot(p, vec3(113.5, 271.9, 124.6)));',
    '  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);',
    '}',
    'float noise3(vec3 p) {',
    '  vec3 i = floor(p); vec3 f = fract(p);',
    '  vec3 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),',
    '                     dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),',
    '                 mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),',
    '                     dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),',
    '             mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),',
    '                     dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),',
    '                 mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),',
    '                     dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);',
    '}',
    'float fbm(vec3 p) {',
    '  float v = 0.0; float a = 0.5;',
    '  for (int k = 0; k < 4; k++) { v += a * noise3(p); p *= 2.1; a *= 0.5; }',
    '  return v;',
    '}'
  ].join('\n');

  function makeSunMaterial() {
    var mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: [
        'varying vec3 vPos;',
        'varying vec3 vNormalW;',
        'varying vec3 vViewDir;',
        'void main() {',
        '  vPos = position;',
        '  vNormalW = normalize(mat3(modelMatrix) * normal);',
        '  vec4 world = modelMatrix * vec4(position, 1.0);',
        '  vViewDir = normalize(cameraPosition - world.xyz);',
        '  gl_Position = projectionMatrix * viewMatrix * world;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime;',
        'varying vec3 vPos;',
        'varying vec3 vNormalW;',
        'varying vec3 vViewDir;',
        SUN_NOISE,
        'void main() {',
        '  vec3 p = normalize(vPos);',
        '  float t = uTime * 0.05;',
        '  vec3 q = p * 3.0 + vec3(fbm(p * 2.0 + t), fbm(p * 2.0 - t), fbm(p * 2.0 + 0.5 * t));',
        '  float g = fbm(q + t * 0.7);',
        '  float cells = fbm(p * 9.0 + vec3(t * 2.0));',
        '  float v = clamp(0.55 + g * 0.7 + cells * 0.35, 0.0, 1.0);',
        '  vec3 cool = vec3(0.98, 0.45, 0.08);',
        '  vec3 mid  = vec3(1.0, 0.72, 0.25);',
        '  vec3 hot  = vec3(1.0, 0.96, 0.83);',
        '  vec3 col = mix(cool, mid, smoothstep(0.15, 0.6, v));',
        '  col = mix(col, hot, smoothstep(0.62, 0.95, v));',
        '  float limb = pow(clamp(dot(vNormalW, vViewDir), 0.0, 1.0), 0.55);',
        '  col *= 0.55 + 0.45 * limb;',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
      ].join('\n')
    });
    timeUniforms.push(mat.uniforms.uTime);
    return mat;
  }

  function makeCoronaTexture() {
    var s = 512;
    var cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(s / 2, s / 2, s * 0.1, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,235,200,0.55)');
    g.addColorStop(0.18, 'rgba(255,190,110,0.32)');
    g.addColorStop(0.45, 'rgba(255,140,50,0.1)');
    g.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    var tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function initSun(sun) {
    sun.material.dispose();
    sun.material = makeSunMaterial();

    var corona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeCoronaTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    corona.scale.set(150, 150, 1);
    sun.add(corona);

    // thin chromosphere rim just above the photosphere
    var rim = new THREE.Mesh(
      new THREE.SphereGeometry(19.2, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: [
          'varying vec3 vNormalW;',
          'varying vec3 vViewDir;',
          'void main() {',
          '  vNormalW = normalize(mat3(modelMatrix) * normal);',
          '  vec4 world = modelMatrix * vec4(position, 1.0);',
          '  vViewDir = normalize(cameraPosition - world.xyz);',
          '  gl_Position = projectionMatrix * viewMatrix * world;',
          '}'
        ].join('\n'),
        fragmentShader: [
          'varying vec3 vNormalW;',
          'varying vec3 vViewDir;',
          'void main() {',
          '  float f = 1.0 - abs(dot(vNormalW, vViewDir));',
          '  float a = pow(f, 3.5) * 0.9;',
          '  gl_FragColor = vec4(1.0, 0.55, 0.18, a);',
          '}'
        ].join('\n'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.FrontSide
      })
    );
    sun.add(rim);
  }

  function init(scene) {
    scene.add(makeStarDome());
    scene.add(makeMidStars());
    scene.add(makeNearFlares());
    scene.add(makeNebulaDome());
  }

  function update(t) {
    if (reducedMotion) t = 0;
    for (var i = 0; i < timeUniforms.length; i++) timeUniforms[i].value = t;
  }

  window.SpaceEnv = { init: init, initSun: initSun, update: update, lowTier: lowTier };
})();
