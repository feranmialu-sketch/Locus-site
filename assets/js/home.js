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

  /* ---- mobile: discrete, locked, one-step-per-gesture ----
     Tap, swipe and wheel all funnel through this one function. It moves
     at most one step per call, always relative to the current step (never
     to wherever a fast/long gesture's raw position would land), and while
     `locked` is true any further calls are dropped rather than queued. The
     lock lasts as long as the existing .process-desc reveal transition
     (.4s, home.css) so it releases exactly when the step change finishes
     animating — that's what stops a fling or a burst of touch/wheel events
     from one gesture racking up more than one transition. */
  const MOBILE_LOCK_MS = 400;
  let locked = false;
  function step(delta){
    if(locked) return;
    const next = stage + delta;
    if(next < 0 || next > lastStage) return;
    locked = true;
    render(next);
    if(window.reduceMotion) locked = false;
    else setTimeout(()=>{ locked = false; }, MOBILE_LOCK_MS);
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

  /* tap — direction relative to the current step only, so tapping a distant
     step still ever advances a single step at a time (desktop keeps its
     original scroll-to-the-tapped-item behavior) */
  items.forEach(item=>{
    item.addEventListener('click', ()=>{
      if(isDesktop.matches){
        const idx = parseInt(item.dataset.stage,10);
        const rect = section.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const targetScroll = window.scrollY + rect.top + (total * (idx/items.length)) + 10;
        window.scrollTo({ top: targetScroll, behavior: window.reduceMotion ? 'auto' : 'smooth' });
      } else {
        const idx = parseInt(item.dataset.stage,10);
        if(idx > stage) step(1);
        else if(idx < stage) step(-1);
      }
    });
  });

  /* swipe + wheel — mobile only, scoped to the process block so they never
     hijack scrolling/wheel elsewhere on the page. Only direction is read;
     distance, speed and momentum never change how many steps are taken. */
  let touchStartY = null;
  inner.addEventListener('touchstart', e=>{
    if(isDesktop.matches) return;
    touchStartY = e.touches[0].clientY;
  }, { passive:true });
  inner.addEventListener('touchend', e=>{
    if(isDesktop.matches || touchStartY === null) return;
    const dy = touchStartY - e.changedTouches[0].clientY;
    touchStartY = null;
    if(Math.abs(dy) < 24) return;
    step(dy > 0 ? 1 : -1);
  }, { passive:true });
  inner.addEventListener('wheel', e=>{
    if(isDesktop.matches || Math.abs(e.deltaY) < 4) return;
    step(e.deltaY > 0 ? 1 : -1);
  }, { passive:true });
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
      openModal();
    } catch {
      showError(FALLBACK_ERROR);
      setSending(false);
    }
  });
})();
