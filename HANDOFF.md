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
- Local: `python3 -m http.server 4321` from the repo root
- **Deploy is confirmed**: GitHub Pages serves from `main` at the repo root
  (no CNAME, no `docs/`, no Actions workflow) to
  `https://gautier242.github.io/interactive-space-portfolio/`. Verified by
  SHA-256 of the live `index.html` and `demo/tour3.js` matching local, not by
  the gh CLI, whose token is invalid. To re-check after a push:

```
diff <(curl -s https://gautier242.github.io/interactive-space-portfolio/) index.html
```

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

**3b. Headless Chrome freezes CSS transitions under `--virtual-time-budget`.**
A divider drag looked completely broken: the handler ran, the inline
`flex: 0 0 65.3%` was set, and the element stayed at its old 35% width no
matter how long the probe waited — `getComputedStyle` kept returning the
transition's *start* value. `.left` has `transition: flex .3s`, and virtual
time does not drive the animation clock. Set `el.style.transition = 'none'`
in the probe before measuring anything that transitions. Same family as the
rAF trap below.

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

## Mobile (reworked 2026-09-05)

Mobile is `.mobile-device`, a **one-shot user-agent sniff** in `index.html`.
A phone asking for "Desktop site" fails that sniff and gets the desktop
layout with **none** of the mobile rules — that is not a bug to fix by
widening the sniff, it is what the visitor asked for. Anything that must be
true for *any finger on glass* belongs behind `(pointer: coarse)` /
`matchMedia('(pointer: coarse)')`, which survives the spoofed user-agent.

- `demo/mobile.css` + `demo/mobile.js` hold the mobile layout. Deleting the
  two tags in `index.html` reverts it.
- The controls live in a `.m-dock` **below** the map, moved there by
  `mobile.js`. `.left` keeps its own box so `onWindowResize()` still measures
  the right thing.
- Map is 40vh; `.m-expand` toggles `html.m-full` for a fullscreen map.
- **Font sizes**: `main.css:36-47` sets every list/detail size as
  `calc(Npx * var(--list-font-scale)) !important`. A plain `font-size` for
  those elements is silently ignored — match the form or it will not apply.
- Three buttons wanted the same corner of the map (`.obj-toggle`,
  `.instructions-toggle`, `.t3-replay`). Tips is hidden on mobile; check for
  collisions before adding a fourth.
- The tour does not auto-start on touch and drops the steps that puppet the
  canvas with synthetic `MouseEvent`s — those never reach the touch handlers,
  so they animated nothing while the caption claimed otherwise.

## Open work, roughly in priority order

**1. Page weight — DONE, 15.55 MB → 5.68 MB.** Measured on localhost at
DPR 2 with `performance.getEntriesByType('resource')`.

| | before | after |
|---|---|---|
| `images/` | 13.08 MB | 0.11 MB |
| `assets/textures/` | 6.18 MB | 3.12 MB |
| total | 15.55 MB | 5.68 MB |

Publication figures ship at 400/640/1000 px WebP behind a `srcset`; `sizes`
starts with `auto` because the divider is draggable so the rendered width is
not knowable from media queries. `swot.webp` was an 84-frame animated WebP
(3031 KB) loading for a 198 px thumbnail — the list now gets a still first
frame and the animation loads on click via the new `imgAnimated` field.
Planet textures are WebP at an unchanged 2048×1024; **do not halve them**,
`planets-real.js:114-124` derives crater relief from texture luminance at a
UV offset tuned for 2048 px.

What is left, if anyone cares: textures 3.12 MB, models 1.08 MB, js 1.06 MB.

**2. Frame rate — profiled. It is the bloom pass, not the tick loops.**
`demo/_profile.js` + `profile.html` wrap rAF before the overlays register and
attribute main-thread time by registration site. Over 8 s at ~53 fps:

```
app.js:1668  (main render loop)   209.63 ms/s   84%
all 11 demo/ tick loops            33.36 ms/s   13%
  reticles.js  12.85 | hover-info  6.06 | 4 idle watchers  4.94
```

Every suspect on the old list is noise. The cost is inside the render call,
in the bloom `cinematic.js` installs — it has no tick loop, which is why it
was never suspected. Same instrument with bloom off: 3.977 → 2.173 ms/frame.
Bloom is **1.80 ms/frame, 45% of the render loop**, more than double all the
tick loops combined.

`UnrealBloomPass` ran its five mip levels of separable blur at full panel
resolution. `?bloom=<scale>` scales the blur chain; default 1 is byte-for-byte
the shipped behaviour. Back to back: `?bloom=1` 3.382 ms/45.9 fps,
`?bloom=0.5` 2.971 ms/59.7 fps. **The visual cost of 0.5 is unjudged** — it
needs a real GPU, headless is a software rasteriser.

Measurement warning: fps in headless decays *within* one page session (53 →
40 over 20 s). Trust the ms/s attribution, which is measured inside the same
frames; do not trust fps deltas between pages.

**2b. `2k_earth_specular_map.jpg` is not a JPEG.** It is a saved Solar System
Scope HTML page with a `.jpg` name, so it has never decoded. `specMask` in
the Earth shader therefore samples nothing and the ocean sun-glint
(`planets-real.js:82-85`) has always been dead. Fixing it changes how Earth
looks, so it needs a decision first. It also 404s in spirit twice per load.

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
