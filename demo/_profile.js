// Per-frame profiler. Loaded BEFORE the demo overlays so it can wrap
// requestAnimationFrame while their tick loops are still registering.
// Attribution is by registration site: every one of these overlays reschedules
// itself from inside its own callback, so the stack at rAF time names the file
// and line of the loop being charged. Not shipped - profile.html only.
(function () {
  var raf = window.requestAnimationFrame.bind(window);
  var stats = Object.create(null);

  function site() {
    var st = (new Error()).stack || '';
    var lines = st.split('\n');
    for (var i = 1; i < lines.length; i++) {
      if (lines[i].indexOf('_profile.js') !== -1) continue;
      var m = lines[i].match(/\/([A-Za-z0-9_.-]+\.js):(\d+):/);
      if (m) return m[1] + ':' + m[2];
    }
    return 'unknown';
  }

  window.requestAnimationFrame = function (cb) {
    var label = site();
    return raf(function (t) {
      var t0 = performance.now();
      try {
        return cb(t);
      } finally {
        var dt = performance.now() - t0;
        var s = stats[label] || (stats[label] = { calls: 0, total: 0, max: 0 });
        s.calls++;
        s.total += dt;
        if (dt > s.max) s.max = dt;
      }
    });
  };

  window.__rafStats = stats;
  window.__rafReset = function () {
    for (var k in stats) delete stats[k];
  };
  // Report: ms of main-thread time per second of wall clock, per loop.
  window.__rafReport = function (seconds) {
    var out = [];
    for (var k in stats) {
      out.push({
        loop: k,
        callsPerSec: +(stats[k].calls / seconds).toFixed(1),
        msPerSec: +(stats[k].total / seconds).toFixed(2),
        avgMs: +(stats[k].total / stats[k].calls).toFixed(3),
        maxMs: +stats[k].max.toFixed(2)
      });
    }
    return out.sort(function (a, b) { return b.msPerSec - a.msPerSec; });
  };
})();
