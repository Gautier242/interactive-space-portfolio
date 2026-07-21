// ============================================================================
// v3.1 — LIVING SUN
// Turns the flat textured sphere into a churning ball of plasma: a photosphere
// shader (real texture + animated granulation + differential rotation + limb
// darkening), a bright chromosphere rim, a breathing multi-layer corona, and
// recycled pools of limb prominences and surface flares that erupt on
// randomized timers. All procedural, additive, small pools — no per-frame
// allocation. Exposes window.SunActivity = { init, update }.
// ============================================================================
(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var loader = new THREE.TextureLoader();
  var SUN_R = 18;               // matches the sun sphere radius in app.js
  var clock = 0;                // internal seconds, advanced by update(dt)

  var photosphereMat = null;
  var corona = [];              // {sprite, baseScale, phase}
  var prominences = [];         // pooled torus-arc meshes
  var flares = [];              // pooled surface sprites
  var promTimer = 4, flareTimer = 2;

  // --------------------------------------------------------------------------
  // Compact value-noise fbm for GLSL
  // --------------------------------------------------------------------------
  var NOISE = [
    'vec3 hash3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return -1.0+2.0*fract(sin(p)*43758.5453123);}',
    'float noise3(vec3 p){vec3 i=floor(p);vec3 f=fract(p);vec3 u=f*f*(3.0-2.0*f);',
    'return mix(mix(mix(dot(hash3(i+vec3(0,0,0)),f-vec3(0,0,0)),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),',
    'mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),',
    'mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),',
    'mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);}',
    'float fbm(vec3 p){float v=0.0;float a=0.5;for(int k=0;k<4;k++){v+=a*noise3(p);p*=2.05;a*=0.5;}return v;}'
  ].join('\n');

  // --------------------------------------------------------------------------
  // Photosphere: base texture + granulation + differential rotation + limb dark
  // --------------------------------------------------------------------------
  function makePhotosphere() {
    var tx = loader.load('assets/textures/2k_sun.jpg');
    tx.wrapS = THREE.RepeatWrapping;
    photosphereMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uMap: { value: tx }, uHighlight: { value: 0 } },
      vertexShader: [
        'varying vec2 vUv;',
        'varying vec3 vPos;',
        'varying vec3 vNormalW;',
        'varying vec3 vViewDir;',
        'void main(){',
        '  vUv=uv; vPos=normalize(position);',
        '  vNormalW=normalize(mat3(modelMatrix)*normal);',
        '  vec4 w=modelMatrix*vec4(position,1.0);',
        '  vViewDir=normalize(cameraPosition-w.xyz);',
        '  gl_Position=projectionMatrix*viewMatrix*w;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'uniform float uTime; uniform sampler2D uMap; uniform float uHighlight;',
        'varying vec2 vUv; varying vec3 vPos; varying vec3 vNormalW; varying vec3 vViewDir;',
        NOISE,
        'void main(){',
        // latitude from the unit position; differential rotation shears longitude
        '  float lat=asin(clamp(vPos.y,-1.0,1.0));',
        '  float diff=uTime*(0.010 + 0.014*(1.0 - abs(sin(lat))));',
        '  vec2 uv=vec2(vUv.x+diff, vUv.y);',
        '  vec3 base=texture2D(uMap,uv).rgb;',
        // churning granulation: two noise octaves flowing at different rates
        '  float g1=fbm(vPos*7.0+vec3(0.0,0.0,uTime*0.35));',
        '  float g2=fbm(vPos*16.0-vec3(uTime*0.25,0.0,0.0));',
        '  float gran=0.6+0.5*g1+0.35*g2;',
        // grade: cool orange lanes -> hot yellow-white cells
        '  vec3 cool=vec3(0.85,0.32,0.06);',
        '  vec3 mid=vec3(1.0,0.62,0.18);',
        '  vec3 hot=vec3(1.0,0.93,0.72);',
        '  vec3 col=mix(cool,mid,smoothstep(0.35,0.75,gran));',
        '  col=mix(col,hot,smoothstep(0.8,1.15,gran));',
        // blend the real texture in so it keeps believable large-scale mottling
        '  col=mix(col, col*(0.6+0.9*base), 0.55);',
        // limb darkening -> spherical volume, with a warm reddened edge
        '  float ndv=clamp(dot(normalize(vNormalW),normalize(vViewDir)),0.0,1.0);',
        '  float limb=0.35+0.65*pow(ndv,0.55);',
        '  col*=limb;',
        '  col+=vec3(0.25,0.06,0.0)*(1.0-ndv);',
        // gentle global breathing
        '  col*=1.0+0.03*sin(uTime*0.7);',
        // hover glow: clear white blend so the Sun reads as clickable
        '  col=mix(col, vec3(1.0), uHighlight*0.62);',
        '  gl_FragColor=vec4(col,1.0);',
        '}'
      ].join('\n')
    });
    return photosphereMat;
  }

  // --------------------------------------------------------------------------
  // Chromosphere rim: thin additive fresnel shell just above the photosphere
  // --------------------------------------------------------------------------
  function makeChromosphere() {
    return new THREE.Mesh(
      new THREE.SphereGeometry(SUN_R * 1.015, 48, 48),
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: [
          'varying vec3 vN; varying vec3 vV;',
          'void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0);',
          ' vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }'
        ].join('\n'),
        fragmentShader: [
          'uniform float uTime; varying vec3 vN; varying vec3 vV;',
          'void main(){ float f=1.0-abs(dot(normalize(vN),normalize(vV)));',
          ' float a=pow(f,3.2)*0.9*(0.9+0.1*sin(uTime*1.3));',
          ' gl_FragColor=vec4(1.0,0.5,0.15,a); }'
        ].join('\n'),
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide
      })
    );
  }

  // --------------------------------------------------------------------------
  // Corona: soft additive sprite layers that breathe
  // --------------------------------------------------------------------------
  function radialSprite(stops) {
    var s = 256, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(s / 2, s / 2, s * 0.04, s / 2, s / 2, s / 2);
    stops.forEach(function (st) { g.addColorStop(st[0], st[1]); });
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(cv);
  }

  function makeCorona(sun) {
    var inner = radialSprite([
      [0, 'rgba(255,224,160,0.55)'], [0.3, 'rgba(255,180,90,0.28)'],
      [0.6, 'rgba(255,140,50,0.10)'], [1, 'rgba(255,120,40,0)']
    ]);
    var outer = radialSprite([
      [0, 'rgba(255,200,130,0.22)'], [0.4, 'rgba(255,150,70,0.10)'],
      [0.75, 'rgba(255,120,50,0.03)'], [1, 'rgba(255,110,40,0)']
    ]);
    [[inner, 62], [outer, 118]].forEach(function (cfg, i) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: cfg[0], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
      }));
      sp.scale.set(cfg[1], cfg[1], 1);
      sun.add(sp);
      corona.push({ sprite: sp, baseScale: cfg[1], phase: i * 2.1 });
    });
  }

  // --------------------------------------------------------------------------
  // Prominences: pooled camera-facing sprites of an arched plasma loop. Drawn
  // in pinkish-red (real Halpha emission) so they read against the orange disk
  // and, at the limb, against black space. Billboards never go edge-on.
  // --------------------------------------------------------------------------
  function prominenceTexture() {
    var s = 128, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var ctx = cv.getContext('2d');
    // an arch/loop: two rising legs meeting in a curved top, bright at the base
    ctx.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      ctx.moveTo(40, 122);
      ctx.bezierCurveTo(34, 60, 94, 60, 88, 122);
      ctx.lineWidth = pass === 0 ? 20 : 9;
      var grad = ctx.createLinearGradient(0, 122, 0, 40);
      if (pass === 0) {
        grad.addColorStop(0, 'rgba(255,120,150,0.5)');
        grad.addColorStop(0.5, 'rgba(255,80,120,0.28)');
        grad.addColorStop(1, 'rgba(255,60,110,0)');
      } else {
        grad.addColorStop(0, 'rgba(255,190,200,0.95)');
        grad.addColorStop(0.6, 'rgba(255,90,130,0.6)');
        grad.addColorStop(1, 'rgba(255,70,120,0)');
      }
      ctx.strokeStyle = grad;
      ctx.stroke();
    }
    return new THREE.CanvasTexture(cv);
  }

  function makeProminencePool(sun) {
    var tex = prominenceTexture();
    for (var i = 0; i < 6; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      sp.center.set(0.5, 0.05);   // anchor near the base so it "grows" upward
      sp.visible = false;
      sp.userData = { life: 0, dur: 2.6, baseScale: 8, dir: new THREE.Vector3() };
      sun.add(sp);
      prominences.push(sp);
    }
  }

  function spawnProminence() {
    var m = null;
    for (var i = 0; i < prominences.length; i++) {
      if (!prominences[i].visible) { m = prominences[i]; break; }
    }
    if (!m) return;
    var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    var s = Math.sqrt(1 - u * u);
    var dir = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
    m.userData.dir.copy(dir);
    m.position.copy(dir).multiplyScalar(SUN_R * 0.97);
    m.userData.baseScale = 7 + Math.random() * 4;   // ~1/4 the 18-unit radius
    m.userData.life = 0;
    m.userData.dur = 2.4 + Math.random() * 1.4;
    m.scale.set(0.001, 0.001, 0.001);
    m.material.opacity = 0;
    m.visible = true;
  }

  // --------------------------------------------------------------------------
  // Surface flares: pooled additive sprites that brighten and fade
  // --------------------------------------------------------------------------
  function makeFlarePool(sun) {
    var tex = radialSprite([
      [0, 'rgba(255,255,240,0.95)'], [0.25, 'rgba(255,225,150,0.6)'],
      [0.6, 'rgba(255,170,80,0.15)'], [1, 'rgba(255,150,60,0)']
    ]);
    for (var i = 0; i < 10; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      sp.visible = false;
      sp.userData = { life: 0, dur: 1 };
      sun.add(sp);
      flares.push(sp);
    }
  }

  function spawnFlare() {
    var sp = null;
    for (var i = 0; i < flares.length; i++) {
      if (!flares[i].visible) { sp = flares[i]; break; }
    }
    if (!sp) return;
    var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    var s = Math.sqrt(1 - u * u);
    var dir = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
    sp.position.copy(dir).multiplyScalar(SUN_R * 1.0);
    sp.userData.peak = 3 + Math.random() * 3;   // world-size of the flare
    sp.userData.life = 0;
    sp.userData.dur = 0.8 + Math.random() * 0.8;
    sp.material.opacity = 0;
    sp.visible = true;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------
  var chromoMats = [];

  function init(sun) {
    sun.material.dispose();
    sun.material = makePhotosphere();
    sun.userData.spinSlow = false; // app.js spins it at the mapped real rate
    var chromo = makeChromosphere();
    chromoMats.push(chromo.material);
    sun.add(chromo);
    makeCorona(sun);
    makeProminencePool(sun);
    makeFlarePool(sun);
  }

  function update(dt, playing) {
    if (reducedMotion) dt = 0;
    if (!playing) dt = 0;
    clock += dt;
    if (photosphereMat) photosphereMat.uniforms.uTime.value = clock;
    for (var c = 0; c < chromoMats.length; c++) chromoMats[c].uniforms.uTime.value = clock;

    // corona breathing
    for (var i = 0; i < corona.length; i++) {
      var co = corona[i];
      var b = 1 + 0.06 * Math.sin(clock * 0.6 + co.phase);
      co.sprite.scale.set(co.baseScale * b, co.baseScale * b, 1);
      co.sprite.material.opacity = 0.85 + 0.15 * Math.sin(clock * 0.9 + co.phase);
    }

    if (dt > 0) {
      // eruption timers (reduced motion / paused -> frozen, dt=0)
      promTimer -= dt;
      if (promTimer <= 0) { spawnProminence(); promTimer = 6 + Math.random() * 9; }
      flareTimer -= dt;
      if (flareTimer <= 0) { spawnFlare(); flareTimer = 3 + Math.random() * 5; }
    }

    // advance prominences: rise-in then fade-out
    for (var p = 0; p < prominences.length; p++) {
      var m = prominences[p];
      if (!m.visible) continue;
      m.userData.life += dt;
      var t = m.userData.life / m.userData.dur;
      if (t >= 1) { m.visible = false; m.material.opacity = 0; continue; }
      var grow = Math.min(1, t / 0.25);                 // rise over first 25%
      var fade = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;     // hold then fade
      var sc = m.userData.baseScale * grow;
      m.scale.set(sc, sc, sc);
      // drift a little further off the limb as it rises
      m.position.copy(m.userData.dir).multiplyScalar(SUN_R * (0.97 + 0.12 * grow));
      m.material.opacity = 0.95 * fade;
    }

    // advance flares: quick brighten then fade
    for (var f = 0; f < flares.length; f++) {
      var sp = flares[f];
      if (!sp.visible) continue;
      sp.userData.life += dt;
      var tf = sp.userData.life / sp.userData.dur;
      if (tf >= 1) { sp.visible = false; sp.material.opacity = 0; continue; }
      var env = Math.sin(Math.min(tf, 1) * Math.PI);    // 0 -> 1 -> 0
      sp.scale.set(sp.userData.peak, sp.userData.peak, 1);
      sp.material.opacity = env * 0.9;
    }
  }

  window.SunActivity = { init: init, update: update };
})();
