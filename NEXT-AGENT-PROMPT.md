You're taking over my interactive space portfolio:
`~/Documents/Workspace/Portfolio/Space/interactive-space-portfolio`
(github.com/Gautier242/interactive-space-portfolio, branch `main`).

**Read `HANDOFF.md` in the repo root first.** It has the architecture, my
design preferences, and the traps that cost the last agent real time. Two in
particular will bite you:

- Long browser automation sessions degrade to ~1 fps for *everything*. It
  looks exactly like a regression you just caused. Before diagnosing any
  slowness, measure a known-good page in the same session, and restart the
  browser to get valid numbers.
- Serve locally with `Cache-Control: no-store` (command in HANDOFF.md).
  Chrome silently served stale JS for several rounds and produced passing
  tests against code it had never loaded.

The 3D map was just redesigned and I'm happy with how it looks and behaves.
**Do not redesign it.** Three engineering problems are left.

---

## 1. Page weight — the priority

Measured on the current `index.html` (localhost, uncompressed):

- **15.54 MB total**, 56 requests
- **13.08 MB is images**; JS 1.06 MB, models 1.08 MB, wasm 0.27 MB
- First contentful paint **3.0 s**, DOMContentLoaded **9.5 s**, load **16.3 s**

Worst offenders — all in `images/`, all displayed in a panel column about
**300 px wide**:

| File | On disk | Actual pixels | Problem |
|---|---|---|---|
| `swot.webp` | **3032 KB** | 800×463 | 3 MB for a small image — almost certainly lossless/uncompressed WebP. Should be ~60 KB |
| `mit-iss.jpg` | 1796 KB | 1758×948 | ~6× the pixels ever displayed |
| `lunarlab2.png` | 1144 KB | 1482×1042 | PNG used for a photo |
| `hwo.png` | 776 KB | 1302×818 | PNG used for a photo |

Then ~5 MB of planet textures (`assets/textures/2k_*.jpg`, ~0.2–1.0 MB each)
used on the 3D globes.

**Suggested approach, cheapest first:**

1. **Re-encode `swot.webp`.** One file, ~3 MB → ~60 KB. Biggest single win in
   the codebase and it costs one command. Verify the visual result — check
   whether it was lossless for a reason (it isn't, but confirm).
2. **Resize the publication images to max ~900 px wide** (2× the ~300 px
   display width, enough for retina) and convert the PNGs to WebP or JPEG.
   Expect ~13 MB → ~1.5 MB. These are scientific figures — Gautier cares that
   they stay legible, and there's a click-to-enlarge lightbox in the Refined
   panel skin, so if you keep that, the enlarged view needs a readable source.
   Consider shipping a small thumbnail plus a full-size version fetched only
   when the lightbox opens.
3. **Lazy-load** anything below the fold (`loading="lazy"` on the `<img>`
   tags in the publications list).
4. **Planet textures**: most are shown small. Dropping non-hero bodies
   (Mercury, Mars, Jupiter, Neptune…) from 2k to 1k saves ~3 MB. Do this last
   and check it visually — Earth and the Sun are the ones you actually see up
   close, so leave those alone.

Do **not** compress by degrading the figures. Measure before and after with
the same method (`performance.getEntriesByType('resource')`, summed
`transferSize`) and report the real numbers.

## 2. Frame rate regression

Early builds measured **60 fps**; the final one measures **~34 fps** in a
clean tab. Nobody has profiled which addition dominates. Candidates, all
per-frame, all in `demo/`:

- `hover-info.js` — projects the hovered body and writes DOM every frame
- `reticles.js` — distance test per reticle per frame
- `camera.js` — follow tick
- `real-models.js` — LOD distance test
- `tour3.js` / `rover-tour.js` / `moon-view.js` — idle rAF watchers

Profile it properly (Chrome DevTools performance panel, or bisect by
commenting out script tags) **before** optimising. Note the browser
degradation trap above — a bad number may be the harness, not the code.

Known and already fixed, don't re-litigate: shadows were costing 25 of 41 fps
and are deliberately off (`demo/cinematic.js` explains why).

## 3. Deployment is unconfirmed

I pushed to `main` and assumed GitHub Pages serves from there. I could not
verify — the `gh` CLI token is invalid (`gh auth status` fails) and there's no
CI config in the repo.

**Ask me where the site is actually served from** (GitHub Pages off `main`?
off `gh-pages`? Netlify? Vercel?) before assuming the deploy worked. If it's
Pages, confirm the build succeeded and the live URL reflects commit `0dbeffa`.

---

## Ground rules

- Keep the `demo/*.js` overlay pattern. `js/app.js` has exactly one line
  changed in the whole redesign and it should stay that way where possible.
- Don't change how anything looks or behaves without asking. Every visual
  decision in there was reviewed and chosen deliberately.
- Verify with measurements and fresh command output, not by eye. Say plainly
  when something is unverified — I'd rather know.
- Work in small commits I can revert independently.

Start by reading `HANDOFF.md`, then confirm the deployment question with me
before touching anything.
