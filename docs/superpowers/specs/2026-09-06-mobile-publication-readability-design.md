# Mobile publication readability — design

Date: 2026-09-06
Status: approved in chat, not yet implemented
Baseline: v3.3 (`999439e`)
Scope: **mobile only.** Desktop is explicitly out of scope and must be
byte-identical afterwards.

---

## Problem

The portfolio's stated first purpose is reading the research. On a phone the
figure attached to each publication is decorative rather than informative.

Verified, not assumed:

| Fact | Where |
|---|---|
| Mobile figure box is `104 x 72` px | `demo/mobile.css:334-341` |
| A 1000x539 figure fitted into it renders at `104 x 56` CSS px | `object-fit: contain`, same block |
| That is ~10% of the pixels shipped and 1/10th the figure's native width | arithmetic |
| Largest figure asset in the repo is 1000 px wide | `images/*-1000.webp`, 9 files |
| List markup is shared between desktop and mobile | `js/app.js:321` `renderPublications()` |
| Sections are derived from `pub.inst` | `js/app.js:311` `groupPublications()` |
| `body` is 1:1 across 9 distinct objects | `js/app.js` PUBS entries |

Resolution budget, measured rather than guessed:

```
phone content width   390 - padding  ~ 366 CSS px
        x DPR 3                      ~ 1098 device px
largest asset shipped                = 1000 px      -> 85%, adequate
desktop right panel ~835 CSS px @DPR2 ~ 1670        -> 60%, visibly soft
```

Mobile is the case the existing 1000 px assets already serve. This is why the
work is scoped to mobile and why it needs no new images.

---

## The one trap that must be handled first

`onWindowResize()` (`js/app.js:2849`) computes `camera.aspect = width / height`
from `leftPanel.clientWidth/clientHeight` with no zero guard. Hiding the map
panel makes `height` 0, so `aspect` becomes `Infinity` and
`updateProjectionMatrix()` writes NaN into the projection matrix. The scene
then renders nothing **permanently**, including after switching back.

The guard belongs in `onWindowResize` itself, not at the call sites: five
callers route through it (`window resize`, `mobile.js` `reflow()`,
`figure.js` `apply()`, the orientation handler, and app.js's own timers), and
guarding one caller leaves the rest broken.

```js
function onWindowResize() {
  const width = leftPanel.clientWidth;
  const height = leftPanel.clientHeight;
  if (!width || !height) return;   // hidden panel: keep the last good matrix
  ...
}
```

This is the only change to `js/app.js` in the whole design, and it is a
one-line fail-safe rather than a behaviour change.

---

## Design

### 1. Reading mode

The mobile `.section-title` (`index.html:97`) holds static text today. On
mobile it becomes two tappable titles in the same row — `MAP + PROJECTS` and
`PROJECTS` — with `SET TEXT SIZE` unmoved. Costs no vertical height and reads
as titles rather than as a control.

`PROJECTS` adds `m-read` as a third entry to the existing `STOPS` array
(`demo/mobile.js:247`):

```
m-split  40vh map   (default, unchanged)
m-text   22vh map   (unchanged)
m-read   no map     (new)
```

In `m-read`: `.left` hidden, `.m-split` chevron bar hidden, list full screen.

A third stop was removed once before, but it was a third *large-map* stop that
made the chevron control unpredictable. This is a labelled mode entered by
tapping a title, not a fourth chevron position, so it does not reintroduce
that problem.

**Render pause.** With the map hidden there is no reason to run WebGL. The
bloom pass alone is 1.80 ms/frame, a measured 45% of the render loop, so
pausing in `m-read` is a real battery and heat saving on a phone. Resume
restores size via the guarded `onWindowResize()`.

### 2. Full-width figures

`demo/mobile.css:334` moves from a `104 x 72` side box to a full-card-width
block above the text. `object-fit: contain` is preserved — cropping a
scientific figure is a standing rejection and applies here too.

The `sizes` attribute in `js/app.js:350` currently ends in `250px`, so the
browser fetches the 400w variant. Left alone it would keep fetching 400w for a
box that now wants ~1000w and the change would look no sharper. The mobile
branch of `sizes` must ask for `100vw`.

This is the single highest-value change in the design: 3.5x linear size, no
new assets, no new bytes beyond the larger variant the browser now picks.

### 3. Sibling swipe

With a publication open, a horizontal swipe moves to the next paper in the
same institution group.

- fires only when `|dx| > 60` and `|dx| > 1.5 * |dy|`, so vertical scrolling
  through a long description is untouched
- wraps within the section; never crosses into another institution
- bounded by construction: sections hold 1-5 papers, never 30

Swipes are undiscoverable, so the detail header carries `< 2 of 3 >`. The
chevrons are real tap targets, so nobody depends on knowing the gesture.

### 4. Scaling to 30 papers

Nothing structural changes. `groupPublications()` derives sections from
`pub.inst`, so new entries cost nothing. Sticky institution headers keep the
reader oriented while scrolling.

Deliberately **not** built: collapsible sections. A vertical list of
full-width cards stays scannable to roughly 15-20 entries; there are 9. This
is a ~20-line addition on the day the list crosses that line, and building it
now is speculation.

The part that genuinely does not scale is the map link: `body` is 1:1 across
9 objects and there is no 30th object to attach a 30th paper to. Past that,
several papers share one body — which is exactly the case the sibling swipe
already handles.

---

## Files touched

| File | Change |
|---|---|
| `js/app.js` | zero guard in `onWindowResize`; mobile branch of `sizes` |
| `demo/mobile.css` | full-width figure block, `m-read` rules, sticky headers |
| `demo/mobile.js` | `m-read` stop, the two title tabs, render pause |
| `demo/figure.js` | sibling swipe + `< n of m >` affordance |
| `index.html` | the two titles in `.section-title` |

Every CSS rule scoped to `.mobile-device`. The desktop layout matches neither
`.mobile-device` nor `m-read`.

---

## Verification

1. **Desktop unchanged** — render `index.html` at 1300x950 before and after and
   diff the images. This is the binding constraint and gets checked first.
2. **`onWindowResize` guard** — a runnable check asserting `camera.aspect`
   stays finite when the panel measures 0. A NaN projection matrix is silent
   and permanent, so it must not rely on being noticed by eye.
3. **Figure request** — confirm the mobile list actually fetches the 1000w
   variant, via `performance.getEntriesByType('resource')`. Without this the
   layout change is cosmetic.
4. **Swipe thresholds** — assert a vertical drag does not advance the
   publication.
5. **Real device** — the layout itself is judged on the author's phone.
   Headless Chrome at a simulated viewport is not evidence for feel.

---

## Out of scope

- Desktop. Untouched, and proven so by 1 above.
- New higher-resolution figures. Mobile is served by the 1000 px assets; the
  author will supply better originals only if the result warrants it.
- Rebuilding the SWOT animation from screenshots. Wanted, but separate work.
- Collapsible sections (see 4 above).
- Horizontal institution rails, considered and rejected: items past the second
  are rarely seen, which buries the research the portfolio exists to show.
