// ============================================================================
// v3 — photorealistic planetary rendering
// Real imagery-derived textures (Solar System Scope, CC BY 4.0) for the nine
// textured bodies + Earth's Moon; Earth gets a day/night/specular shader with
// a drifting cloud layer; Saturn's ring uses the real ring-alpha strip with an
// analytic planet shadow; every planet carries its true axial tilt. Small
// moons and asteroids (no public imagery at useful resolution) use muted
// procedural crater/ice/band materials so they read as grey rocky bodies.
// Exposes window.PlanetsReal = { createPlanet, addRing, applySunTexture,
//                                setHighlight, update }.
// ============================================================================
(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var loader = new THREE.TextureLoader();
  var timeUniforms = [];
  var cloudLayers = [];

  function tex(file) {
    var t = loader.load('assets/textures/' + file);
    t.anisotropy = 4;
    return t;
  }

  // ---- real axial tilts (degrees) -----------------------------------------
  var TILT = {
    Mercury: 0.03, Venus: 2.6, Earth: 23.4, Moon: 6.7, Mars: 25.2,
    Jupiter: 3.1, Saturn: 26.7, Uranus: 97.8, Neptune: 28.3
  };

  var MAPS = {
    Mercury: '2k_mercury.jpg',
    Venus: '2k_venus_atmosphere.jpg',
    Moon: '2k_moon.jpg',
    Mars: '2k_mars.jpg',
    Jupiter: '2k_jupiter.jpg',
    Saturn: '2k_saturn.jpg',
    Uranus: '2k_uranus.jpg',
    Neptune: '2k_neptune.jpg'
  };

  // ==========================================================================
  // Earth: textured day/night shader + specular ocean glint + cloud sphere
  // ==========================================================================
  var EARTH_VERT = [
    'varying vec2 vUv;',
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vUv = uv;',
    '  vNormalW = normalize(mat3(modelMatrix) * normal);',
    '  vec4 world = modelMatrix * vec4(position, 1.0);',
    '  vWorldPos = world.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * world;',
    '}'
  ].join('\n');

  var EARTH_FRAG = [
    'uniform sampler2D dayMap;',
    'uniform sampler2D nightMap;',
    'uniform sampler2D specMap;',
    'uniform float uHighlight;',
    'varying vec2 vUv;',
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vec3 N = normalize(vNormalW);',
    '  vec3 L = normalize(-vWorldPos);',   // sun sits at the world origin
    '  vec3 V = normalize(cameraPosition - vWorldPos);',
    '  float ndl = dot(N, L);',
    '  float day = smoothstep(-0.03, 0.22, ndl);',
    '  vec3 dayCol = texture2D(dayMap, vUv).rgb;',
    '  vec3 nightCol = texture2D(nightMap, vUv).rgb;',
    // city lights: keep only the warm bright pixels, gently boosted
    '  vec3 cities = nightCol * vec3(1.15, 0.95, 0.75) * 1.25;',
    '  vec3 col = mix(cities, dayCol, day);',
    '  col *= 0.25 + 0.75 * clamp(day + 0.08, 0.0, 1.0);',
    // ocean sun glint from the specular mask
    '  float specMask = texture2D(specMap, vUv).r;',
    '  vec3 R = reflect(-L, N);',
    '  float spec = pow(clamp(dot(R, V), 0.0, 1.0), 32.0) * specMask * day;',
    '  col += vec3(1.0, 0.97, 0.9) * spec * 0.45;',
    // thin blue atmospheric rim, lit side only
    '  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.6);',
    '  col += vec3(0.28, 0.47, 0.8) * fres * day * 0.45;',
    '  col += vec3(0.9, 0.95, 1.0) * uHighlight * 0.35;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // ==========================================================================
  // Generic textured planet: Lambert terminator + tiny highlight uniform,
  // done as a shader so day/night falloff matches Earth and stays crisp.
  // ==========================================================================
  var PLANET_FRAG = [
    'uniform sampler2D map;',
    'uniform float uHighlight;',
    'uniform float uNightFloor;',
    'varying vec2 vUv;',
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vec3 N = normalize(vNormalW);',
    '  vec3 L = normalize(-vWorldPos);',
    '  float ndl = dot(N, L);',
    '  float day = smoothstep(-0.04, 0.22, ndl);',
    '  vec3 col = texture2D(map, vUv).rgb;',
    '  col *= uNightFloor + (1.0 - uNightFloor) * day;',
    '  col += vec3(0.9, 0.95, 1.0) * uHighlight * 0.35;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // ==========================================================================
  // Procedural material for small moons/asteroids (no public imagery):
  // muted grey/tan crater and ice surfaces, same lighting model.
  // ==========================================================================
  var NOISE = [
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
    '  for (int k = 0; k < 5; k++) { v += a * noise3(p); p *= 2.03; a *= 0.5; }',
    '  return v;',
    '}',
    'float ridged(vec3 p) {',
    '  float v = 0.0; float a = 0.55;',
    '  for (int k = 0; k < 4; k++) { v += a * (1.0 - abs(noise3(p))); p *= 2.15; a *= 0.5; }',
    '  return v;',
    '}'
  ].join('\n');

  var ROCK_VERT = [
    'varying vec3 vPos;',
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vPos = normalize(position);',
    '  vNormalW = normalize(mat3(modelMatrix) * normal);',
    '  vec4 world = modelMatrix * vec4(position, 1.0);',
    '  vWorldPos = world.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * world;',
    '}'
  ].join('\n');

  var ROCK_FRAG = [
    'uniform float uHighlight;',
    'uniform vec3 uColDeep;',
    'uniform vec3 uColMid;',
    'uniform vec3 uColHigh;',
    'uniform float uScale;',
    'uniform float uCrater;',
    'uniform float uContrast;',
    'varying vec3 vPos;',
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    NOISE,
    'void main() {',
    '  vec3 p = vPos;',
    '  float v = fbm(p * uScale) * 0.5 + 0.5;',
    '  float cr = ridged(p * uScale * 3.7);',
    '  v = mix(v, v * (0.62 + 0.38 * cr), uCrater);',
    '  v = clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0);',
    '  vec3 col = mix(uColDeep, uColMid, smoothstep(0.12, 0.55, v));',
    '  col = mix(col, uColHigh, smoothstep(0.58, 0.92, v));',
    '  vec3 N = normalize(vNormalW);',
    '  vec3 L = normalize(-vWorldPos);',
    '  float day = smoothstep(-0.04, 0.22, dot(N, L));',
    '  col *= 0.04 + 0.96 * day;',
    '  col += vec3(0.9, 0.95, 1.0) * uHighlight * 0.35;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // muted, astronomer-plausible albedos for the untextured bodies
  var ROCK_RECIPES = {
    Io:       { deep: 0x6b5a28, mid: 0xb0a058, high: 0xd8cfa0, scale: 3.6, crater: 0.5, contrast: 1.0 },
    Europa:   { deep: 0x8d8578, mid: 0xc7c0b2, high: 0xe8e4da, scale: 3.0, crater: 0.2, contrast: 0.8 },
    Ganymede: { deep: 0x4e463c, mid: 0x9a8d7d, high: 0xc4bbac, scale: 3.1, crater: 0.65, contrast: 1.0 },
    Callisto: { deep: 0x322e28, mid: 0x6f675c, high: 0x9d9587, scale: 3.6, crater: 1.0, contrast: 1.15 },
    Titan:    { deep: 0x8a6428, mid: 0xc09040, high: 0xe0bc7a, scale: 2.0, crater: 0.0, contrast: 0.6 },
    Enceladus:{ deep: 0xb0bcc4, mid: 0xdde5ea, high: 0xf8fafc, scale: 3.4, crater: 0.3, contrast: 0.7 },
    Rhea:     { deep: 0x5c5852, mid: 0x9d9992, high: 0xcfcbc4, scale: 3.4, crater: 0.85, contrast: 1.0 },
    Ceres:    { deep: 0x3c3a36, mid: 0x767370, high: 0xa5a2a0, scale: 3.8, crater: 1.0, contrast: 1.1 },
    Vesta:    { deep: 0x554a3c, mid: 0x998b76, high: 0xc4b8a4, scale: 3.9, crater: 1.0, contrast: 1.15 },
    Pallas:   { deep: 0x454650, mid: 0x84848f, high: 0xb2b2bd, scale: 3.8, crater: 1.0, contrast: 1.1 }
  };

  function v3c(hex) { return new THREE.Color(hex); }

  function makeEarthMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: tex('2k_earth_daymap.jpg') },
        nightMap: { value: tex('2k_earth_nightmap.jpg') },
        specMap: { value: tex('2k_earth_specular_map.jpg') },
        uHighlight: { value: 0 }
      },
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG
    });
  }

  function makeTexturedMaterial(name) {
    // gas giants keep a faint night floor so the dark limb reads in the scene
    var nightFloor = (name === 'Jupiter' || name === 'Saturn' ||
                      name === 'Uranus' || name === 'Neptune') ? 0.05 : 0.04;
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex(MAPS[name]) },
        uHighlight: { value: 0 },
        uNightFloor: { value: nightFloor }
      },
      vertexShader: EARTH_VERT,
      fragmentShader: PLANET_FRAG
    });
  }

  function makeRockMaterial(r) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uHighlight: { value: 0 },
        uColDeep: { value: v3c(r.deep) },
        uColMid: { value: v3c(r.mid) },
        uColHigh: { value: v3c(r.high) },
        uScale: { value: r.scale },
        uCrater: { value: r.crater },
        uContrast: { value: r.contrast }
      },
      vertexShader: ROCK_VERT,
      fragmentShader: ROCK_FRAG
    });
  }

  function addEarthClouds(target, radius) {
    var clouds = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.012, 48, 48),
      new THREE.MeshLambertMaterial({
        map: tex('2k_earth_clouds.jpg'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    clouds.raycast = function () {};
    target.add(clouds);
    cloudLayers.push(clouds);
  }

  // createPlanet returns a tilt group: outer group carries the real axial
  // tilt, the inner sphere spins. userData.spinTarget lets the existing
  // rotation code spin the right node.
  function createPlanet(d) {
    var name = d.name;
    var geo = new THREE.SphereGeometry(d.size, 64, 64);
    var mesh;

    if (name === 'Earth') {
      mesh = new THREE.Mesh(geo, makeEarthMaterial());
      addEarthClouds(mesh, d.size);
    } else if (MAPS[name]) {
      mesh = new THREE.Mesh(geo, makeTexturedMaterial(name));
    } else if (ROCK_RECIPES[name]) {
      mesh = new THREE.Mesh(geo, makeRockMaterial(ROCK_RECIPES[name]));
    } else {
      mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: d.color, roughness: d.roughness || 0.7, metalness: 0
      }));
    }

    var tiltDeg = TILT[name] || 0;
    if (!tiltDeg) {
      mesh.userData.spinTarget = mesh;
      return mesh;
    }
    var group = new THREE.Group();
    group.rotation.z = tiltDeg * Math.PI / 180;
    group.add(mesh);
    group.userData.spinTarget = mesh;
    return group;
  }

  // ==========================================================================
  // Saturn ring: real ring strip mapped radially, planet shadow analytic
  // ==========================================================================
  var RING_VERT = [
    'varying vec3 vLocal;',
    'varying vec3 vWorldPos;',
    'varying vec3 vPlanetPos;',
    'void main() {',
    '  vLocal = position;',
    '  vec4 world = modelMatrix * vec4(position, 1.0);',
    '  vWorldPos = world.xyz;',
    '  vPlanetPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * world;',
    '}'
  ].join('\n');

  var RING_FRAG = [
    'uniform sampler2D ringMap;',
    'uniform float uInner;',
    'uniform float uOuter;',
    'varying vec3 vLocal;',
    'varying vec3 vWorldPos;',
    'varying vec3 vPlanetPos;',
    'void main() {',
    '  float r = length(vLocal.xy);',
    '  float t = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);',
    '  vec4 c = texture2D(ringMap, vec2(t, 0.5));',
    // lighting: rings scatter sunlight; darker when the planet blocks the sun
    '  vec3 planetPos = vPlanetPos;',
    '  float planetR = uInner / 1.35;',
    '  vec3 fdir = normalize(vWorldPos);',
    '  float along = dot(planetPos, fdir);',
    '  float perp = length(planetPos - fdir * along);',
    '  float behind = step(length(planetPos), length(vWorldPos));',
    '  float occl = (1.0 - smoothstep(planetR * 0.72, planetR * 1.02, perp)) * behind;',
    '  vec3 col = c.rgb * (0.32 + 0.68 * (1.0 - occl));',
    '  gl_FragColor = vec4(col, c.a);',
    '}'
  ].join('\n');

  function addRing(planetGroup, planetSize) {
    var inner = planetSize * 1.24;   // ~ real proportions: C ring to A ring
    var outer = planetSize * 2.27;
    var geo = new THREE.RingGeometry(inner, outer, 180, 2);
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        ringMap: { value: tex('2k_saturn_ring_alpha.png') },
        uInner: { value: inner },
        uOuter: { value: outer }
      },
      vertexShader: RING_VERT,
      fragmentShader: RING_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    // ring is added to the tilt group, so it shares Saturn's 26.7° obliquity
    planetGroup.add(ring);
    return ring;
  }

  // ==========================================================================
  // Optional photoreal sun (A/B candidate; applied only when explicitly
  // called). Real photosphere texture, slow rotation, restrained warm glow.
  // ==========================================================================
  function applySunTexture(sun) {
    sun.material.dispose();
    sun.material = new THREE.MeshBasicMaterial({ map: tex('2k_sun.jpg') });
    sun.userData.spinSlow = true;

    var cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(128, 128, 40, 128, 128, 128);
    g.addColorStop(0, 'rgba(255, 214, 145, 0.5)');
    g.addColorStop(0.35, 'rgba(255, 180, 90, 0.22)');
    g.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(cv),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    glow.scale.set(85, 85, 1);
    sun.add(glow);
  }

  function setHighlight(root, on) {
    var hit = false;
    root.traverse(function (node) {
      if (node.material && node.material.uniforms && node.material.uniforms.uHighlight) {
        node.material.uniforms.uHighlight.value = on ? 1 : 0;
        hit = true;
      }
    });
    return hit;
  }

  var lastT = 0;
  function update(t) {
    if (reducedMotion) return;
    var dt = lastT ? Math.min(0.05, t - lastT) : 0.016;
    lastT = t;
    for (var i = 0; i < cloudLayers.length; i++) {
      cloudLayers[i].rotation.y += dt * 0.0085; // clouds drift relative to surface
    }
    for (var j = 0; j < timeUniforms.length; j++) timeUniforms[j].value = t;
  }

  window.PlanetsReal = {
    createPlanet: createPlanet,
    addRing: addRing,
    applySunTexture: applySunTexture,
    setHighlight: setHighlight,
    update: update
  };
})();
