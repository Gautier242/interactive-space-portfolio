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

  let yaw = 0, pitch = 0;          // radians, relative to the rover's heading
  let dragging = false, px = 0, py = 0;
  // Which finger is looking around. Driving is a press-and-hold on the arrow
  // buttons, so on a phone there are two live pointers: the thumb parked on
  // the arrow and the finger dragging the view. Without this id every twitch
  // of the parked thumb was fed into px/py as if it were the drag, and the
  // view snapped the whole distance between the two fingers and back.
  let dragId = null;

  const MAX_PITCH = 0.55;          // keep the horizon in shot
  const SENS = 0.005;

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
    pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch + (e.clientY - py) * SENS));
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

  (function tick() {
    requestAnimationFrame(tick);
    const on = active();
    if (on !== was) {
      was = on;
      if (!on) { yaw = 0; pitch = 0; dragging = false; dragId = null; }
    }
    if (!on) return;

    // rover heading, then our yaw offset about world up
    fwd.set(0, 0, -1).applyQuaternion(moonViper.quaternion);
    fwd.applyAxisAngle(UP, yaw);

    // chase position sits behind and above the rover, along the looked-at dir
    eye.copy(moonViper.position).addScaledVector(fwd, -5).add(new THREE.Vector3(0, 2, 0));
    moonCamera.position.copy(eye);

    aim.copy(moonViper.position).addScaledVector(fwd, 3);
    aim.y += 1 - pitch * 4;        // pitch tilts the aim point up or down
    moonCamera.lookAt(aim);
  })();

  window.__roverLook = { reset() { yaw = 0; pitch = 0; } };
})();
