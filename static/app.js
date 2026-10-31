const $=(s)=>document.querySelector(s);
$('#year').textContent=new Date().getFullYear();

const menu=$('.menu-toggle');
if(menu) menu.addEventListener('click',()=> $('nav').classList.toggle('open'));
document.querySelectorAll('.nav nav a').forEach(a=>a.addEventListener('click',()=>$('nav').classList.remove('open')));

// Reveal Observer & Fail-safe: Make all reveals visible automatically
function initReveals(){
  document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded',initReveals); }
else { initReveals(); }

// Interactive layered hero: mouse movement tilts the scene, drag rotates it; touch-friendly.
const stage=$('#heroStage');
if(stage){
  let dragging=false,startX=0,startY=0,rotX=0,rotY=0;
  function setTilt(x,y){stage.style.transform=`rotateX(${x}deg) rotateY(${y}deg)`}
  stage.addEventListener('pointerdown',e=>{dragging=true;startX=e.clientX-rotY*4;startY=e.clientY-rotX*4;stage.setPointerCapture(e.pointerId)});
  stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect();if(dragging){rotY=Math.max(-13,Math.min(13,(e.clientX-startX)/4));rotX=Math.max(-8,Math.min(8,-(e.clientY-startY)/5));setTilt(rotX,rotY)}else if(e.pointerType==='mouse'){rotY=((e.clientX-r.left)/r.width-.5)*7;rotX=-((e.clientY-r.top)/r.height-.5)*5;setTilt(rotX,rotY)}});
  ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>stage.addEventListener(ev,()=>dragging=false));
  stage.addEventListener('pointerleave',()=>{if(!dragging){rotX=0;rotY=0;setTilt(0,0)}});
}

// Project cards horizontal navigation
const track=$('#projectTrack');
let projectIndex=0;
function slide(dir){
  if(!track) return;
  const cards=[...track.children];
  if(!cards.length) return;
  const visible=window.innerWidth<=650?1:window.innerWidth<=1000?2:3;
  projectIndex=Math.max(0,Math.min(cards.length-visible,projectIndex+dir));
  const gap=21;
  const cardWidth = cards[0].getBoundingClientRect().width || 300;
  track.style.transform=`translateX(-${projectIndex*(cardWidth+gap)}px)`;
}

const pNext = $('#projectNext');
const pPrev = $('#projectPrev');
if(pNext) pNext.addEventListener('click',()=>slide(1));
if(pPrev) pPrev.addEventListener('click',()=>slide(-1));
window.addEventListener('resize',()=>{projectIndex=0;if(track) track.style.transform='translateX(0)';});

function bindProjectCardHover(){
  document.querySelectorAll('.project-card').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty('--mx',`${(e.clientX-r.left)/r.width*100}%`);
      card.style.setProperty('--my',`${(e.clientY-r.top)/r.height*100}%`);
    });
    card.addEventListener('mouseleave',()=>{
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    });
  });
}

const DEFAULT_PROJECTS = [
  { id: 1, title: 'Luxe Atelier', category: 'E-COMMERCE CONCEPT', type_badge: '01 / E-COMMERCE CONCEPT', visual_theme: 'project-fashion', link_url: '#contact', description: 'Luxury e-commerce experience built for high-end boutique brands.', is_active: 1 },
  { id: 2, title: 'NovaTech Solutions', category: 'BUSINESS WEBSITE CONCEPT', type_badge: '02 / BUSINESS WEBSITE CONCEPT', visual_theme: 'project-tech', link_url: '#contact', description: 'Modern corporate platform engineered for tech and AI startups.', is_active: 1 },
  { id: 3, title: 'Studio Forma', category: 'CREATIVE PORTFOLIO CONCEPT', type_badge: '03 / CREATIVE PORTFOLIO CONCEPT', visual_theme: 'project-artist', link_url: '#contact', description: 'Immersive design portfolio with motion aesthetics and editorial layouts.', is_active: 1 },
  { id: 4, title: 'FitLife Platform', category: 'WELLNESS CONCEPT', type_badge: '04 / WELLNESS CONCEPT', visual_theme: 'project-wellness', link_url: '#contact', description: 'Mobile-first wellness app landing page and subscription portal.', is_active: 1 },
  { id: 5, title: 'Northline Estates', category: 'REAL ESTATE CONCEPT', type_badge: '05 / REAL ESTATE CONCEPT', visual_theme: 'project-property', link_url: '#contact', description: 'High-impact real estate showcase with interactive floorplans.', is_active: 1 }
];

async function api(url,options={}){
  let res;
  try {
    res=await fetch(url,{headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  } catch(e) {}

  if(!res || res.status===404 || res.status===502){
    try {
      if(url.includes('/api/site-settings')){
        const v = localStorage.getItem('zenvex_settings');
        return v ? JSON.parse(v) : null;
      }
      if(url.includes('/api/projects')){
        const v = localStorage.getItem('zenvex_projects');
        const list = v ? JSON.parse(v) : DEFAULT_PROJECTS;
        return list.filter(p=>p.is_active);
      }
      if(url.includes('/api/offers')){
        const v = localStorage.getItem('zenvex_offers');
        return v ? JSON.parse(v).filter(o=>o.is_active) : [];
      }
      if(url.includes('/api/reviews')){
        const v = localStorage.getItem('zenvex_reviews');
        return v ? JSON.parse(v) : [];
      }
    } catch(e) {}
  }

  let data={};
  try{data=await res.json();}catch{}
  if(!res || !res.ok)throw new Error(data.error||'Something went wrong. Please try again.');
  return data;
}

const contactForm = $('#contactForm');
if(contactForm){
  contactForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=e.currentTarget.querySelector('button');
    const status=$('#contactStatus');
    btn.disabled=true;
    status.textContent='Sending your inquiry…';
    try{
      const data=await api('/api/contact',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});
      status.textContent=data.message;
      e.currentTarget.reset();
    }catch(err){
      status.textContent=err.message+' You can also contact us directly on WhatsApp.';
    }finally{
      btn.disabled=false;
    }
  });
}

const dialog=$('#reviewDialog');
const openReviewBtn=$('#openReview');
const closeReviewBtn=$('#closeReview');
const reviewForm=$('#reviewForm');

if(openReviewBtn && dialog) openReviewBtn.addEventListener('click',()=>dialog.showModal());
if(closeReviewBtn && dialog) closeReviewBtn.addEventListener('click',()=>dialog.close());

if(reviewForm){
  reviewForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const status=$('#reviewStatus');
    const btn=e.currentTarget.querySelector('button[type="submit"]');
    btn.disabled=true;
    status.textContent='Submitting review…';
    try{
      const data=await api('/api/reviews',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});
      status.textContent=data.message;
      e.currentTarget.reset();
    }catch(err){
      status.textContent=err.message;
    }finally{
      btn.disabled=false;
    }
  });
}

function initials(name){return (name||'?').split(/\s+/).slice(0,2).map(s=>s[0]||'').join('').toUpperCase()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function loadReviews(){
  try{
    const reviews=await api('/api/reviews');
    if(!reviews.length) return;
    const reviewList = $('#reviewList');
    if(reviewList){
      reviewList.innerHTML=reviews.map(r=>`<article class="review-card"><div class="stars" aria-label="${r.rating} out of 5 stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div><blockquote>“${esc(r.message)}”</blockquote><div class="review-author"><div class="avatar">${esc(initials(r.name))}</div><div><b>${esc(r.name)}</b><small>${esc(r.company||'ZENVEX client')}</small></div></div></article>`).join('');
    }
  }catch(e){
    console.info('Reviews will load when backend is running.');
  }
}

// Active Stats Counter & Interactive Plus/Minus Controller
function runStatCounter(card, customTarget=null){
  const counterEl=card.querySelector('.counter');
  const barEl=card.querySelector('.stat-bar-fill');
  const target=customTarget !== null ? customTarget : parseFloat(card.getAttribute('data-target')||'0');
  const barPercent=card.getAttribute('data-bar')||'100';
  const decimals=parseInt(card.getAttribute('data-decimals')||'0',10);
  const startTime=performance.now();
  const duration=1200;
  
  card.setAttribute('data-target', target.toString());
  if(barEl){ barEl.style.width=Math.min(100, Math.max(10, barPercent))+'%'; }
  
  function update(now){
    const elapsed=now-startTime;
    const progress=Math.min(elapsed/duration,1);
    const easeOut=1-Math.pow(1-progress,3);
    const current=target*easeOut;
    if(counterEl) counterEl.textContent=current.toFixed(decimals);
    if(progress<1){requestAnimationFrame(update)}
    else if(counterEl){counterEl.textContent=target.toFixed(decimals)}
  }
  requestAnimationFrame(update);
}

function initActiveStats(){
  const cards=document.querySelectorAll('.stat-card');
  if(!cards.length)return;

  cards.forEach(card=>{
    runStatCounter(card);
    
    const plusBtn=card.querySelector('.stat-plus');
    const minusBtn=card.querySelector('.stat-minus');
    const decimals=parseInt(card.getAttribute('data-decimals')||'0',10);
    const step=decimals > 0 ? 0.1 : 1;

    if(plusBtn){
      plusBtn.addEventListener('click',(e)=>{
        e.stopPropagation();
        let val=parseFloat(card.getAttribute('data-target')||'0') + step;
        runStatCounter(card, val);
      });
    }

    if(minusBtn){
      minusBtn.addEventListener('click',(e)=>{
        e.stopPropagation();
        let val=Math.max(0, parseFloat(card.getAttribute('data-target')||'0') - step);
        runStatCounter(card, val);
      });
    }

    card.addEventListener('click',()=>runStatCounter(card));
  });

  const filterBtns=document.querySelectorAll('.stat-filter-btn');
  filterBtns.forEach(btn=>{
    btn.addEventListener('click',()=>{
      filterBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const cat=btn.getAttribute('data-category');
      cards.forEach(card=>{
        const cardCat=card.getAttribute('data-category');
        if(cat==='all'||cat===cardCat){
          card.style.display='block';
          card.classList.add('active');
          runStatCounter(card);
        } else {
          card.style.display='none';
          card.classList.remove('active');
        }
      });
    });
  });

  const pingEl=document.getElementById('livePing');
  if(pingEl){
    setInterval(()=>{
      const ms=Math.floor(12 + Math.random()*6);
      pingEl.textContent=ms+' ms';
    },2500);
  }
}

// DYNAMIC CMS DATA LOADERS

async function loadSiteSettings(){
  try{
    const settings = await api('/api/site-settings');
    if(!settings) return;

    if(settings.hero_h1){
      const h1El = $('.hero h1');
      if(h1El) h1El.innerHTML = settings.hero_h1.replace(/\n/g, '<br>');
    }
    if(settings.hero_lede){
      const ledeEl = $('.hero-lede');
      if(ledeEl) ledeEl.textContent = settings.hero_lede;
    }

    const statMap = {
      satisfaction: settings.stat_satisfaction,
      delivered: settings.stat_delivered,
      roi: settings.stat_roi,
      global: settings.stat_global
    };

    Object.keys(statMap).forEach(cat => {
      const val = statMap[cat];
      if(val !== undefined && val !== null && val !== ''){
        const card = document.querySelector(`.stat-card[data-category="${cat}"]`);
        if(card){
          card.setAttribute('data-target', val.toString());
          runStatCounter(card, parseFloat(val));
        }
      }
    });

    if(settings.phone_number){
      const phoneEls = document.querySelectorAll('a[href^="tel:"]');
      phoneEls.forEach(el => {
        el.href = `tel:${settings.phone_number.replace(/\s+/g,'')}`;
        const b = el.querySelector('b');
        if(b) b.textContent = settings.phone_number;
      });
    }

    if(settings.email_address){
      const emailEls = document.querySelectorAll('a[href^="mailto:"]');
      emailEls.forEach(el => {
        el.href = `mailto:${settings.email_address}`;
        const b = el.querySelector('b');
        if(b) b.textContent = settings.email_address;
      });
    }

    if(settings.whatsapp_link){
      const waEls = document.querySelectorAll('a[href*="wa.me"]');
      waEls.forEach(el => {
        el.href = settings.whatsapp_link;
      });
    }

    if(settings.google_site_verification){
      const meta = document.getElementById('googleSearchConsoleMeta');
      if(meta) meta.content = settings.google_site_verification;
    }
  }catch(e){
    console.info('Site settings load error', e);
  }
}

async function loadOffers(){
  try{
    const offers = await api('/api/offers');
    const container = $('#offersBannerContainer');
    if(!container) return;

    if(!offers || !offers.length){
      container.innerHTML = '';
      return;
    }

    const activeOffer = offers[0];
    container.innerHTML = `
      <div class="offer-banner-section">
        <div class="offer-banner-content">
          <span class="offer-badge">${esc(activeOffer.highlight_badge || 'PROMO')}</span>
          <div>
            <b>${esc(activeOffer.title)} ${activeOffer.discount_tag ? `<span style="background:#668fe9;color:#fff;padding:2px 8px;border-radius:12px;font-size:10px;margin-left:6px;">${esc(activeOffer.discount_tag)}</span>` : ''}</b>
            <p>${esc(activeOffer.description)}</p>
          </div>
        </div>
        <a class="offer-btn" href="${esc(activeOffer.cta_link || '#contact')}" target="_blank" rel="noreferrer">${esc(activeOffer.cta_text || 'Claim Offer ↗')}</a>
      </div>
    `;
  }catch(e){
    console.info('Offers load error', e);
  }
}

function renderProjectVisual(p){
  if(p && p.image_url){
    return `<div class="project-visual" style="padding:0;background:#17212b;"><img src="${esc(p.image_url)}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover;display:block;"><span class="project-open">↗</span></div>`;
  }
  const theme = p ? p.visual_theme : '';
  const title = p ? p.title : '';
  if(theme === 'project-fashion'){
    return `<div class="project-visual"><div class="visual-orb"></div><div class="fashion-bag">${esc(title.split(' ')[0] || 'LUXE')}</div><span class="project-open">↗</span></div>`;
  } else if(theme === 'project-tech'){
    return `<div class="project-visual"><div class="tech-window"><span>${esc(title)}</span><b>Digital<br>Innovation.</b><i></i></div><span class="project-open">↗</span></div>`;
  } else if(theme === 'project-artist'){
    return `<div class="project-visual"><div class="art-poster"><small>SELECTED WORKS</small><b>${esc(title.toUpperCase())}</b><span>PORTFOLIO CONCEPT</span></div><span class="project-open">↗</span></div>`;
  } else if(theme === 'project-wellness'){
    return `<div class="project-visual"><div class="wellness-phone"><div class="phone-dot"></div><b>${esc(title.split(' ')[0])}</b><span>Move with purpose.</span></div><span class="project-open">↗</span></div>`;
  } else if(theme === 'project-property'){
    return `<div class="project-visual"><div class="building"><i></i><i></i><i></i><i></i><i></i><i></i></div><span class="project-open">↗</span></div>`;
  } else {
    return `<div class="project-visual" style="background:linear-gradient(135deg,#17212b,#3a526e);color:#fff;"><div style="text-align:center;padding:20px;"><span style="font-size:10px;letter-spacing:0.2em;color:#668fe9;display:block;margin-bottom:8px;">CONCEPT PROJECT</span><b style="font-size:22px;font-family:Manrope;">${esc(title)}</b></div><span class="project-open">↗</span></div>`;
  }
}

async function loadProjects(){
  try{
    const projects = await api('/api/projects');
    if(!track) return;
    if(!projects || !projects.length){
      track.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);width:100%;font-size:14px;">No active portfolio projects currently available.</div>';
      return;
    }

    track.innerHTML = projects.map((p, idx) => `
      <article class="project-card ${esc(p.visual_theme || 'project-tech')}" tabindex="0" onclick="window.location.href='${esc(p.link_url || '#contact')}'">
        ${renderProjectVisual(p)}
        <div class="project-meta">
          <div>
            <small>${esc(p.type_badge || p.category || (idx + 1) + ' / CONCEPT')}</small>
            <h3>${esc(p.title)}</h3>
          </div>
          <span>↗</span>
        </div>
      </article>
    `).join('');
    
    bindProjectCardHover();
  }catch(e){
    console.info('Projects load error', e);
  }
}

// Initialize on DOM ready
loadSiteSettings();
loadOffers();
loadProjects();
loadReviews();
initActiveStats();
bindProjectCardHover();
