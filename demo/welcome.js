/* WELCOME — a short card that greets every visit, then points at the help.
 *
 * The page used to open with the "How to explore" legend already spread
 * over the map, which read as a wall of instructions before anything else.
 * Now a centred card says who this is and how the page works in three
 * lines, over a dimmed page, and goes away on the first click, Escape, or
 * its own buttons. Once it is gone, the "How to explore" button pulses
 * until it is used, or until a project is opened (the visitor has found
 * their way by then).
 *
 * Not shown on a ?p= deep link: that link was shared to show one project.
 *
 * Loaded BEFORE the 3D scripts, so the card is on screen within a few
 * hundred ms and the scene (textures, shaders, models: ~3-4 s of work)
 * loads behind it while the visitor reads. Anything a button needs from
 * those later scripts waits for the window load event.
 */
(function () {
  const mobile = document.documentElement.classList.contains('mobile-device');
  const deepLink = new URLSearchParams(location.search).has('p');
  const detail = document.getElementById('detailView');
  // run now if every script has loaded, else as soon as they have
  const whenLoaded = fn => document.readyState === 'complete'
    ? fn() : addEventListener('load', () => fn(), { once: true });
  // desktop's help button is tour3.js's, the phone's is mobile.js's
  const helpBtn = () => document.querySelector(mobile ? '.m-help' : '.t3-replay');

  // ---- the pulse on the help button ---------------------------------------
  function attention() {
    const b = helpBtn();
    if (!b || (detail && detail.classList.contains('active'))) return;
    b.classList.add('attn');
    const stop = () => b.classList.remove('attn');
    b.addEventListener('click', stop, { once: true });
    // the desktop toolbar blinks too, until "How to explore" or one of its
    // tools is clicked (a click on the bar's background does not count)
    const bar = !mobile && document.querySelector('.controls');
    if (bar) {
      bar.classList.add('attn');
      const quiet = () => bar.classList.remove('attn');
      b.addEventListener('click', quiet, { once: true });
      bar.addEventListener('click', e => { if (e.target.closest('button')) quiet(); });
    }
    b.addEventListener('touchend', stop, { once: true, passive: true });
    if (detail) {
      new MutationObserver((_, obs) => {
        if (detail.classList.contains('active')) { stop(); obs.disconnect(); }
      }).observe(detail, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (deepLink) { whenLoaded(attention); return; }

  // ---- the card -------------------------------------------------------------
  const where = mobile ? 'below' : 'on the right';
  const back = document.createElement('div');
  back.className = 'wel-backdrop';
  back.innerHTML = `
    <div class="wel-card" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="welTitle">
      <button type="button" class="wel-x" aria-label="Close">&#215;</button>
      <div class="wel-head">
        <img class="wel-photo" src="images/headshot.jpg" width="84" height="84" alt="Gautier Bardi de Fourtou">
        <div>
          <h2 id="welTitle">Hi, I'm Gautier. Welcome to my portfolio!</h2>
          <div class="wel-sub">PhD student · MIT AeroAstro</div>
        </div>
      </div>
      <p>I'm a PhD student at MIT AeroAstro, fortunate to be advised by
         <a href="https://aeroastro.mit.edu/people/dava-j-newman/" target="_blank" rel="noopener">Dr. Dava Newman</a>
         and
         <a href="https://aeroastro.mit.edu/people/daniel-varon/" target="_blank" rel="noopener">Dr. Daniel Varon</a>.
         My research focuses on where artificial intelligence meets space
         exploration, from Earth observation to autonomy for planetary
         exploration. Along the way I've worked on projects at NASA JPL, ESA's
         European Astronaut Centre and Frontier Development Lab.</p>
      <p>This little solar system is my portfolio. Every planet or spacecraft
         framed by yellow corners <span class="ret" aria-hidden="true"></span>,
         like the Sun, Earth, the ISS or Mars, holds one of my projects: click
         it to fly there and read the story, or browse the list ${where}.</p>
      <p class="wel-tease">Take your time to explore and discover different
         worlds. Maybe land on the Moon and figure out how to drive a rover to
         collect Moon rock samples.</p>
      <div class="wel-actions">
        <button type="button" class="wel-go">Start exploring</button>
        <button type="button" data-act="about">About me</button>
        <button type="button" data-act="help">How to explore</button>
        <a href="https://gautier242.github.io/portfolio/" target="_blank" rel="noopener">Classic portfolio</a>
      </div>
    </div>`;
  document.body.appendChild(back);
  const card = back.querySelector('.wel-card');
  requestAnimationFrame(() => back.classList.add('on'));
  const go = back.querySelector('.wel-go');
  try { card.focus({ preventScroll: true }); } catch (_) {}

  let done = false;
  function close(then) {
    if (done) return;
    done = true;
    back.classList.remove('on');
    removeEventListener('keydown', onKey, true);
    setTimeout(() => back.remove(), 350);
    whenLoaded(then || attention);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  addEventListener('keydown', onKey, true);

  // a click on the dimmed page closes it; inside the card only the buttons do
  back.addEventListener('click', e => { if (!card.contains(e.target)) close(); });
  back.querySelector('.wel-x').addEventListener('click', () => close());
  go.addEventListener('click', () => close());
  back.querySelector('[data-act="about"]').addEventListener('click', () => close(() => {
    if (typeof showAbout === 'function') showAbout();
  }));
  back.querySelector('[data-act="help"]').addEventListener('click', () => close(() => {
    const b = helpBtn();
    if (b) b.click();
  }));
  back.querySelector('.wel-actions a').addEventListener('click', () => close());
})();
