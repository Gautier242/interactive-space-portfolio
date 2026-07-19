// Local fallback for missing publication images (replaces the old
// picsum.photos dependency: no external request, no random photos).
window.PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
  '<rect width="400" height="300" fill="#070a10"/>' +
  '<rect x="0.5" y="0.5" width="399" height="299" fill="none" stroke="#2a3140"/>' +
  '<circle cx="200" cy="132" r="34" fill="none" stroke="#f0a548" stroke-width="1.5" stroke-dasharray="6 5"/>' +
  '<text x="200" y="196" text-anchor="middle" fill="#939eae" font-family="monospace" font-size="12" letter-spacing="2">IMAGE UNAVAILABLE</text>' +
  '</svg>');

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
