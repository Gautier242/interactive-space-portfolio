# Handoff — interactive space portfolio

Context for whoever picks this up next. Written after a long redesign pass on
the 3D solar-system panel.

---

## What this is

Gautier Bardi de Fourtou's research portfolio. Two panes: a live WebGL solar
system on the left, a publications list on the right. Clicking a body opens
the project attached to it. Some bodies open their own worlds (Moon surface,
VIPER rover you can drive).

- Repo: `github.com/Gautier242/interactive-space-portfolio`, branch `main`
- Live version = `index.html` at `c560cce`
- Local: `python3 -m http.server 4321` from the repo root

**Serve with no-store while iterating.** Chrome cached JS aggressively during
this work and silently served stale files for several rounds — I reported
passing tests against code the browser had never loaded. Use:

```
python3 -c "import http.server as h
class H(h.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store'); h.SimpleHTTPRequestHandler.end_headers(self)
h.test(HandlerClass=H, port=4321)"
```

---

## Architecture: the overlay pattern

`js/app.js` (~3000 lines) is the original app and is **almost untouched** —
exactly one line changed in this whole pass. Everything new lives in
`demo/*.js`, loaded after `app.js`, which reaches into its globals (`scene`,
`camera`, `bodies`, `renderer`, `moonScene`, `roverState`…) and wraps or
overrides behaviour.

Keep doing this. It made every change reversible by deleting a script tag, and
made it possible to A/B whole design directions without forking the app.

Load order matters (`index.html`): `cinematic → framing → moon-view →
real-models → orbits → reticles → camera → hover-info → tooltips → rover-look
→ rover-tour → tour3 → neural`.

| File | Does |
|---|---|
| `cinematic.js` | ACES tone mapping, bloom, Sun luminance. Shadows deliberately off |
| `framing.js` | Default camera pose + idle drift. Exposes `window.__framing` |
| `camera.js` | Zoom pivot, true follow, hero framing on publication open. `window.__cam` |
| `hover-info.js` | Instrument tag on hover + info toggle. `window.__objReadout` |
| `real-models.js` | NASA glTF swap-in with distance LOD |
| `moon-view.js` | Moon standing view, selection restriction, idle warm-up |
| `rover-look.js` | Drag-to-look while driving VIPER |
| `rover-tour.js` | Rover tutorial + arrival hint |
| `tour3.js` | Main guided tour. `?tour=guided\|hotspots\|cinematic\|practice` |
| `neural.js` | Header AI motif. `?nnbar=1` shows the variant switcher |
| `orbits.js`, `reticles.js`, `tooltips.js` | Orbit colours, reticle LOD, toolbar tooltips |

Unused-but-kept: `panels.*`, `instrument*.*`, `tour.js`, `tour2.js` — earlier
design directions Gautier reviewed and rejected. Harmless, useful as history.

---

## What he likes

- **Real over procedural** — the NASA ISS model was an immediate yes.
- **Instrument aesthetic** — monospace, tabular figures, dotted leaders,
  uppercase micro-labels, restrained. He pointed at this repeatedly.
- **Show, don't tell.** The tour works because it *drives the real controls*
  and you watch the scene respond. Text he will not read.
- **Big, uncropped figures.** The publications are scientific figures; he
  wants them whole and legible.
- **Discretion.** Annotation should be transparent, small, and get out of the
  way. He asked for the readout to be *less* prominent more than once.

## What he rejects

- **Anything that crops a figure.** I used `object-fit: cover` across five
  panel designs and all five were rejected largely for that.
- **Cluttered overlays.** Permanent labels on every body; a gold ring +
  dashed leader line — all removed at his request. When an overlay was fiddly
  he chose "remove it" over "fix it". Take that seriously.
- **Dead time.** A demo step that animates for 2s inside a 4.6s slot reads as
  broken. He noticed immediately.
- **Jumps.** View discontinuities bother him more than almost anything —
  wide→close on load, overview→standing on the Moon, cursor teleports.
- **Walls of text.** The original "HOW TO EXPLORE" legend is now hidden by
  CSS. Don't bring it back.

Decisions he made that look arbitrary but aren't:
- **HWO stays procedural.** ATLAST looks like a blank slab from most angles.
- **Header AI motif = "Network"**, in the top banner, not the right panel.
- **Panel design = the original.** All five redesigns were rejected.

---

## Recurring traps

**1. The browser degrades.** Long Playwright sessions drop to ~1 fps for
*everything*, including code that measured 60 fps minutes earlier. It looks
exactly like a performance regression you just introduced. **Before
diagnosing any slowness, measure a known-good page in the same session.** I
lost real time chasing a phantom 10-second Moon load that was this. Restart
the browser to get valid numbers.

**2. `.click()` is not a click.** It calls the handler directly and skips
hit-testing, so it cannot detect an invisible element covering your button.
That is exactly the bug it hid: an inactive tour layer at `opacity: 0` was
still hit-testable and swallowed every click. Use `document.elementFromPoint`
and dispatch to whatever is actually there.

**3. Measuring mid-animation.** Several "failures" were samples taken while a
camera flight was still running. Sample repeatedly until stable.

**4. `animate()` in `tour3.js` owns one shared rAF slot.** A later call
cancels an earlier one and its completion callback never fires. Schedule
anything that *must* happen on its own timer.

---

## Known-good verification snippets

```js
// fps
let f=0; const t0=performance.now();
await new Promise(r=>{const l=()=>{f++; performance.now()-t0<2500?requestAnimationFrame(l):r();};requestAnimationFrame(l);});
Math.round(f/((performance.now()-t0)/1000))

// the main tour's layer (rover-tour shares the .t3-layer class and is FIRST in the DOM)
document.getElementById('t3Label').closest('.t3-layer')

// real click
const r=el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
const target=document.elementFromPoint(x,y);
for (const t of ['pointerdown','mousedown','pointerup','mouseup','click'])
  target.dispatchEvent(new (t.startsWith('pointer')?PointerEvent:MouseEvent)(t,
    {bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}));
```

---

## Open work, roughly in priority order

**1. First paint is 15 MB / 11.9 s.** Flagged at the very start of this pass
and still untouched — the single biggest problem with the site. ~9.4 MB is
publication thumbnails shipped at full resolution. Resize them, serve WebP,
lazy-load below the fold. This pass added ~1.1 MB of models (idle-loaded, off
the critical path) and ~250 KB of code, so it did not help.

**2. Frame rate drifted down.** Early builds measured 60 fps; the final one
measures ~34 in a clean tab. The per-frame additions (tag projection, reticle
distance tests, camera follow, LOD) accumulated. Nobody has profiled which
one dominates. Do that before adding more per-frame work.

**3. Starship HLS is still procedural.** No public-domain model exists — it's
a SpaceX vehicle, and NASA publishes none. Options: improve the procedural
build (legs, thruster ring, elevator, stainless), or leave it.

**4. Moon surface realism.** He asked for photoreal regolith + hardware and
accepted the current version as a compromise. Real LOLA elevation data and
proper regolith shading is a project of its own.

**5. Unverified paths.** `?tour=hotspots|cinematic|practice` have not been
re-tested since several rounds of changes; `cinematic` still contains the
origin-scaling zoom bug fixed elsewhere (`tour3.js`, in the `CINE` array).

**6. Untracked leftovers.** `demo-v2…v6.2.html`, `demo-all/panels/models/…`
and four unused `assets/models/*.glb` (hwo-atlast, hwo-jwst, hwo-roman,
lander-apollo-lm, 2.4 MB) are on disk but deliberately not committed. Delete
or commit as you prefer.

---

## How he works

He reviews visually and gives precise, concrete feedback, usually with
screenshots and arrows. He will tell you exactly which pixel bothers him.
Trust it — every time I pushed back or assumed he meant something broader, he
meant precisely what he said.

He iterates in tight loops and expects each round to *hold* — regressions in
previously-approved behaviour are the thing most likely to frustrate him.
Verify with measurements, not by eye, and say plainly when something is
unverified. He responds well to being told "I didn't check that yet."
