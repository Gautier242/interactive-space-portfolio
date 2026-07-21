// ============================================================================
// FIRST LIGHT — MISSION: VIPER
// Lunar terrain heightfield with carved craters, regolith albedo + wheel-track
// canvas, dust particles, velocity-based driving physics, and the mission HUD
// (intro card, instrument readouts, exit control). All procedural.
// Exposes window.MoonMission.
// ============================================================================
(function () {
  'use strict';

  var reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = document.documentElement.classList.contains('mobile-device');

  // --------------------------------------------------------------------------
  // Deterministic heightfield: value-noise fbm + explicit crater depressions.
  // heightAt(x, z) is the single source of truth — the terrain mesh, the rover
  // and the rocks all sample it, so nothing ever floats or sinks.
  // --------------------------------------------------------------------------
  function hash2(ix, iz) {
    var h = (ix * 374761393 + iz * 668265263) | 0;
    h = (h ^ (h >> 13)) | 0;
    h = (h * 1274126177) | 0;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }
  function vnoise(x, z) {
    var ix = Math.floor(x), iz = Math.floor(z);
    var fx = x - ix, fz = z - iz;
    var ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    var a = hash2(ix, iz), b = hash2(ix + 1, iz);
    var c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }
  function fbm2(x, z) {
    var v = 0, amp = 0.5, f = 1;
    for (var o = 0; o < 4; o++) {
      v += amp * vnoise(x * f, z * f);
      f *= 2.03; amp *= 0.5;
    }
    return v;
  }

  // fixed crater field (seeded by index so it is identical every load)
  var CRATERS = [];
  (function () {
    for (var i = 0; i < 26; i++) {
      var r1 = hash2(i * 7 + 1, i * 13 + 5);
      var r2 = hash2(i * 11 + 3, i * 5 + 9);
      var r3 = hash2(i * 17 + 7, i * 3 + 2);
      CRATERS.push({
        x: (r1 - 0.5) * 420,
        z: (r2 - 0.5) * 420,
        r: 6 + r3 * 22,
        d: 0.8 + r3 * 2.6       // depth scales with radius
      });
    }
    // keep the landing zone (rover start / starship) mostly flat
    CRATERS.forEach(function (c) {
      if (Math.hypot(c.x, c.z) < 40) { c.r *= 0.45; c.d *= 0.35; }
    });
  })();

  function heightAt(x, z) {
    // rolling regolith
    var h = fbm2(x * 0.012 + 31.7, z * 0.012 + 17.3) * 5.0 - 2.5;
    h += fbm2(x * 0.06 + 7.1, z * 0.06 + 3.9) * 1.1 - 0.55;
    // craters: smooth bowl + raised rim
    for (var i = 0; i < CRATERS.length; i++) {
      var c = CRATERS[i];
      var d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 1.6) {
        if (d < 1.0) {
          var bowl = Math.cos(d * Math.PI) * 0.5 + 0.5;  // 1 center -> 0 rim
          h -= bowl * c.d;
        }
        var rim = Math.exp(-Math.pow((d - 1.05) * 3.2, 2.0));
        h += rim * c.d * 0.35;
      }
    }
    // flatten the immediate landing zone
    var homeDist = Math.hypot(x, z);
    if (homeDist < 30) h *= Math.max(homeDist / 30, 0.15);
    return h;
  }

  // --------------------------------------------------------------------------
  // Terrain mesh + regolith/track canvas texture
  // --------------------------------------------------------------------------
  var TERRAIN_SIZE = 500;
  var trackCanvas, trackCtx, trackTex, trackDirty = false;

  function buildTerrain(moonScene) {
    var segs = isMobile ? 96 : 144;
    var geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, segs, segs);
    geo.rotateX(-Math.PI / 2); // rotate geometry, not mesh: world coords stay simple
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var h = heightAt(x, z);
      pos.setY(i, h);
      // subtle albedo variation: darker maria patches + slope-independent grain
      var shade = 0.82 + fbm2(x * 0.03 + 91.2, z * 0.03 + 44.8) * 0.36 - 0.18;
      shade += (hash2(Math.round(x * 3.7), Math.round(z * 3.7)) - 0.5) * 0.06;
      colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    // track canvas: light regolith base, wheel marks drawn darker
    trackCanvas = document.createElement('canvas');
    trackCanvas.width = trackCanvas.height = isMobile ? 1024 : 2048;
    trackCtx = trackCanvas.getContext('2d');
    trackCtx.fillStyle = '#b8b6b0';
    trackCtx.fillRect(0, 0, trackCanvas.width, trackCanvas.height);
    trackTex = new THREE.CanvasTexture(trackCanvas);

    var mat = new THREE.MeshStandardMaterial({
      map: trackTex,
      vertexColors: true,
      roughness: 0.96,
      metalness: 0.02
    });
    var terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    moonScene.add(terrain);
    return terrain;
  }

  function worldToTrackUV(x, z) {
    return {
      u: (x / TERRAIN_SIZE + 0.5) * trackCanvas.width,
      v: (z / TERRAIN_SIZE + 0.5) * trackCanvas.height
    };
  }

  // two wheel ruts perpendicular to heading
  function drawTracks(x, z, headingY) {
    if (!trackCtx) return;
    var px = Math.cos(headingY), pz = -Math.sin(headingY); // lateral axis
    var halfGauge = 1.05;
    var s = trackCanvas.width / TERRAIN_SIZE;
    trackCtx.fillStyle = 'rgba(84, 82, 78, 0.5)';
    [1, -1].forEach(function (side) {
      var uv = worldToTrackUV(x + px * halfGauge * side, z + pz * halfGauge * side);
      trackCtx.fillRect(uv.u - 0.35 * s, uv.v - 0.35 * s, 0.7 * s, 0.7 * s);
    });
    trackDirty = true;
  }

  // --------------------------------------------------------------------------
  // Dust: recycled sprite pool kicked up behind the wheels
  // --------------------------------------------------------------------------
  var dustPool = [], dustIndex = 0;

  function makeDustTexture() {
    var s = 64;
    var cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(s / 2, s / 2, 2, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(200,196,188,0.55)');
    g.addColorStop(0.6, 'rgba(170,166,158,0.18)');
    g.addColorStop(1, 'rgba(150,146,138,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(cv);
  }

  function initDust(moonScene) {
    var tex = makeDustTexture();
    var count = isMobile ? 60 : 130;
    for (var i = 0; i < count; i++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false
      }));
      sp.scale.set(0.6, 0.6, 1);
      sp.userData = { life: 0, vel: new THREE.Vector3() };
      sp.visible = false;
      moonScene.add(sp);
      dustPool.push(sp);
    }
  }

  function emitDust(pos, backDir, speed) {
    if (reducedMotion) return;
    var n = Math.min(3, Math.ceil(speed * 4));
    for (var i = 0; i < n; i++) {
      var sp = dustPool[dustIndex];
      dustIndex = (dustIndex + 1) % dustPool.length;
      sp.position.copy(pos);
      sp.position.x += (Math.random() - 0.5) * 1.6;
      sp.position.z += (Math.random() - 0.5) * 1.6;
      sp.position.y += 0.25;
      sp.userData.life = 1;
      sp.userData.vel.set(
        backDir.x * speed * 1.6 + (Math.random() - 0.5) * 0.35,
        0.5 + Math.random() * 0.9,           // lunar gravity: high, slow arcs
        backDir.z * speed * 1.6 + (Math.random() - 0.5) * 0.35
      );
      sp.scale.set(0.5, 0.5, 1);
      sp.visible = true;
    }
  }

  function updateDust(dt) {
    for (var i = 0; i < dustPool.length; i++) {
      var sp = dustPool[i];
      if (sp.userData.life <= 0) continue;
      sp.userData.life -= dt * 0.55;
      if (sp.userData.life <= 0) { sp.visible = false; sp.material.opacity = 0; continue; }
      sp.userData.vel.y -= dt * 1.35;        // ~1/6 g feel
      sp.position.addScaledVector(sp.userData.vel, dt);
      var l = sp.userData.life;
      sp.material.opacity = Math.min(0.5, l * 0.55);
      var sc = 0.5 + (1 - l) * 1.8;
      sp.scale.set(sc, sc, 1);
    }
    if (trackDirty) { trackTex.needsUpdate = true; trackDirty = false; }
  }

  // --------------------------------------------------------------------------
  // Driving physics: velocity + inertia, terrain following, chassis tilt
  // --------------------------------------------------------------------------
  var drive = { v: 0 };

  function stepRover(rover, state, boost, animationSpeed, dt) {
    var accel = 14.0, drag = 2.2, maxV = 9.0 * (boost ? 1.9 : 1.0) * Math.max(animationSpeed, 0.25);
    if (state.forward) drive.v += accel * dt;
    if (state.backward) drive.v -= accel * dt * 0.7;
    drive.v -= drive.v * drag * dt;
    drive.v = Math.max(-maxV * 0.55, Math.min(maxV, drive.v));
    if (Math.abs(drive.v) < 0.01 && !state.forward && !state.backward) drive.v = 0;

    var turn = 1.6 * dt * (drive.v >= 0 ? 1 : -1);
    if (state.left) rover.rotation.y += turn;
    if (state.right) rover.rotation.y -= turn;

    var fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(rover.quaternion);
    rover.position.addScaledVector(fwd, drive.v * dt);

    // clamp to explorable area
    var lim = TERRAIN_SIZE * 0.46;
    rover.position.x = Math.max(-lim, Math.min(lim, rover.position.x));
    rover.position.z = Math.max(-lim, Math.min(lim, rover.position.z));

    // terrain following + chassis attitude from fore/aft & left/right samples
    var x = rover.position.x, z = rover.position.z;
    var h = heightAt(x, z);
    rover.position.y = h;
    var ahead = heightAt(x + fwd.x * 1.4, z + fwd.z * 1.4);
    var behindH = heightAt(x - fwd.x * 1.4, z - fwd.z * 1.4);
    var right = new THREE.Vector3(1, 0, 0).applyQuaternion(rover.quaternion);
    var rH = heightAt(x + right.x * 1.1, z + right.z * 1.1);
    var lH = heightAt(x - right.x * 1.1, z - right.z * 1.1);
    var targetPitch = Math.atan2(behindH - ahead, 2.8);
    var targetRoll = Math.atan2(lH - rH, 2.2);
    rover.rotation.x += (targetPitch - rover.rotation.x) * Math.min(1, dt * 6);
    rover.rotation.z += (targetRoll - rover.rotation.z) * Math.min(1, dt * 6);

    // wheel spin
    if (rover.userData.wheels) {
      rover.userData.wheels.forEach(function (w) {
        w.rotation.y -= drive.v * dt * 2.4; // spin axis of the inner wheel group
      });
    }

    // dust + tracks while moving
    if (Math.abs(drive.v) > 0.6) {
      var back = fwd.clone().multiplyScalar(-Math.sign(drive.v));
      emitDust(rover.position, back, Math.abs(drive.v) * 0.16);
      drawTracks(x, z, rover.rotation.y);
    }
    return drive.v;
  }

  // --------------------------------------------------------------------------
  // HUD + intro card (DOM)
  // --------------------------------------------------------------------------
  var hudEl, introEl, distTotal = 0, lastPos = null, introSeen = false;

  function buildHUD(onExit) {
    if (hudEl) return;
    hudEl = document.createElement('div');
    hudEl.id = 'missionHud';
    hudEl.innerHTML =
      '<div class="hud-row hud-title">MISSION · VIPER</div>' +
      '<div class="hud-row"><span class="hud-label">SPD</span><span class="hud-value" id="hudSpeed">0.0</span><span class="hud-unit">m/s</span></div>' +
      '<div class="hud-row"><span class="hud-label">HDG</span><span class="hud-value" id="hudHeading">000</span><span class="hud-unit">°</span></div>' +
      '<div class="hud-row"><span class="hud-label">ODO</span><span class="hud-value" id="hudDist">0</span><span class="hud-unit">m</span></div>' +
      '<div class="hud-row"><span class="hud-label">SMP</span><span class="hud-value" id="hudRocks">0/15</span><span class="hud-unit">rocks</span></div>';
    document.getElementById('leftPanel').appendChild(hudEl);

    var exitBtn = document.createElement('button');
    exitBtn.id = 'missionExit';
    exitBtn.textContent = 'EXIT MISSION ⏎';
    exitBtn.addEventListener('click', onExit);
    document.getElementById('leftPanel').appendChild(exitBtn);
  }

  function buildIntro() {
    if (introEl) return;
    introEl = document.createElement('div');
    introEl.id = 'missionIntro';
    var controls = isMobile
      ? '<div class="intro-keys">Use the on-screen arrows to drive · drag to look around · pinch to zoom</div>'
      : '<div class="intro-keys"><span>↑↓</span> drive &nbsp; <span>←→</span> steer &nbsp; <span>SPACE</span> boost &nbsp; <span>drag</span> orbit camera</div>';
    introEl.innerHTML =
      '<div class="intro-card">' +
      '<div class="intro-eyebrow">SOUTH POLAR REGION · LUNAR SURFACE</div>' +
      '<h3>MISSION: VIPER</h3>' +
      '<p>Drive VIPER and collect the 15 rock samples scattered across the regolith. Play and 6x speed are selected for you automatically; if the rover is not moving, press the play button in the bottom bar and pick a higher speed to go faster. Click EXIT MISSION to return to the Moon view, or click Earth in the sky to go back to the solar system.</p>' +
      controls +
      '<button id="missionStart">BEGIN TRAVERSE</button>' +
      '</div>';
    document.getElementById('leftPanel').appendChild(introEl);
    document.getElementById('missionStart').addEventListener('click', function () {
      introEl.classList.remove('visible');
    });
  }

  function showMission(onExit) {
    buildHUD(onExit);
    buildIntro();
    hudEl.classList.add('visible');
    document.getElementById('missionExit').classList.add('visible');
    if (!introSeen) {
      introSeen = true;
      introEl.classList.add('visible');
    }
    distTotal = 0;
    lastPos = null;
  }

  function hideMission() {
    if (hudEl) hudEl.classList.remove('visible');
    if (introEl) introEl.classList.remove('visible');
    var ex = document.getElementById('missionExit');
    if (ex) ex.classList.remove('visible');
  }

  function updateHUD(rover, speed, rocks) {
    if (!hudEl || !hudEl.classList.contains('visible')) return;
    if (lastPos) distTotal += rover.position.distanceTo(lastPos);
    lastPos = rover.position.clone();
    var hdg = ((-rover.rotation.y * 180 / Math.PI) % 360 + 360) % 360;
    document.getElementById('hudSpeed').textContent = Math.abs(speed).toFixed(1);
    document.getElementById('hudHeading').textContent = String(Math.round(hdg)).padStart(3, '0');
    document.getElementById('hudDist').textContent = Math.round(distTotal);
    document.getElementById('hudRocks').textContent = (window.rocksCollected || 0) + '/15';
  }

  window.MoonMission = {
    heightAt: heightAt,
    buildTerrain: buildTerrain,
    initDust: initDust,
    updateDust: updateDust,
    stepRover: stepRover,
    showMission: showMission,
    hideMission: hideMission,
    updateHUD: updateHUD
  };
})();
