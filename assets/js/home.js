/* ============================================================
   HOME — index.html-only behavior.
   Requires assets/js/common.js to run first (uses window.reduceMotion).
   ============================================================ */

/* ============================================================
   CONFIG — single place to update monthly availability
   ============================================================ */
const AVAILABILITY = { spots: 2, month: "August" };
document.querySelectorAll('#availabilityText, #availabilityTextDark').forEach(el=>{
  el.textContent = `${AVAILABILITY.spots} project spot${AVAILABILITY.spots===1?'':'s'} left in ${AVAILABILITY.month}`;
});

/* ============================================================
   CAPABILITY GALLERY — duplicate cards for a seamless loop + auto-scrolling marquee
   ============================================================ */
const track = document.getElementById('galleryTrack');
(function duplicateGalleryCards(){
  const originals = Array.from(track.children);
  originals.forEach(card => track.appendChild(card.cloneNode(true)));
})();

(function marquee(){
  if(window.reduceMotion) return;
  let pos = 0;
  let speed = 1.5;
  function step(){
    pos -= speed;
    const half = track.scrollWidth / 2;
    if(Math.abs(pos) >= half) pos = 0;
    track.style.transform = `translateX(${pos}px)`;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

/* ============================================================
   PROCESS — scroll-linked progression (desktop), discrete
   locked stepper (mobile)
   ============================================================ */
(function process(){
  const section = document.getElementById('process');
  const inner = document.querySelector('.process-inner');
  const items = document.querySelectorAll('.process-item');
  const fill = document.getElementById('processFill');
  const stageNum = document.getElementById('processStageNum');
  const nums = ['01','02','03','04','05','06'];
  const lastStage = items.length - 1;

  /* Matches the 900px breakpoint in home.css where .process-list and
     .process-visual stop being sticky. Above it the section is given extra
     scroll height to drive the pinned animation; below it the list scrolls
     away normally, so that extra height would just be empty space. */
  const isDesktop = window.matchMedia('(min-width:901px)');

  function applyScrollHeight(){
    if(isDesktop.matches){
      section.style.minHeight = '220vh';
      inner.style.minHeight = '160vh';
    } else {
      section.style.minHeight = '';
      inner.style.minHeight = '';
    }
  }

  /* single place that ever writes the active step, shared by every
     interaction type (desktop scroll-scrub, mobile tap/swipe/wheel) */
  let stage = 0;
  function render(next, fillPct){
    stage = Math.min(lastStage, Math.max(0, next));
    fill.style.height = (fillPct != null ? fillPct : ((stage+1)/items.length*100)) + '%';
    items.forEach((item,i)=>{ item.classList.toggle('active', i === stage); });
    stageNum.textContent = nums[stage];
  }

  /* ---- desktop: pinned scroll-scrub, unchanged ---- */
  function updateDesktop(){
    const rect = section.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const scrolled = Math.min(Math.max(-rect.top, 0), total);
    const progress = total > 0 ? scrolled / total : 0;
    render(Math.min(lastStage, Math.floor(progress * items.length)), progress*100);
  }

  /* ---- mobile: locked transitions shared by both interaction types ----
     `step` (scroll/swipe) and `goTo` (tap) are the only two things that
     ever change the active step on mobile. Both share `locked`+`render`: a
     transition locks out further changes until it finishes, so rapid taps
     or a burst of touch/wheel events from one gesture can't produce more
     than one change or leave inconsistent state. The lock lasts as long as
     the existing .process-desc reveal transition (.4s, home.css) so it
     releases exactly when the step change finishes animating. */
  const MOBILE_LOCK_MS = 400;
  let locked = false;
  function lockFor(ms){
    locked = true;
    if(window.reduceMotion) locked = false;
    else setTimeout(()=>{ locked = false; }, ms);
  }
  /* scroll/swipe — sequential, relative to the current step only */
  function step(delta){
    if(locked) return;
    const next = stage + delta;
    if(next < 0 || next > lastStage) return;
    render(next);
    lockFor(MOBILE_LOCK_MS);
  }
  /* tap — direct jump to the requested step */
  function goTo(next){
    next = Math.min(lastStage, Math.max(0, next));
    if(locked || next === stage) return;
    render(next);
    lockFor(MOBILE_LOCK_MS);
  }

  window.addEventListener('scroll', ()=>{ if(isDesktop.matches) updateDesktop(); }, { passive:true });
  window.addEventListener('resize', ()=>{
    applyScrollHeight();
    if(isDesktop.matches) updateDesktop(); else render(stage);
  });
  isDesktop.addEventListener('change', ()=>{
    applyScrollHeight();
    if(isDesktop.matches) updateDesktop(); else render(stage);
  });
  applyScrollHeight();
  if(isDesktop.matches) updateDesktop();

  /* A. TAP — jumps straight to the tapped step (desktop keeps its original
     scroll-to-the-tapped-item behavior) */
  items.forEach(item=>{
    item.addEventListener('click', ()=>{
      const idx = parseInt(item.dataset.stage,10);
      if(isDesktop.matches){
        const rect = section.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const targetScroll = window.scrollY + rect.top + (total * (idx/items.length)) + 10;
        window.scrollTo({ top: targetScroll, behavior: window.reduceMotion ? 'auto' : 'smooth' });
      } else {
        goTo(idx);
      }
    });
  });

  /* C./D. SECTION SCROLL LOCK + EDGE RELEASE — mobile only. While the
     section substantially fills the viewport, wheel/touch input is
     intercepted (preventDefault) so the page can't scroll past it; the
     gesture's direction instead drives one `step()` call. At step 1
     (scrolling further back) or step 6 (scrolling further forward) the
     gesture is left alone so the native scroll carries the page to the
     previous/next section — re-entering afterwards re-engages the lock,
     so direction is always reversible. Geometry is recomputed from the
     live boundingClientRect on every event (not a cached/one-way scroll
     position), so it keeps working correctly no matter how often the
     user changes direction. */
  function sectionFillsViewport(){
    const rect = section.getBoundingClientRect();
    return rect.top <= 24 && rect.bottom >= window.innerHeight * 0.4;
  }

  /* B. SCROLL/SWIPE — touch */
  let touchStartY = 0;
  let touchMode = null;   // null = undecided, 'trap' | 'release' for this touch
  let touchFired = false;
  window.addEventListener('touchstart', e=>{
    if(isDesktop.matches) return;
    touchStartY = e.touches[0].clientY;
    touchMode = null;
    touchFired = false;
  }, { passive:true });
  window.addEventListener('touchmove', e=>{
    if(isDesktop.matches || touchMode === 'release') return;
    const y = e.touches[0].clientY;
    const dy = touchStartY - y; /* >0 = finger moved up = forward */
    if(touchMode === null){
      if(!sectionFillsViewport()){ touchMode = 'release'; return; }
      if(Math.abs(dy) < 10) return; /* not enough movement yet to decide */
      const forward = dy > 0;
      if((forward && stage === lastStage) || (!forward && stage === 0)){
        touchMode = 'release';
        return;
      }
      touchMode = 'trap';
    }
    e.preventDefault();
    if(!touchFired && Math.abs(dy) >= 24){
      touchFired = true;
      step(dy > 0 ? 1 : -1);
    }
  }, { passive:false });
  window.addEventListener('touchend', ()=>{
    touchMode = null;
    touchFired = false;
  }, { passive:true });

  /* B. SCROLL/SWIPE — wheel (trackpad/mouse) */
  window.addEventListener('wheel', e=>{
    if(isDesktop.matches || Math.abs(e.deltaY) < 4) return;
    if(!sectionFillsViewport()) return;
    const forward = e.deltaY > 0;
    if((forward && stage === lastStage) || (!forward && stage === 0)) return;
    e.preventDefault();
    step(forward ? 1 : -1);
  }, { passive:false });
})();

/* ============================================================
   FAQ ACCORDION
   ============================================================ */
document.querySelectorAll('.faq-q').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const item = btn.closest('.faq-item');
    const answer = item.querySelector('.faq-a');
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    // close others
    document.querySelectorAll('.faq-q').forEach(other=>{
      if(other !== btn){
        other.setAttribute('aria-expanded','false');
        other.closest('.faq-item').querySelector('.faq-a').style.maxHeight = null;
      }
    });
    btn.setAttribute('aria-expanded', String(!expanded));
    answer.style.maxHeight = expanded ? null : answer.scrollHeight + 'px';
  });
});

/* ============================================================
   LOCUS FIELD — points reorganizing around cursor
   ============================================================ */
(function field(){
  const canvas = document.getElementById('fieldCanvas');
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;
  let w,h,dpr;
  let points = [];
  let mouse = { x:-9999, y:-9999 };

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, 2);
    w = wrap.clientWidth; h = wrap.clientHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const cols = Math.floor(w/34), rows = Math.floor(h/34);
    points = [];
    for(let i=0;i<cols;i++){
      for(let j=0;j<rows;j++){
        const x = (i+0.5)*(w/cols);
        const y = (j+0.5)*(h/rows);
        points.push({ ox:x, oy:y, x, y });
      }
    }
  }
  resize();
  /* resizing the canvas wipes it, so the reduced-motion grid has to be repainted */
  window.addEventListener('resize', ()=>{ resize(); if(window.reduceMotion) drawStatic(); });
  let hovering = false;
  wrap.addEventListener('mousemove', e=>{
    const r = wrap.getBoundingClientRect();
    hovering = true;
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  wrap.addEventListener('mouseleave', ()=>{ hovering = false; mouse.x=-9999; mouse.y=-9999; });

  /* The sweep that used to be touch-only now drives every breakpoint: a
     virtual cursor moves through the same `mouse` the hover path writes to,
     so the draw logic is untouched. Hover still works — while the pointer is
     inside the frame it takes the wheel, and the sweep resumes on leave. It
     only runs while the frame is on screen. */
  let inView = false, autoT = 0;
  const fieldIO = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      inView = entry.isIntersecting;
      if(!inView){ mouse.x = -9999; mouse.y = -9999; }
    });
  }, { threshold:0.2 });
  fieldIO.observe(wrap);

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim();
  /* the frame reads dark now, so the resting dots are light on it */
  const dot = 'rgba(243,243,241,0.28)';

  function draw(){
    if(inView && !hovering){
      /* lissajous path — the two frequencies don't divide evenly, so the
         sphere keeps covering fresh ground instead of retracing one loop */
      autoT += 0.012;
      mouse.x = w * (0.5 + 0.34*Math.sin(autoT));
      mouse.y = h * (0.5 + 0.30*Math.sin(autoT*1.6));
    }
    ctx.clearRect(0,0,w,h);
    points.forEach(p=>{
      const dx = mouse.x - p.ox, dy = mouse.y - p.oy;
      const dist = Math.sqrt(dx*dx+dy*dy);
      const radius = 120;
      let tx = p.ox, ty = p.oy;
      if(dist < radius){
        const force = (1 - dist/radius);
        tx = p.ox - dx*force*0.5;
        ty = p.oy - dy*force*0.5;
      }
      p.x += (tx - p.x)*0.12;
      p.y += (ty - p.y)*0.12;
      const near = dist < radius;
      ctx.beginPath();
      ctx.arc(p.x, p.y, near ? 2.4 : 1.6, 0, Math.PI*2);
      ctx.fillStyle = near ? accent : dot;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  /* reduced motion: the grid is drawn once, at rest, and never animates */
  function drawStatic(){
    ctx.clearRect(0,0,w,h);
    points.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,1.6,0,Math.PI*2); ctx.fillStyle=dot; ctx.fill(); });
  }
  if(!window.reduceMotion) requestAnimationFrame(draw);
  else drawStatic();
})();

/* ============================================================
   CONTACT FORM — posts to /api/contact, which relays through
   Resend server-side. The form is only reset once the API
   confirms the send, so a failure leaves everything typed.
   ============================================================ */
(function contactForm(){
  const form   = document.getElementById('contactForm');
  const btn    = form.querySelector('button[type="submit"]');
  const errorEl = document.getElementById('contactError');
  const modal  = document.getElementById('enquiryModal');
  const idle   = btn.innerHTML;
  let sending  = false;
  let lastFocused = null;

  const FALLBACK_ERROR =
    'Something went wrong sending your enquiry. Please try again, or email hello@locusstudio.dev directly.';

  function showError(message){
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
  function clearError(){
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setSending(on){
    sending = on;
    btn.disabled = on;
    btn.setAttribute('aria-busy', String(on));
    if(on){
      btn.dataset.loading = 'true';
      btn.innerHTML = 'Sending<span class="btn-spinner" aria-hidden="true"></span>';
    } else {
      delete btn.dataset.loading;
      btn.innerHTML = idle;
    }
  }

  /* ---- Google Ads conversion ---- */
  /* Fires only on a confirmed send, once per submission. Each submit stamps
     an id, so repeat calls within one submission's success path are ignored
     while a genuinely separate second enquiry still reports. The id is
     recorded after the call, so a blocked/absent gtag leaves a later genuine
     success free to report instead of silently burning the conversion. */
  let submissionId = 0;
  let reportedId   = 0;
  function reportConversion(id){
    if(id === reportedId) return;
    if(typeof window.gtag !== 'function') return;
    window.gtag('event', 'conversion', {
      send_to: 'AW-18392097021/8DEICMCUsOIcEP3BhMJE'
    });
    reportedId = id;
  }

  /* ---- success modal ---- */
  function openModal(){
    lastFocused = document.activeElement;
    modal.hidden = false;
    /* next frame so the transition has a state to animate from */
    requestAnimationFrame(()=>{ modal.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    modal.querySelector('.enquiry-modal-dismiss').focus();
  }
  function closeModal(){
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    const finish = ()=>{ modal.hidden = true; };
    if(window.reduceMotion) finish();
    else setTimeout(finish, 300); /* matches --dur-sm */
    if(lastFocused) lastFocused.focus();
  }
  modal.addEventListener('click', (e)=>{
    if(e.target.closest('[data-close-modal]')) closeModal();
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && !modal.hidden) closeModal();
  });

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if(sending) return;

    const thisSubmission = ++submissionId;

    clearError();
    setSending(true);

    const payload = {
      name:    document.getElementById('cf-name').value,
      email:   document.getElementById('cf-email').value,
      company: document.getElementById('cf-company').value,
      website: document.getElementById('cf-website').value,
      need:    document.getElementById('cf-need').value,
      budget:  document.getElementById('cf-budget').value,
      project: document.getElementById('cf-project').value
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(()=>({}));

      if(!response.ok || !data.ok){
        showError(data.error || FALLBACK_ERROR);
        setSending(false);
        return;
      }

      /* confirmed sent — only now is it safe to clear what they typed */
      form.reset();
      setSending(false);
      reportConversion(thisSubmission);
      openModal();
    } catch {
      showError(FALLBACK_ERROR);
      setSending(false);
    }
  });
})();
