// FIRST LIGHT arrival sequence.
// Adds body.first-light before first paint so the CSS reveal plays once,
// then removes it. Skipped entirely under prefers-reduced-motion.
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  document.body.classList.add('first-light');
  window.setTimeout(function () {
    document.body.classList.remove('first-light');
  }, 2600);
})();
