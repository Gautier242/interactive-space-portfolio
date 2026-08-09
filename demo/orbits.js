/* ORBIT TRAJECTORIES — all of them clearly readable.
 *
 * Mutates the existing materials rather than replacing them, so the original
 * dashed pattern survives (a fresh LineDashedMaterial would need
 * computeLineDistances() re-run on every geometry to dash at all).
 *
 * Every orbit is warm gold and plainly visible. Publication-linked orbits are
 * brighter still, so the accent means "there is work here" rather than
 * "this one is legible and the rest are not".
 */
(function () {
  if (typeof orbits === 'undefined') return;

  const BASE = 0xe8cf9a;   // warm gold, all trajectories
  const HOT  = 0xffd27f;   // brighter gold, orbits carrying publications
  const BASE_OP = 0.5;
  const HOT_OP  = 0.85;

  const pubBodies = new Set(
    (typeof PUBS !== 'undefined' ? PUBS : []).map(p => p.body));

  // roll a satellite's publications up to the parent whose orbit is drawn
  if (typeof bodies !== 'undefined') {
    Object.keys(bodies).forEach(n => {
      if (!pubBodies.has(n)) return;
      let p = bodies[n].parent, guard = 0;
      while (p && guard++ < 8) { pubBodies.add(p); p = bodies[p] && bodies[p].parent; }
    });
  }

  function nameForRadius(r) {
    if (typeof bodies === 'undefined') return null;
    return Object.keys(bodies).find(
      n => !bodies[n].isMoon && Math.abs(bodies[n].orbit - r) < 0.5) || null;
  }

  orbits.forEach(line => {
    const r = line.geometry.attributes.position.getX(0);
    const hot = pubBodies.has(nameForRadius(r));
    const m = line.material;
    m.color.setHex(hot ? HOT : BASE);
    m.opacity = hot ? HOT_OP : BASE_OP;
    m.transparent = true;
    m.needsUpdate = true;
  });

  // Moon/satellite orbits sit inside a planet's system and would crowd the
  // wide view at full strength, so they stay quieter — but not invisible.
  // NB: moonOrbits holds {line, parent} wrappers, not bare Line objects.
  if (typeof moonOrbits !== 'undefined') {
    moonOrbits.forEach(entry => {
      const line = entry && entry.line ? entry.line : entry;
      if (!line || !line.material) return;
      const m = line.material;
      m.color.setHex(BASE);
      m.opacity = 0.42;
      m.transparent = true;
      m.needsUpdate = true;
    });
  }
})();
