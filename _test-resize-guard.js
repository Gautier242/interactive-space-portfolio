/* Runnable check for the onWindowResize zero guard.  node _test-resize-guard.js
 *
 * A hidden map panel measures 0. Without a guard, aspect becomes Infinity and
 * updateProjectionMatrix writes NaN into the projection matrix, blanking the
 * scene permanently - including after the panel comes back. That failure is
 * silent, so it must not depend on being noticed by eye.
 *
 * Extracts the real function from js/app.js rather than testing a copy.
 */
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync(__dirname + '/js/app.js', 'utf8');
const start = src.indexOf('function onWindowResize()');
assert.notStrictEqual(start, -1, 'onWindowResize not found in js/app.js');
let depth = 0, end = start;
for (let i = src.indexOf('{', start); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}' && --depth === 0) { end = i + 1; break; }
}
const fnSrc = src.slice(start, end);

function run(w, h) {
  const camera = { aspect: 1, updateProjectionMatrix() { this.updated = this.aspect; } };
  const sizes = [];
  const sandbox = {
    leftPanel: { clientWidth: w, clientHeight: h },
    camera,
    renderer: { setSize: (a, b) => sizes.push([a, b]) },
    moonRenderer: null,
    moonCamera: null,
  };
  const keys = Object.keys(sandbox);
  new Function(...keys, fnSrc + '; onWindowResize();')(...keys.map(k => sandbox[k]));
  return { camera, sizes };
}

// a hidden panel must not corrupt the camera
const hidden = run(0, 0);
assert.ok(Number.isFinite(hidden.camera.aspect),
  `aspect must stay finite when the panel is hidden, got ${hidden.camera.aspect}`);
assert.strictEqual(hidden.sizes.length, 0, 'must not resize the renderer to 0x0');

// zero height alone is enough to produce Infinity, so check it on its own
const flat = run(800, 0);
assert.ok(Number.isFinite(flat.camera.aspect),
  `aspect must stay finite at zero height, got ${flat.camera.aspect}`);

// and the normal path must still work
const normal = run(800, 600);
assert.strictEqual(normal.camera.aspect, 800 / 600, 'normal resize still applies');
assert.deepStrictEqual(normal.sizes, [[800, 600]], 'renderer resized normally');

console.log('ok - onWindowResize survives a hidden panel and still resizes normally');
