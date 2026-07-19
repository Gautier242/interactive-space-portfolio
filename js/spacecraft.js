// ============================================================================
// FIRST LIGHT — spacecraft & hardware builders
// Procedural, primitive-based models with canvas-generated solar-cell and
// MLI-foil textures. Deliberately no external assets. Each builder returns a
// THREE.Group sized like the model it replaces so orbits/raycasts are stable.
// Exposes window.Spacecraft = { buildISS, buildHWO, buildStarship,
//                               buildViper, buildLRO }.
// ============================================================================
(function () {
  'use strict';

  // ---- shared canvas textures ---------------------------------------------
  var texCache = {};

  function solarCellTexture() {
    if (texCache.solar) return texCache.solar;
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    var ctx = cv.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 256, 128);
    g.addColorStop(0, '#101f42');
    g.addColorStop(0.5, '#1b3563');
    g.addColorStop(1, '#0d1a38');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = 'rgba(150,180,230,0.5)';
    ctx.lineWidth = 1;
    for (var x = 0; x <= 256; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
    for (var y = 0; y <= 128; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(220,235,255,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 64); ctx.lineTo(256, 64); ctx.stroke();
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    texCache.solar = tex;
    return tex;
  }

  function mliTexture() {
    if (texCache.mli) return texCache.mli;
    var cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#a3791c';
    ctx.fillRect(0, 0, 128, 128);
    // crinkled foil: random bright/dark facets
    for (var i = 0; i < 480; i++) {
      var x = Math.random() * 128, y = Math.random() * 128;
      var w = 2 + Math.random() * 9, h = 2 + Math.random() * 9;
      var l = 0.32 + Math.random() * 0.5;
      ctx.fillStyle = 'rgba(' + Math.round(215 * l + 40) + ',' + Math.round(165 * l + 25) + ',' + Math.round(45 * l) + ',0.5)';
      ctx.fillRect(x, y, w, h);
    }
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    texCache.mli = tex;
    return tex;
  }

  function radiatorTexture() {
    if (texCache.rad) return texCache.rad;
    var cv = document.createElement('canvas');
    cv.width = 128; cv.height = 64;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#dfe4e8';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = 'rgba(150,158,168,0.7)';
    ctx.lineWidth = 2;
    for (var x = 6; x < 128; x += 10) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 64); ctx.stroke(); }
    var tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    texCache.rad = tex;
    return tex;
  }

  function hexMirrorTexture() {
    if (texCache.hex) return texCache.hex;
    var cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#c79a2a';
    ctx.fillRect(0, 0, 256, 256);
    var R = 30;
    ctx.strokeStyle = 'rgba(60,42,8,0.9)';
    ctx.lineWidth = 3;
    for (var row = -1; row < 6; row++) {
      for (var col = -1; col < 6; col++) {
        var cx = col * R * 1.74 + (row % 2 ? R * 0.87 : 0) + 20;
        var cy = row * R * 1.5 + 20;
        ctx.beginPath();
        for (var k = 0; k < 6; k++) {
          var a = Math.PI / 3 * k + Math.PI / 6;
          var px = cx + R * Math.cos(a), py = cy + R * Math.sin(a);
          if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        var shade = 0.85 + Math.random() * 0.3;
        ctx.fillStyle = 'rgba(' + Math.round(214 * shade) + ',' + Math.round(168 * shade) + ',' + Math.round(52 * shade) + ',1)';
        ctx.fill();
        ctx.stroke();
      }
    }
    var tex = new THREE.CanvasTexture(cv);
    texCache.hex = tex;
    return tex;
  }

  // ---- shared materials -----------------------------------------------------
  function matSolar() {
    return new THREE.MeshStandardMaterial({
      map: solarCellTexture(), color: 0x7d88a8,
      metalness: 0.3, roughness: 0.55,
      emissive: 0x0a1830, emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });
  }
  function matMLI() {
    return new THREE.MeshStandardMaterial({
      map: mliTexture(), color: 0xffffff,
      metalness: 0.75, roughness: 0.45
    });
  }
  function matWhite() {
    return new THREE.MeshStandardMaterial({ color: 0xe8e6e1, metalness: 0.25, roughness: 0.55 });
  }
  function matSteel() {
    return new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 0.95, roughness: 0.3 });
  }
  function matDark() {
    return new THREE.MeshStandardMaterial({ color: 0x24262b, metalness: 0.6, roughness: 0.55 });
  }
  function matRadiator() {
    return new THREE.MeshStandardMaterial({ map: radiatorTexture(), metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide });
  }

  // ============================================================================
  // ISS — integrated truss, 8 solar wings, radiators, module stack, Canadarm
  // ============================================================================
  function buildISS() {
    var g = new THREE.Group();
    var steel = matSteel();
    var white = matWhite();
    var solar = matSolar();

    // main truss: segmented lattice look via alternating box sections
    for (var s = -5; s < 5; s++) {
      var seg = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.34, 0.34), s % 2 ? steel : matDark());
      seg.position.x = s + 0.5;
      g.add(seg);
    }

    // 4 solar array wing pairs (P6/P4/S4/S6-style) on rotating joints
    [-4.6, -3.4, 3.4, 4.6].forEach(function (tx, i) {
      var joint = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 12), white);
      joint.rotation.z = Math.PI / 2;
      joint.position.set(tx, 0, 0);
      g.add(joint);
      [1, -1].forEach(function (dir) {
        var wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 3.4), solar);
        wing.position.set(tx, 0, dir * 2.05);
        g.add(wing);
        var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.4, 6), steel);
        mast.rotation.x = Math.PI / 2;
        mast.position.set(tx, 0, dir * 2.05);
        g.add(mast);
      });
    });

    // radiators near center, angled
    [-1.6, 1.6].forEach(function (tx) {
      var rad = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.015, 1.9), matRadiator());
      rad.position.set(tx, -0.55, 0.2);
      rad.rotation.x = 0.45;
      g.add(rad);
    });

    // pressurized module stack along Z through the truss center
    function module(r, len, z, mat_) {
      var mm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), mat_ || white);
      mm.rotation.x = Math.PI / 2;
      mm.position.set(0, -0.05, z);
      g.add(mm);
      return mm;
    }
    module(0.34, 1.6, 2.1);            // Zvezda
    module(0.36, 1.4, 0.9, matMLI());  // Zarya (gold MLI)
    module(0.3, 0.7, 0.0);             // Unity node
    module(0.35, 1.5, -0.9);           // Destiny lab
    module(0.3, 0.7, -1.9);            // Harmony
    // Kibo + Columbus stubs, perpendicular
    var kibo = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.1, 16), white);
    kibo.rotation.z = Math.PI / 2;
    kibo.position.set(0.85, -0.05, -1.9);
    g.add(kibo);
    var columbus = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.8, 16), white);
    columbus.rotation.z = Math.PI / 2;
    columbus.position.set(-0.75, -0.05, -1.9);
    g.add(columbus);
    // cupola
    var cupola = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), matDark());
    cupola.rotation.x = Math.PI;
    cupola.position.set(0, -0.38, 0);
    g.add(cupola);
    // Canadarm2
    var armSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), white);
    armSeg1.position.set(0.6, 0.45, -0.4);
    armSeg1.rotation.z = 0.7;
    g.add(armSeg1);
    var armSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8), white);
    armSeg2.position.set(1.5, 0.85, -0.4);
    armSeg2.rotation.z = -0.5;
    g.add(armSeg2);

    g.scale.set(0.5, 0.5, 0.5);
    return g;
  }

  // ============================================================================
  // HWO — segmented primary mirror, barrel baffle, layered sunshield, bus
  // ============================================================================
  function buildHWO() {
    var g = new THREE.Group();
    var steel = matSteel();
    var dark = matDark();

    // barrel baffle housing the primary
    var barrel = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 1.6, 32, 1, true), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.3;
    g.add(barrel);

    // segmented primary mirror face
    var mirror = new THREE.Mesh(
      new THREE.CylinderGeometry(1.25, 1.25, 0.1, 32),
      new THREE.MeshStandardMaterial({
        map: hexMirrorTexture(),
        metalness: 0.9, roughness: 0.12,
        emissive: 0x6b5210, emissiveIntensity: 0.25
      })
    );
    mirror.rotation.x = Math.PI / 2;
    mirror.position.z = -0.3;
    g.add(mirror);

    // secondary mirror on struts, out front
    var sec = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), steel);
    sec.rotation.x = Math.PI / 2;
    sec.position.z = 1.8;
    g.add(sec);
    for (var i = 0; i < 3; i++) {
      var a = (i / 3) * Math.PI * 2 + 0.5;
      var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), steel);
      // lean each strut from the barrel rim in toward the secondary mirror
      strut.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0.95);
      strut.rotation.x = Math.PI / 2;
      strut.rotation.y = -Math.cos(a) * 0.19;
      strut.rotation.x += Math.sin(a) * 0.19;
      g.add(strut);
    }

    // spacecraft bus behind the mirror
    var bus = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.1), matMLI());
    bus.position.z = -1.15;
    g.add(bus);

    // five-layer kite sunshield below/behind
    for (var l = 0; l < 5; l++) {
      var shield = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2 - l * 0.06, 2.2 - l * 0.06, 0.012, 4),
        new THREE.MeshStandardMaterial({
          color: l % 2 ? 0xd8d4ce : 0xc0bcb6,
          metalness: 0.85, roughness: 0.3,
          side: THREE.DoubleSide
        })
      );
      shield.rotation.x = Math.PI / 2;
      shield.rotation.y = Math.PI / 4;
      shield.position.z = -1.9 - l * 0.09;
      g.add(shield);
    }

    // solar panel + HGA on the bus
    var panel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.02, 0.7), matSolar());
    panel.position.set(0, -1.0, -1.3);
    g.add(panel);
    var dish = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), steel);
    dish.position.set(0, 0.75, -1.5);
    dish.rotation.x = -0.8;
    g.add(dish);

    return g;
  }

  // ============================================================================
  // Starship — smooth lathe hull, black TPS half-shell, flaps, legs, raptors
  // ============================================================================
  function buildStarship() {
    var g = new THREE.Group();
    var steel = new THREE.MeshStandardMaterial({ color: 0xd6d9dd, metalness: 0.98, roughness: 0.26 });
    var tps = new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: 0.4, roughness: 0.62 });

    // hull profile: cylinder flowing into an ogive nose
    var pts = [];
    pts.push(new THREE.Vector2(1.45, 0));
    pts.push(new THREE.Vector2(1.45, 5.6));
    pts.push(new THREE.Vector2(1.42, 6.2));
    pts.push(new THREE.Vector2(1.28, 7.2));
    pts.push(new THREE.Vector2(1.0, 8.1));
    pts.push(new THREE.Vector2(0.6, 8.85));
    pts.push(new THREE.Vector2(0.0, 9.4));
    var hull = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), steel);
    g.add(hull);

    // TPS tile belly: same profile, half revolution, hair larger
    var ptsT = pts.map(function (p) { return new THREE.Vector2(p.x * 1.015, p.y); });
    var belly = new THREE.Mesh(new THREE.LatheGeometry(ptsT, 24, -Math.PI / 2, Math.PI), tps);
    g.add(belly);

    // forward flaps
    [1, -1].forEach(function (dir) {
      var f = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.7, 0.75), tps);
      f.position.set(dir * 1.35, 7.5, 0);
      f.rotation.z = dir * -0.12;
      g.add(f);
    });
    // aft flaps
    [1, -1].forEach(function (dir) {
      var f = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 1.05), tps);
      f.position.set(dir * 1.5, 1.35, 0);
      f.rotation.z = dir * -0.1;
      g.add(f);
    });

    // landing legs
    for (var i = 0; i < 4; i++) {
      var a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 1.6, 8), matDark());
      leg.position.set(Math.cos(a) * 1.35, 0.4, Math.sin(a) * 1.35);
      leg.rotation.z = Math.cos(a) * 0.42;
      leg.rotation.x = -Math.sin(a) * 0.42;
      g.add(leg);
    }

    // raptor skirt
    for (var r = 0; r < 3; r++) {
      var a2 = (r / 3) * Math.PI * 2;
      var eng = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.5, 12), matDark());
      eng.position.set(Math.cos(a2) * 0.5, 0.05, Math.sin(a2) * 0.5);
      g.add(eng);
    }

    g.scale.set(0.5, 0.5, 0.5);
    return g;
  }

  // ============================================================================
  // VIPER — MLI chassis, mast with stereo cams, grouser wheels, headlights
  // ============================================================================
  function buildViper() {
    var g = new THREE.Group();
    var mli = matMLI();
    var dark = matDark();
    var steel = matSteel();

    // chassis: tall boxy body
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.9), mli);
    body.position.y = 1.05;
    g.add(body);
    // radiator top deck
    var deck = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 1.8), matWhite());
    deck.position.y = 1.63;
    g.add(deck);
    // side solar panels (VIPER carries vertical panels for polar sun angles)
    [1, -1].forEach(function (dir) {
      var sp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 1.7), matSolar());
      sp.position.set(dir * 0.78, 1.1, 0);
      g.add(sp);
    });
    // mast with stereo cameras + lights
    var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 8), steel);
    mast.position.set(0.25, 2.15, 0.55);
    g.add(mast);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.18), dark);
    head.position.set(0.25, 2.7, 0.55);
    g.add(head);
    [0.12, -0.12].forEach(function (dx) {
      var eye = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), steel);
      eye.rotation.x = Math.PI / 2;
      eye.position.set(0.25 + dx, 2.7, 0.66);
      g.add(eye);
    });
    // headlights
    [0.45, -0.45].forEach(function (dx) {
      var hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.1, 0.03),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 0.9 })
      );
      hl.position.set(dx, 1.28, 0.97);
      g.add(hl);
    });

    // wheels with grousers
    var wheelPos = [[-0.85, 0.45, 0.72], [-0.85, 0.45, -0.72], [0.85, 0.45, 0.72], [0.85, 0.45, -0.72]];
    g.userData.wheels = [];
    wheelPos.forEach(function (wp) {
      var wheel = new THREE.Group();
      var tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.34, 18), dark);
      wheel.add(tire);
      for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        var grouser = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 0.04), steel);
        grouser.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
        grouser.rotation.y = -a;
        grouser.rotation.z = Math.PI / 2;
        wheel.add(grouser);
      }
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wp[0], wp[1], wp[2]);
      g.add(wheel);
      g.userData.wheels.push(wheel);
      // suspension arm
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), steel);
      arm.position.set(wp[0] * 0.75, 0.75, wp[2]);
      arm.rotation.z = wp[0] > 0 ? -0.5 : 0.5;
      g.add(arm);
    });

    g.scale.set(0.36, 0.36, 0.36);
    return g;
  }

  // ============================================================================
  // LRO — MLI bus, single offset solar array, parabolic HGA on boom
  // ============================================================================
  function buildLRO() {
    var g = new THREE.Group();
    var steel = matSteel();

    var bus = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.42), matMLI());
    g.add(bus);

    // instrument deck: small cylinders looking "down"
    [[0.12, 0.36, 0.1], [-0.1, 0.36, -0.08], [0.02, 0.36, -0.14]].forEach(function (p) {
      var inst = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 10), matDark());
      inst.position.set(p[0], p[1], p[2]);
      g.add(inst);
    });

    // solar array on a yoke boom
    var boom = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), steel);
    boom.rotation.z = Math.PI / 2;
    boom.position.set(-0.5, 0.05, 0);
    g.add(boom);
    var array = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.015, 0.65), matSolar());
    array.position.set(-1.15, 0.05, 0);
    array.rotation.x = 0.25;
    g.add(array);

    // HGA: shallow parabolic dish via lathe, on the opposite boom
    var dishPts = [];
    for (var i = 0; i <= 8; i++) {
      var r = (i / 8) * 0.22;
      dishPts.push(new THREE.Vector2(r, r * r * 1.4));
    }
    var dish = new THREE.Mesh(new THREE.LatheGeometry(dishPts, 20),
      new THREE.MeshStandardMaterial({ color: 0xf0eee9, metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide }));
    var boom2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 6), steel);
    boom2.rotation.z = Math.PI / 2;
    boom2.position.set(0.5, -0.1, 0);
    g.add(boom2);
    dish.position.set(0.85, -0.1, 0);
    dish.rotation.z = -Math.PI / 2;
    g.add(dish);

    return g;
  }

  window.Spacecraft = {
    buildISS: buildISS,
    buildHWO: buildHWO,
    buildStarship: buildStarship,
    buildViper: buildViper,
    buildLRO: buildLRO
  };
})();
