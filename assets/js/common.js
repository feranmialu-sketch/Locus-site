/* ============================================================
   COMMON — shared by every page: scroll-reveal + nav shadow.
   Exposes window.reduceMotion for page-specific scripts.
   ============================================================ */

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

/* nav — subtle scroll shadow */
const navShell = document.querySelector('.nav-shell');
window.addEventListener('scroll', ()=>{
  if(window.scrollY > 20){ navShell.style.boxShadow = '0 12px 34px rgba(11,12,13,0.08)'; }
  else{ navShell.style.boxShadow = '0 8px 30px rgba(11,12,13,0.04)'; }
}, { passive:true });
