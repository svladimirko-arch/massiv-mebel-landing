/* ============================================================
   ЛЕНДИНГ «МАССИВ» — анимации и логика
   GSAP + ScrollTrigger. Схема анимаций взята с эталона «Мастер+».
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // если CDN с GSAP недоступен — просто показываем сайт без анимаций
  if (typeof window.gsap === 'undefined') {
    document.getElementById('preloader')?.classList.add('done');
    document.body.classList.remove('locked');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- PRELOADER ---------- */
  const preloader = document.getElementById('preloader');
  const preloaderBar = document.getElementById('preloaderBar');
  let progress = 0;
  const fakeLoad = setInterval(() => {
    progress = Math.min(progress + Math.random() * 22, 92);
    preloaderBar.style.width = progress + '%';
  }, 160);

  const finishPreload = () => {
    clearInterval(fakeLoad);
    preloaderBar.style.width = '100%';
    setTimeout(() => {
      preloader.classList.add('done');
      document.body.classList.remove('locked');
      heroIntro();
    }, 350);
  };
  document.body.classList.add('locked');
  window.addEventListener('load', () => setTimeout(finishPreload, 400));
  setTimeout(finishPreload, 4000); // страховка, если что-то тянется

  /* ---------- HERO INTRO ---------- */
  function heroIntro() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('[data-hero="1"]', { y: 24, opacity: 0, duration: .7 })
      .from('[data-hero="2"], [data-hero="3"], [data-hero="4"]', {
        y: 60, opacity: 0, duration: .9, stagger: .13
      }, '-=.4')
      .from('[data-hero="5"]', { y: 26, opacity: 0, duration: .7 }, '-=.45')
      .from('[data-hero="6"] > *', { y: 22, opacity: 0, duration: .6, stagger: .1 }, '-=.4')
      .from('[data-hero="7"] > li', { y: 16, opacity: 0, duration: .5, stagger: .08 }, '-=.35')
      .from('.hero__stats .stat', {
        y: 30, opacity: 0, duration: .7, stagger: .09,
        onStart: runCounters
      }, '-=.3');
    // медленный наезд фона — как видео в эталоне
    gsap.fromTo('#heroPoster',
      { scale: 1.14 },
      { scale: 1, duration: 2.8, ease: 'power2.out' });
    // параллакс фона при прокрутке
    gsap.to('#heroPoster', {
      yPercent: 12, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- СЧЁТЧИКИ ---------- */
  function runCounters() {
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = +el.dataset.counter;
      if (target === 0) return;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.8, ease: 'power2.out',
        onUpdate: () => el.textContent = Math.round(obj.v)
      });
    });
  }

  /* ---------- HEADER ---------- */
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- БУРГЕР ---------- */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    nav.classList.toggle('open');
    document.body.classList.toggle('locked');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    burger.classList.remove('open');
    nav.classList.remove('open');
    document.body.classList.remove('locked');
  }));

  /* ---------- ПЛАВНЫЙ СКРОЛЛ ---------- */
  document.querySelectorAll('[data-scroll]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || !id.startsWith('#')) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({ top: el.offsetTop - 70, behavior: 'smooth' });
    });
  });

  /* ---------- SCROLL REVEAL ---------- */
  gsap.utils.toArray('[data-reveal]').forEach(el => {
    gsap.from(el, {
      y: 46, opacity: 0, duration: .9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* stagger для сетки портфолио */
  const grid = document.querySelector('.portfolio__grid');
  if (grid) {
    grid.querySelectorAll('[data-reveal]').forEach(el => gsap.set(el, { clearProps: 'all' }));
    gsap.from(grid.querySelectorAll('.work'), {
      y: 50, opacity: 0, duration: .85, ease: 'power3.out', stagger: .1,
      scrollTrigger: { trigger: grid, start: 'top 85%' }
    });
  }

  /* ---------- ПАРАЛЛАКС ИЗОБРАЖЕНИЯ «О НАС» ---------- */
  gsap.utils.toArray('.parallax-img img').forEach(img => {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: img.closest('.parallax-img'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  /* лёгкий параллакс карточек портфолио */
  gsap.utils.toArray('.work').forEach((card, i) => {
    gsap.fromTo(card, { y: i % 2 ? 30 : 0 }, {
      y: i % 2 ? 0 : 30, ease: 'none',
      scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: .6 }
    });
  });

  /* ---------- ЗАГОЛОВКИ СЕКЦИЙ ---------- */
  gsap.utils.toArray('.section__title').forEach(t => {
    gsap.from(t, {
      scrollTrigger: { trigger: t, start: 'top 90%' },
      duration: 1, y: 30, opacity: 0, ease: 'power3.out'
    });
  });

  /* ---------- LIGHTBOX ---------- */
  const lightbox = document.getElementById('lightbox');
  const lbImg = lightbox.querySelector('img');
  document.querySelectorAll('[data-lightbox]').forEach(card => {
    card.addEventListener('click', () => {
      lbImg.src = card.dataset.lightbox;
      lightbox.classList.add('open');
      document.body.classList.add('locked');
    });
  });
  const closeLb = () => { lightbox.classList.remove('open'); document.body.classList.remove('locked'); };
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLb(); });
  lightbox.querySelector('.lightbox__close').addEventListener('click', closeLb);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });

  /* ---------- ФОРМА (ЗАГЛУШКА) ---------- */
  const form = document.getElementById('orderForm');
  const phone = document.getElementById('f-phone');
  phone.addEventListener('input', () => {
    let d = phone.value.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (d && !d.startsWith('7')) d = '7' + d;
    d = d.slice(0, 11);
    let out = '';
    if (d.length) out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ') ' + d.slice(4, 7);
    if (d.length >= 7) out += '-' + d.slice(7, 9);
    if (d.length >= 9) out += '-' + d.slice(9, 11);
    phone.value = out;
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    const nameF = document.getElementById('f-name');
    [nameF, phone].forEach(f => {
      const wrap = f.closest('.field');
      const bad = !f.value.trim() || (f === phone && f.value.replace(/\D/g, '').length < 11);
      wrap.classList.toggle('invalid', bad);
      if (bad) ok = false;
    });
    if (!document.getElementById('f-agree').checked) ok = false;
    if (!ok) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.style.opacity = '.65';
    btn.firstChild.textContent = 'Отправляем… ';
    // ЗАГЛУШКА: подключить реальную отправку (Telegram-бот / e-mail / бэкенд)
    setTimeout(() => {
      document.getElementById('formSuccess').classList.add('show');
      btn.disabled = false;
      btn.style.opacity = '';
    }, 900);
  });
  [document.getElementById('f-name'), phone].forEach(f =>
    f.addEventListener('input', () => f.closest('.field').classList.remove('invalid')));

  /* ---------- МАГНИТНЫЕ КНОПКИ ---------- */
  document.querySelectorAll('.btn--primary').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn, {
        x: (e.clientX - r.left - r.width / 2) * .18,
        y: (e.clientY - r.top - r.height / 2) * .28,
        duration: .4, ease: 'power2.out'
      });
    });
    btn.addEventListener('mouseleave', () =>
      gsap.to(btn, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.4)' }));
  });
});
