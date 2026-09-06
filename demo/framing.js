/* HERO FRAMING — the default view, recomposed.
 * The stock camera sits at (250,200,250) looking dead at the origin: high,
 * symmetrical, centred. That angle flattens the orbits into concentric
 * circles and pushes Jupiter outward off-frame. This drops close to the
 * ecliptic so the orbits compress into ellipses, pushes the Sun off the
 * centre onto a thirds line, and adds a slow idle drift that surrenders the
 * moment the visitor touches anything.
 */
(function () {
  const panel = document.getElementById('leftPanel');
  if (!panel || typeof camera === 'undefined') return;

  const PORTRAIT = panel.clientHeight > panel.clientWidth;

  // Elevation is a trade, not a "lower is better". Near the ecliptic the
  // orbits collapse into a thin horizontal band and a tall panel fills with
  // dead black; too high and they go back to flat concentric circles.
  // ~20° keeps the ellipses open while still reading as depth.
  // Sit near app.js's own starting distance (~406). The old 205 was half
  // that, so the scene visibly snapped from wide to close on load — two
  // views for the price of one — and the default was tighter than wanted.
  const R = PORTRAIT ? 350 : 380;
  const ELEV = (PORTRAIT ? 20 : 26) * Math.PI / 180;
  const Y = R * Math.tan(ELEV);

  // The Sun is centred, on every screen. This used to aim off-centre so the
  // Sun rode a thirds line, which composes nicely at one window size and
  // reads as "the view is shifted and looks weird" at the rest — the offset
  // is a fixed fraction of R, but how far off-centre that LOOKS depends on
  // the panel's aspect ratio, so no single value works everywhere. Mobile
  // had already dropped it for that reason; desktop now does the same.
  const DOWN = 0;
  const SIDE = 0;

  const aim = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const right = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  let az = Math.PI * 0.28;
  function place() {
    camera.position.set(Math.cos(az) * R, Y, Math.sin(az) * R);
    // offset the aim point in screen space, so the Sun lands off-centre no
    // matter where the drift has carried the camera
    dir.set(0, 0, 0).sub(camera.position).normalize();
    right.crossVectors(dir, UP).normalize();
    aim.set(0, 0, 0).addScaledVector(right, SIDE).addScaledVector(UP, DOWN);
    camera.lookAt(aim);
  }
  place();

  // ---- idle drift -------------------------------------------------------
  // Motion on arrival reads as "alive"; motion that fights your input reads
  // as broken. So it stops permanently on the first real interaction.
  let drifting = true;
  const stop = () => {
    drifting = false;
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t =>
      window.removeEventListener(t, stop, true));
  };
  ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(t =>
    window.addEventListener(t, stop, { capture: true, passive: true }));

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) drifting = false;

  let last = performance.now();
  (function drift(now) {
    requestAnimationFrame(drift);
    const dt = Math.min(0.05, ((now || performance.now()) - last) / 1000);
    last = now || performance.now();
    if (!drifting || window.__tourDriving) return;
    az += dt * 0.012;           // ~8.7 minutes for a full revolution
    place();
  })();

  // Let the tutorial drive the camera without the drift fighting it, and
  // hand control back afterwards from wherever it left off.
  window.__framing = {
    suspend() { window.__tourDriving = true; },
    resume(fromCamera) {
      if (fromCamera) az = Math.atan2(camera.position.z, camera.position.x);
      window.__tourDriving = false;
    },
    place,
    get R() { return R; },
    get Y() { return Y; },
    setAz(a) { az = a; place(); },
    getAz() { return az; },
  };
})();
