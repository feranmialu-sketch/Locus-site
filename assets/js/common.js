/* ============================================================
   COMMON — shared by every page: scroll-reveal + nav shadow.
   Exposes window.reduceMotion for page-specific scripts.
   ============================================================ */

/* ============================================================
   VERCEL WEB ANALYTICS — this file is loaded by every page, so
   initialising here covers the homepage and all case studies in
   one place.

   This is what @vercel/analytics' inject() does: append Vercel's
   first-party insights script. The npm package expects a bundler
   to resolve its import, and this site is served as plain HTML
   with no build step, so the script is appended directly instead.

   The endpoint is same-origin and only exists on Vercel, so it is
   a harmless 404 when the site is opened locally. Loaded deferred
   and appended at runtime, it cannot block rendering or affect
   anything else on the page.
   ============================================================ */
(function vercelAnalytics(){
  const script = document.createElement('script');
  script.src = '/_vercel/insights/script.js';
  script.defer = true;
  document.head.appendChild(script);
})();

window.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Reveal threshold differs slightly between the homepage (0.15)
   and the case study pages (0.12); set via a data attribute on
   <body> (see case-study pages) so this file stays shared. */
const revealThreshold = document.body.dataset.revealThreshold
  ? parseFloat(document.body.dataset.revealThreshold)
  : 0.15;

const revealEls = document.querySelectorAll('.reveal');
if(window.reduceMotion){
  revealEls.forEach(el=>el.classList.add('is-visible'));
} else {
  const groups = new Map();
  revealEls.forEach(el=>{
    const parent = el.closest('section') || document.body;
    if(!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(el);
  });
  groups.forEach(list=>{
    list.forEach((el,i)=>{ el.style.transitionDelay = Math.min(i*90,360) + 'ms'; });
  });
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold:revealThreshold, rootMargin:'0px 0px -60px 0px' });
  revealEls.forEach(el=>io.observe(el));
}

/* mobile nav dropdown — only present on pages that ship the markup,
   so this is a no-op elsewhere. CSS hides the panel above 860px, which
   also means resizing to desktop while open needs no handling here. */
const navToggle = document.getElementById('navToggle');
const navMobileMenu = document.getElementById('navMobileMenu');
if(navToggle && navMobileMenu){
  const setNavOpen = (open)=>{
    navMobileMenu.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  navToggle.addEventListener('click', ()=>{
    setNavOpen(!navMobileMenu.classList.contains('is-open'));
  });
  navMobileMenu.addEventListener('click', (e)=>{
    if(e.target.closest('a')) setNavOpen(false);
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') setNavOpen(false);
  });
}

/* ============================================================
   CLEAN URLS — the browser has already used the #hash to jump/
   smooth-scroll to the target section by the time this runs; this
   just tidies the address bar afterward via the History API, so
   the click/scroll behavior itself is untouched.
   ============================================================ */
if(location.hash){
  window.addEventListener('load', ()=>{
    history.replaceState(null, '', location.pathname + location.search);
  });
}
window.addEventListener('hashchange', ()=>{
  history.replaceState(null, '', location.pathname + location.search);
});

/* nav — subtle scroll shadow */
const navShell = document.querySelector('.nav-shell');
window.addEventListener('scroll', ()=>{
  if(window.scrollY > 20){ navShell.style.boxShadow = '0 12px 34px rgba(11,12,13,0.08)'; }
  else{ navShell.style.boxShadow = '0 8px 30px rgba(11,12,13,0.04)'; }
}, { passive:true });

/* ============================================================
   CONTENT PROTECTION — loaded on every page via common.js, so the
   behaviour is defined once rather than pasted into each file.
   Styles live in the matching section at the end of base.css.

   Scope note: this deters casual copying. It cannot stop anyone
   determined — view-source, disabling JS and curl all bypass it.

   Nothing here calls preventDefault on scroll, click, submit or
   input, so navigation, the contact form and every button behave
   exactly as before.
   ============================================================ */
(function contentProtection(){
  const MESSAGE     = '⚠ Content protected © Locus. Duplication is not allowed.';
  const VISIBLE_MS  = 1900;
  /* one user action fires a burst of events (a right-click can raise
     both selectstart and contextmenu). Swallow the burst so a single
     action can only ever produce a single toast. */
  const COOLDOWN_MS = 600;

  const FORM_CONTROLS = 'input, textarea, select, option, [contenteditable="true"]';
  const isFormControl = (node) =>
    !!(node && node.closest && node.closest(FORM_CONTROLS));

  let toast = null, hideTimer = null, lastShown = 0;

  function notify(){
    const now = Date.now();
    if(now - lastShown < COOLDOWN_MS) return;
    lastShown = now;

    if(!toast){
      toast = document.createElement('div');
      toast.className = 'protect-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.textContent = MESSAGE;
      document.body.appendChild(toast);
      void toast.offsetWidth; /* reflow so the first show still transitions */
    }

    toast.classList.add('is-visible');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(()=>{ toast.classList.remove('is-visible'); }, VISIBLE_MS);
  }

  /* block + tell them why, unless they're working in a form field */
  function block(e){
    if(isFormControl(e.target)) return;
    e.preventDefault();
    notify();
  }

  ['contextmenu', 'copy', 'cut', 'paste', 'dragstart'].forEach(type=>{
    document.addEventListener(type, block);
  });

  /* Selection is already off via CSS; this is the fallback for browsers
     that ignore user-select. Silent on purpose — selectstart fires
     repeatedly while a pointer drags, and toasting on each would be the
     "annoying" case. The toast comes from the copy attempt instead. */
  document.addEventListener('selectstart', (e)=>{
    if(isFormControl(e.target)) return;
    e.preventDefault();
  });

  document.addEventListener('keydown', (e)=>{
    const key = (e.key || '').toLowerCase();
    const ctrlLike = e.ctrlKey || e.metaKey;      /* metaKey covers macOS */
    const withMod  = e.shiftKey || e.altKey;      /* altKey covers Cmd+Opt+I */

    /* inspection — blocked everywhere, a form field included */
    const isInspect =
      key === 'f12' ||
      (ctrlLike && withMod && (key === 'i' || key === 'j' || key === 'c')) ||
      (ctrlLike && !withMod && key === 'u');

    if(isInspect){
      e.preventDefault();
      notify();
      return;
    }

    /* clipboard / save / select-all — blocked only OUTSIDE form controls.
       Inside one these are ordinary editing: pasting an email address into
       the contact form, selecting a field to retype it, and so on. */
    const isContentKey =
      ctrlLike && !withMod && ['s', 'a', 'c', 'x', 'v'].indexOf(key) !== -1;

    if(isContentKey && !isFormControl(e.target)){
      e.preventDefault();
      notify();
    }
  });

  /* DevTools detection — viewport-gap heuristic, which is the lightweight
     client-side option. It catches a docked panel (the common case). It
     cannot see an undocked window, and heavy browser zoom can trip it, so
     it is deliberately consequence-free: a false positive shows the toast
     and nothing else. Fires only on the closed -> open edge, never looping. */
  let devtoolsOpen = false;
  setInterval(()=>{
    const gapW = window.outerWidth  - window.innerWidth;
    const gapH = window.outerHeight - window.innerHeight;
    const open = gapW > 160 || gapH > 200;   /* normal browser chrome sits under both */
    if(open && !devtoolsOpen) notify();
    devtoolsOpen = open;
  }, 1200);
})();
