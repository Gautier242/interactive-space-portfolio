// ============================================================================
// FIRST LIGHT — procedural planetary materials
// Every body gets a layered-noise shader material: believable terminator,
// per-class surface character (bands / craters / ice / storms), lit-side
// atmosphere rims, Earth with oceans+clouds+night lights, Saturn's ring with
// an analytic planet shadow. All procedural GLSL — no textures, no licenses.
// Exposes window.PlanetMats = { createPlanet, addRing, setHighlight, update }.
// ============================================================================
(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var timeUniforms = [];

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

  var PLANET_VERT = [
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

  // Generic rocky / gas body fragment. Sun sits at the world origin, so the
  // light direction is simply -normalize(worldPos).
  var GENERIC_FRAG = [
    'uniform float uTime;',
    'uniform float uHighlight;',
    'uniform vec3 uColDeep;',
    'uniform vec3 uColMid;',
    'uniform vec3 uColHigh;',
    'uniform float uScale;',
    'uniform float uWarp;',
    'uniform float uBands;',
    'uniform float uCrater;',
    'uniform float uPolar;',
    'uniform vec3 uPolarCol;',
    'uniform float uSpot;',
    'uniform float uContrast;',
    'varying vec3 vPos;',
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    NOISE,
    'void main() {',
    '  vec3 p = vPos;',
    '  float drift = uTime * 0.004;',
    // domain warp gives flow structure to bands and continents alike
    '  vec3 w = vec3(fbm(p * uScale * 0.9 + drift), fbm(p * uScale * 0.9 + 4.7 - drift), fbm(p * uScale * 0.9 + 9.2));',
    '  vec3 pw = p + w * uWarp;',
    // banded component (gas giants): latitude stripes warped by flow
    '  float band = sin(pw.y * uScale * 3.1 + fbm(pw * uScale) * 2.4);',
    '  band = band * 0.5 + 0.5;',
    // patchy component (rocky bodies)
    '  float speckle = fbm(pw * uScale) * 0.5 + 0.5;',
    '  float v = mix(speckle, band, uBands);',
    // crater field: ridged noise dimples, only where uCrater > 0
    '  float cr = ridged(p * uScale * 3.7);',
    '  v = mix(v, v * (0.62 + 0.38 * cr), uCrater);',
    '  v = clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0);',
    // great-spot storm (Jupiter): warped ellipse in object space
    '  if (uSpot > 0.0) {',
    '    vec2 sp = vec2(atan(p.z, p.x) / 6.2831 + 0.5, p.y * 0.5 + 0.5);',
    '    vec2 d = (sp - vec2(0.31, 0.36)) * vec2(9.0, 16.0);',
    '    float storm = 1.0 - smoothstep(0.4, 1.1, length(d) + fbm(p * 14.0) * 0.25);',
    '    v = mix(v, 0.1, storm * 0.85);',
    '  }',
    '  vec3 col = mix(uColDeep, uColMid, smoothstep(0.12, 0.55, v));',
    '  col = mix(col, uColHigh, smoothstep(0.58, 0.92, v));',
    // polar caps fade in past the noise-jittered cap latitude
    '  if (uPolar > 0.0) {',
    '    float cap = smoothstep(0.995 - uPolar * 0.28, 1.0, abs(p.y) + fbm(p * 8.0) * 0.05);',
    '    col = mix(col, uPolarCol, cap);',
    '  }',
    // lighting: hard vacuum terminator with a small soft wrap
    '  vec3 L = normalize(-vWorldPos);',
    '  vec3 N = normalize(vNormalW);',
    '  float ndl = dot(N, L);',
    '  float day = smoothstep(-0.06, 0.24, ndl);',
    '  col *= 0.03 + 0.97 * day;',
    // faint warm kiss right on the terminator line
    '  float term = smoothstep(-0.05, 0.02, ndl) * (1.0 - smoothstep(0.02, 0.16, ndl));',
    '  col += vec3(0.10, 0.05, 0.01) * term;',
    '  col += vec3(0.9, 0.95, 1.0) * uHighlight * 0.35;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var EARTH_FRAG = [
    'uniform float uTime;',
    'uniform float uHighlight;',
    'varying vec3 vPos;',
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    NOISE,
    'void main() {',
    '  vec3 p = vPos;',
    '  vec3 w = vec3(fbm(p * 2.4), fbm(p * 2.4 + 4.7), fbm(p * 2.4 + 9.2));',
    '  vec3 pw = p + w * 0.55;',
    '  float c = fbm(pw * 2.6);',
    '  float landMask = smoothstep(0.015, 0.055, c);',
    // ocean: deep basins to lighter shelf water near coasts
    '  vec3 oceanDeep = vec3(0.016, 0.09, 0.18);',
    '  vec3 oceanShelf = vec3(0.05, 0.21, 0.32);',
    '  vec3 ocean = mix(oceanDeep, oceanShelf, smoothstep(-0.08, 0.015, c));',
    // land: green lowlands, tan arid patches, gray-white mountains
    '  float arid = smoothstep(0.2, 0.65, fbm(pw * 4.2 + 13.0));',
    '  vec3 lowland = mix(vec3(0.09, 0.20, 0.07), vec3(0.42, 0.33, 0.18), arid);',
    '  vec3 mountain = vec3(0.36, 0.33, 0.30);',
    '  vec3 land = mix(lowland, mountain, smoothstep(0.12, 0.3, c));',
    // polar ice
    '  float ice = smoothstep(0.72, 0.85, abs(p.y) + fbm(p * 6.0) * 0.08);',
    '  vec3 surf = mix(ocean, land, landMask);',
    '  surf = mix(surf, vec3(0.92, 0.95, 0.97), ice);',
    // lighting
    '  vec3 L = normalize(-vWorldPos);',
    '  vec3 N = normalize(vNormalW);',
    '  vec3 V = normalize(cameraPosition - vWorldPos);',
    '  float ndl = dot(N, L);',
    '  float day = smoothstep(-0.06, 0.24, ndl);',
    // ocean sun glint
    '  vec3 R = reflect(-L, N);',
    '  float spec = pow(clamp(dot(R, V), 0.0, 1.0), 48.0) * (1.0 - landMask) * (1.0 - ice) * day;',
    // drifting cloud deck
    '  vec3 cp = p * 3.6 + vec3(uTime * 0.006, 0.0, uTime * 0.0025);',
    '  float cl = fbm(cp + w * 0.4);',
    '  float clouds = smoothstep(0.08, 0.38, cl) * 0.9;',
    '  vec3 col = mix(surf, vec3(0.96, 0.97, 0.98), clouds);',
    '  col += vec3(1.0, 0.95, 0.8) * spec * 0.55 * (1.0 - clouds);',
    '  col *= 0.03 + 0.97 * day;',
    // night side: warm city specks on land, dimmed under cloud
    '  float night = 1.0 - day;',
    '  float cities = pow(max(fbm(p * 14.0), 0.0), 3.0) * landMask * (1.0 - ice);',
    '  col += vec3(1.0, 0.72, 0.35) * cities * night * (1.0 - clouds * 0.8) * 1.1;',
    // blue atmospheric tint feathering the lit rim
    '  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.4);',
    '  col += vec3(0.18, 0.35, 0.65) * fres * day * 0.5;',
    '  col += vec3(0.9, 0.95, 1.0) * uHighlight * 0.35;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  var ATMO_VERT = [
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vNormalW = normalize(mat3(modelMatrix) * normal);',
    '  vec4 world = modelMatrix * vec4(position, 1.0);',
    '  vWorldPos = world.xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * world;',
    '}'
  ].join('\n');

  var ATMO_FRAG = [
    'uniform vec3 uAtmoCol;',
    'uniform float uAtmoStrength;',
    'varying vec3 vNormalW;',
    'varying vec3 vWorldPos;',
    'void main() {',
    '  vec3 N = normalize(vNormalW);',
    '  vec3 V = normalize(cameraPosition - vWorldPos);',
    '  vec3 L = normalize(-vWorldPos);',
    '  float rim = pow(1.0 - abs(dot(N, V)), 3.0);',
    '  float lit = 0.18 + 0.82 * smoothstep(-0.35, 0.45, dot(N, L));',
    '  gl_FragColor = vec4(uAtmoCol, rim * lit * uAtmoStrength);',
    '}'
  ].join('\n');

  var RING_VERT = [
    'varying vec3 vLocal;',
    'varying vec3 vWorldPos;',
    'varying vec3 vPlanetPos;',
    'void main() {',
    '  vLocal = position;',
    '  vec4 world = modelMatrix * vec4(position, 1.0);',
    '  vWorldPos = world.xyz;',
    // modelMatrix only exists in the vertex stage; the planet sits at this
    // mesh's local origin, so carry its world position over as a varying
    '  vPlanetPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;',
    '  gl_Position = projectionMatrix * viewMatrix * world;',
    '}'
  ].join('\n');

  var RING_FRAG = [
    'uniform float uInner;',
    'uniform float uOuter;',
    'varying vec3 vLocal;',
    'varying vec3 vWorldPos;',
    'varying vec3 vPlanetPos;',
    NOISE,
    'void main() {',
    '  float r = length(vLocal.xy);',
    '  float t = (r - uInner) / (uOuter - uInner);',
    '  if (t < 0.0 || t > 1.0) discard;',
    // radial banding: layered 1-D noise over radius
    '  float b = 0.55 + 0.45 * noise3(vec3(t * 40.0, 0.0, 0.0));',
    '  b *= 0.7 + 0.3 * noise3(vec3(t * 148.0, 3.0, 0.0));',
    // Cassini-like division and soft inner/outer edges
    // (note: smoothstep edges must be ascending — reversed edges are UB in GLSL)
    '  float cassini = 1.0 - (1.0 - smoothstep(0.0, 0.045, abs(t - 0.62))) * 0.85;',
    '  float edges = smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.94, 1.0, t));',
    '  float alpha = clamp(b * cassini * edges * 1.15, 0.0, 1.0);',
    // analytic planet shadow: the planet sits at this mesh\'s origin, the sun
    // at the world origin — occlusion when the fragment hides behind it
    '  vec3 planetPos = vPlanetPos;',
    '  float planetR = uInner / 1.45;',
    '  vec3 fdir = normalize(vWorldPos);',
    '  float along = dot(planetPos, fdir);',
    '  float perp = length(planetPos - fdir * along);',
    '  float behind = step(length(planetPos), length(vWorldPos));',
    '  float occl = (1.0 - smoothstep(planetR * 0.7, planetR * 1.05, perp)) * behind;',
    '  float shadow = 1.0 - occl;',
    '  vec3 col = mix(vec3(0.45, 0.38, 0.28), vec3(0.85, 0.76, 0.6), b);',
    '  col *= 0.35 + 0.65 * shadow;',
    '  gl_FragColor = vec4(col, alpha);',
    '}'
  ].join('\n');

  // ---- per-body surface recipes -------------------------------------------
  function v3(hex) { return new THREE.Color(hex); }

  var RECIPES = {
    Mercury: { deep: 0x3d352c, mid: 0x8c7853, high: 0xb5a58f, scale: 3.4, warp: 0.25, bands: 0, crater: 1.0, contrast: 1.25 },
    Venus:   { deep: 0xa87a3e, mid: 0xe8cda2, high: 0xf7ecd2, scale: 2.2, warp: 0.75, bands: 0.65, crater: 0, contrast: 0.9,
               atmo: { color: 0xf0dcae, strength: 0.85, size: 1.045 } },
    Earth:   { earth: true, atmo: { color: 0x5c9be0, strength: 1.0, size: 1.05 } },
    Moon:    { deep: 0x4a4a48, mid: 0x8f8d88, high: 0xc2c0ba, scale: 3.2, warp: 0.2, bands: 0, crater: 1.0, contrast: 1.2 },
    Mars:    { deep: 0x5b2c18, mid: 0xb4532f, high: 0xd9905e, scale: 2.9, warp: 0.45, bands: 0, crater: 0.55, contrast: 1.1,
               polar: 0.5, polarCol: 0xf0ece4, atmo: { color: 0xd98a5e, strength: 0.35, size: 1.035 } },
    Jupiter: { deep: 0x6e4a2a, mid: 0xc88b3a, high: 0xefdcc0, scale: 1.9, warp: 0.5, bands: 0.9, crater: 0, contrast: 1.0, spot: 1,
               atmo: { color: 0xd9b285, strength: 0.4, size: 1.03 } },
    Io:      { deep: 0x8a5a12, mid: 0xd8c020, high: 0xfff2b8, scale: 3.6, warp: 0.5, bands: 0.15, crater: 0.35, contrast: 1.15 },
    Europa:  { deep: 0x9a8868, mid: 0xd8ccb4, high: 0xf5f1e6, scale: 3.0, warp: 0.85, bands: 0.25, crater: 0.15, contrast: 0.85 },
    Ganymede:{ deep: 0x4e463c, mid: 0xa89988, high: 0xd0c6b8, scale: 3.1, warp: 0.35, bands: 0, crater: 0.6, contrast: 1.0 },
    Callisto:{ deep: 0x322e28, mid: 0x7a7265, high: 0xaba396, scale: 3.6, warp: 0.25, bands: 0, crater: 1.0, contrast: 1.2 },
    Saturn:  { deep: 0x96743e, mid: 0xe0bc84, high: 0xf6ead2, scale: 1.8, warp: 0.35, bands: 0.92, crater: 0, contrast: 0.8,
               atmo: { color: 0xe6cb96, strength: 0.35, size: 1.03 } },
    Titan:   { deep: 0xa05e14, mid: 0xe09030, high: 0xffcf82, scale: 2.0, warp: 0.6, bands: 0.5, crater: 0, contrast: 0.7,
               atmo: { color: 0xe8a04c, strength: 0.9, size: 1.09 } },
    Enceladus:{ deep: 0xb8c8d4, mid: 0xe4eef4, high: 0xffffff, scale: 3.4, warp: 0.5, bands: 0.1, crater: 0.25, contrast: 0.7 },
    Rhea:    { deep: 0x5c5852, mid: 0xa8a49c, high: 0xd8d4cc, scale: 3.4, warp: 0.25, bands: 0, crater: 0.85, contrast: 1.05 },
    Uranus:  { deep: 0x1f7482, mid: 0x4fd0e7, high: 0xbdf0f8, scale: 1.6, warp: 0.3, bands: 0.55, crater: 0, contrast: 0.55,
               atmo: { color: 0x7fdcec, strength: 0.5, size: 1.045 } },
    Neptune: { deep: 0x16255e, mid: 0x3d63e8, high: 0x9db8ff, scale: 1.9, warp: 0.55, bands: 0.7, crater: 0, contrast: 0.85,
               atmo: { color: 0x5c82f0, strength: 0.55, size: 1.045 } },
    Ceres:   { deep: 0x3c3a36, mid: 0x767370, high: 0xa5a2a0, scale: 3.8, warp: 0.2, bands: 0, crater: 1.0, contrast: 1.15 },
    Vesta:   { deep: 0x554a3c, mid: 0xa4937c, high: 0xd0c2ac, scale: 3.9, warp: 0.25, bands: 0, crater: 1.0, contrast: 1.2 },
    Pallas:  { deep: 0x454650, mid: 0x8e8ea0, high: 0xbcbccb, scale: 3.8, warp: 0.2, bands: 0, crater: 1.0, contrast: 1.15 }
  };

  function makeGenericMaterial(r) {
    var mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uHighlight: { value: 0 },
        uColDeep: { value: v3(r.deep) },
        uColMid: { value: v3(r.mid) },
        uColHigh: { value: v3(r.high) },
        uScale: { value: r.scale },
        uWarp: { value: r.warp },
        uBands: { value: r.bands },
        uCrater: { value: r.crater },
        uPolar: { value: r.polar || 0 },
        uPolarCol: { value: v3(r.polarCol || 0xffffff) },
        uSpot: { value: r.spot || 0 },
        uContrast: { value: r.contrast }
      },
      vertexShader: PLANET_VERT,
      fragmentShader: GENERIC_FRAG
    });
    timeUniforms.push(mat.uniforms.uTime);
    return mat;
  }

  function makeEarthMaterial() {
    var mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHighlight: { value: 0 } },
      vertexShader: PLANET_VERT,
      fragmentShader: EARTH_FRAG
    });
    timeUniforms.push(mat.uniforms.uTime);
    return mat;
  }

  function addAtmosphere(mesh, radius, cfg) {
    var shell = new THREE.Mesh(
      new THREE.SphereGeometry(radius * cfg.size, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: {
          uAtmoCol: { value: v3(cfg.color) },
          uAtmoStrength: { value: cfg.strength }
        },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    shell.raycast = function () {}; // clicks pass through to the planet
    mesh.add(shell);
  }

  function createPlanet(d) {
    var recipe = RECIPES[d.name];
    var geo = new THREE.SphereGeometry(d.size, 64, 64);
    var mat = recipe
      ? (recipe.earth ? makeEarthMaterial() : makeGenericMaterial(recipe))
      : new THREE.MeshStandardMaterial({ color: d.color, roughness: d.roughness || 0.7, metalness: 0 });
    var mesh = new THREE.Mesh(geo, mat);
    if (recipe && recipe.atmo) addAtmosphere(mesh, d.size, recipe.atmo);
    return mesh;
  }

  function addRing(mesh, planetSize) {
    var inner = planetSize * 1.35;
    var outer = planetSize * 2.45;
    var geo = new THREE.RingGeometry(inner, outer, 160, 2);
    var mat = new THREE.ShaderMaterial({
      uniforms: { uInner: { value: inner }, uOuter: { value: outer } },
      vertexShader: RING_VERT,
      fragmentShader: RING_FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2 - 0.22; // slight tilt for depth
    mesh.add(ring);
    return ring;
  }

  function setHighlight(mesh, on) {
    if (mesh.material && mesh.material.uniforms && mesh.material.uniforms.uHighlight) {
      mesh.material.uniforms.uHighlight.value = on ? 1 : 0;
      return true;
    }
    return false;
  }

  function update(t) {
    if (reducedMotion) t = 0;
    for (var i = 0; i < timeUniforms.length; i++) timeUniforms[i].value = t;
  }

  window.PlanetMats = {
    createPlanet: createPlanet,
    addRing: addRing,
    setHighlight: setHighlight,
    update: update
  };
})();
