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
   PROCESS — scroll-linked progression
   ============================================================ */
(function process(){
  const section = document.getElementById('process');
  const inner = document.querySelector('.process-inner');
  const list = document.getElementById('processList');
  const items = document.querySelectorAll('.process-item');
  const fill = document.getElementById('processFill');
  const stageNum = document.getElementById('processStageNum');
  const nums = ['01','02','03','04','05','06'];

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

  function update(){
    let progress;
    if(isDesktop.matches){
      /* pinned: progress is the section's own scroll span */
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      progress = total > 0 ? scrolled / total : 0;
    } else {
      /* not pinned: drive the stages off the list's travel past the
         viewport centre, so the active step is the one you're looking at
         instead of one keyed to a scroll span the list has already left. */
      const rect = list.getBoundingClientRect();
      progress = rect.height > 0
        ? (window.innerHeight * 0.5 - rect.top) / rect.height
        : 0;
      progress = Math.min(Math.max(progress, 0), 1);
    }
    fill.style.height = (progress*100) + '%';

    const stage = Math.min(items.length - 1, Math.floor(progress * items.length));
    items.forEach((item,i)=>{
      item.classList.toggle('active', i === stage);
    });
    stageNum.textContent = nums[stage];
  }
  window.addEventListener('scroll', update, { passive:true });
  window.addEventListener('resize', ()=>{ applyScrollHeight(); update(); });
  isDesktop.addEventListener('change', ()=>{ applyScrollHeight(); update(); });
  applyScrollHeight();
  update();

  items.forEach(item=>{
    item.addEventListener('click', ()=>{
      const idx = parseInt(item.dataset.stage,10);
      let targetScroll;
      if(isDesktop.matches){
        const rect = section.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        targetScroll = window.scrollY + rect.top + (total * (idx/items.length)) + 10;
      } else {
        /* no scroll span to map onto — bring the item itself into view */
        targetScroll = window.scrollY + item.getBoundingClientRect().top - (window.innerHeight * 0.4);
      }
      window.scrollTo({ top: targetScroll, behavior: window.reduceMotion ? 'auto' : 'smooth' });
    });
  });
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
   CONTACT FORM — lightweight confirmation (no backend wired)
   ============================================================ */
document.getElementById('contactForm').addEventListener('submit', function(){
  const btn = this.querySelector('button[type="submit"]');
  const original = btn.innerHTML;
  btn.innerHTML = 'Enquiry sent';
  btn.style.opacity = '0.8';
  setTimeout(()=>{ btn.innerHTML = original; btn.style.opacity = '1'; this.reset(); }, 2200);
});
