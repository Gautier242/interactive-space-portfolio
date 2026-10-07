/* ROVER LOOK-AROUND — make dragging work while driving VIPER.
 *
 * In rover POV mode app.js recomputes moonCamera.position and calls lookAt()
 * from the rover's own heading EVERY frame:
 *
 *     moonCamera.position.copy(cameraPos);
 *     moonCamera.lookAt(roverPos + forward*3 + up);
 *
 * so any drag was overwritten before it could be seen — the view was welded
 * to the rover's facing. This keeps a yaw/pitch offset the drag edits, and
 * re-derives the camera from it after app.js has had its turn. rAF callbacks
 * fire in registration order and app.js registers its loop at load, so this
 * one runs later in the same frame and wins.
 */
(function () {
  const moonCanvas = document.getElementById('moonSurface');
  if (!moonCanvas) return;

  // Chase camera on a sphere round the rover: yaw (radians, relative to its
  // heading, 0 = straight behind), elevation above the ground plane, and
  // distance. Drag orbits (yaw + elevation), the wheel and the toolbar's
  // + / - change the distance (app.js performZoom delegates here).
  const DEF = { el: 0.38, dist: 5.4 };   // the old fixed pose: 5 back, 2 up
  let yaw = 0, pitch = DEF.el, dist = DEF.dist;
  let dragging = false, px = 0, py = 0;
  // Which finger is looking around. Driving is a press-and-hold on the arrow
  // buttons, so on a phone there are two live pointers: the thumb parked on
  // the arrow and the finger dragging the view. Without this id every twitch
  // of the parked thumb was fed into px/py as if it were the drag, and the
  // view snapped the whole distance between the two fingers and back.
  let dragId = null;

  const EL_MIN = 0.06, EL_MAX = 1.35;      // just above the ground .. nearly overhead
  const D_MIN = 2.5, D_MAX = 60;
  const SENS = 0.005;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function zoom(direction) {               // +1 closer, -1 further, per step
    dist = clamp(dist * (direction > 0 ? 0.9 : 1.11), D_MIN, D_MAX);
  }
  moonCanvas.addEventListener('wheel', e => {
    if (!active()) return;
    dist = clamp(dist * Math.exp(e.deltaY * 0.0015), D_MIN, D_MAX);
  }, { passive: true });

  function active() {
    return typeof roverPOVMode !== 'undefined' && roverPOVMode &&
           typeof moonSurfaceActive !== 'undefined' && moonSurfaceActive &&
           typeof moonViper !== 'undefined' && moonViper &&
           typeof moonCamera !== 'undefined' && moonCamera;
  }

  moonCanvas.addEventListener('pointerdown', e => {
    if (!active() || dragging) return;      // first finger on the view owns the look
    dragging = true; dragId = e.pointerId;
    px = e.clientX; py = e.clientY;
    moonCanvas.style.cursor = 'grabbing';
  });
  window.addEventListener('pointermove', e => {
    if (!dragging || e.pointerId !== dragId || !active()) return;
    yaw -= (e.clientX - px) * SENS;
    pitch = clamp(pitch + (e.clientY - py) * SENS, EL_MIN, EL_MAX);
    px = e.clientX; py = e.clientY;
  });
  // pointercancel matters on touch: the browser takes the pointer away for its
  // own gestures and never sends pointerup. Without this the drag stayed armed
  // with stale coordinates and the next touch jumped.
  ['pointerup', 'pointercancel'].forEach(t =>
    window.addEventListener(t, e => {
      if (!dragging || e.pointerId !== dragId) return;
      dragging = false; dragId = null;
      moonCanvas.style.cursor = '';
    }));

  // Recentre when leaving rover mode, so the next entry starts facing forward.
  let was = false;

  const fwd = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  // Looking from the orbit pose at a point just ahead of the rover, so the
  // rover sits a little low in frame with the way ahead above it. The eye is
  // kept above the terrain: orbiting low into a crater wall went under it.
  function applyLook() {
    fwd.set(0, 0, -1).applyQuaternion(moonViper.quaternion);
    fwd.y = 0; fwd.normalize().applyAxisAngle(UP, yaw);
    eye.copy(moonViper.position)
      .addScaledVector(fwd, -Math.cos(pitch) * dist)
      .addScaledVector(UP, Math.sin(pitch) * dist + 0.6);
    if (typeof MoonMission !== 'undefined' && MoonMission.heightAt) {
      eye.y = Math.max(eye.y, MoonMission.heightAt(eye.x, eye.z) + 0.8);
    }
    moonCamera.position.copy(eye);
    aim.copy(moonViper.position).addScaledVector(fwd, 1.5).addScaledVector(UP, 1);
    moonCamera.lookAt(aim);
  }

  // Every time VIPER is selected: point it toward Earth and start from the
  // close chase pose, behind and a little above the rover. The visitor
  // orbits and zooms from there. A search for the closest pose holding
  // Earth, Starship and LRO too ended 44-60 units out in the narrow map
  // panel, the rover a speck: they sit ~60 degrees apart round the rover.
  function startView() {
    yaw = 0; pitch = DEF.el; dist = DEF.dist;
    if (typeof moonEarth === 'undefined' || !moonEarth) return;
    const e = moonEarth.getWorldPosition(new THREE.Vector3());
    const p = moonViper.position;
    moonViper.rotation.y = Math.atan2(-(e.x - p.x), -(e.z - p.z));   // drives at Earth
    moonViper.updateMatrixWorld(true);
  }

  // moonRenderer is built lazily, when the Moon view first opens, so watch for
  // it rather than assuming it exists at load.
  let wrapped = false;
  (function waitForRenderer() {
    if (typeof moonRenderer !== 'undefined' && moonRenderer) {
      wrapped = true;
      const raw = moonRenderer.render.bind(moonRenderer);
      moonRenderer.render = function (sc, cam) {
        const on = active();
        if (on !== was) {
          was = on;
          if (!on) { dragging = false; dragId = null; }
          else startView();
        }
        if (on && cam === moonCamera) applyLook();
        return raw(sc, cam);
      };
      return;
    }
    requestAnimationFrame(waitForRenderer);
  })();

  window.__roverLook = {
    reset() { yaw = 0; pitch = DEF.el; dist = DEF.dist; },
    zoom,
    startView,
    get dist() { return dist; },
    get yaw() { return yaw; },
    get pitch() { return pitch; },
    get wrapped() { return wrapped; }
  };
})();
