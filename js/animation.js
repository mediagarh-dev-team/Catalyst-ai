/* =========================================================
   Catalyst AI - Scroll animations (animation.js)
   Load at the END of <body>, after the other scripts.

   - No HTML changes needed: sections are targeted by selector (CONFIG).
   - Optional manual control on any element:
       data-anim="fade-up | fade-up-sm | fade-in | scale-in"
       data-anim-delay="200"   (ms)
   - Elements revealed together are staggered automatically.
   - Animation classes are removed after each animation ends, so the
     original CSS (hovers, transitions) is fully restored.
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return; // page stays fully visible

  /* ---------------------------------------------------------
     CONFIG
     sel      : CSS selector(s) to animate
     effect   : fade-up | fade-up-sm | fade-in | scale-in
     delay    : base delay (ms)
     stagger  : extra delay per element revealed in the same batch (ms)
     max      : cap for the stagger part (ms, default 600)
     --------------------------------------------------------- */
  var CONFIG = [
    /* Hero (card has its own load animation in style.css, so only its content is staggered) */
    {
      sel: '.hero-card__eyebrow, .hero-card__title, .hero-card__text, .btn-light-cta',
      effect: 'fade-up',
      delay: 350,
      stagger: 110,
    },

    /* Enquiry */
    { sel: '.enquiry__wrap', effect: 'fade-up' },
    { sel: '.enquiry__intro > *', effect: 'fade-up', delay: 200, stagger: 110 },
    { sel: '.form-card .row > [class*="col-"]', effect: 'fade-up-sm', delay: 250, stagger: 45, max: 450 },

    /* Pick a campus */
    {
      sel: '.campuses__head .section-eyebrow, .campuses__title, .campuses__lead',
      effect: 'fade-up',
      stagger: 100,
    },
    { sel: '.campus-card', effect: 'fade-up', stagger: 150 },
    { sel: '.campus-card .programmes li', effect: 'fade-up-sm', delay: 200, stagger: 55, max: 330 },

    /* How it works */
    {
      sel: '.process__head .section-eyebrow, .process__title, .process__head .btn-soft',
      effect: 'fade-up',
      stagger: 100,
    },
    { sel: '.step', effect: 'fade-up', stagger: 130 },

    /* Commitments */
    { sel: '.commit__card', effect: 'fade-up' },
    {
      sel: '.commit__head .section-eyebrow, .commit__title, .commit__lead',
      effect: 'fade-up',
      delay: 150,
      stagger: 100,
    },
    { sel: '.commit-item', effect: 'fade-up', delay: 250, stagger: 120 },

    /* FAQ */
    { sel: '.faq-section .section-eyebrow, .faq-section__title', effect: 'fade-up', stagger: 100 },
    { sel: '.faq .accordion-item', effect: 'fade-up-sm', stagger: 70, max: 350 },

    /* Footer */
    { sel: '.site-footer__brand, .site-footer__legal', effect: 'fade-up', stagger: 120 },
    { sel: '.site-footer__disclaimer, .site-footer__copy', effect: 'fade-up-sm', delay: 100, stagger: 100 },
  ];

  var meta = new WeakMap(); // element -> { id, cfg }

  function byDocumentOrder(a, b) {
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  }

  /* Remove every animation class/var so the element is back to its original CSS */
  function cleanup(el) {
    var m = meta.get(el);
    if (!m) return;
    el.classList.remove('anim', 'anim--' + m.cfg.effect, 'is-inview');
    el.style.removeProperty('--anim-delay');
  }

  function watchEnd(el, delay) {
    function onEnd(ev) {
      if (ev.target !== el || String(ev.animationName).indexOf('anim-') !== 0) return;
      el.removeEventListener('animationend', onEnd);
      cleanup(el);
    }
    el.addEventListener('animationend', onEnd);
    // Safety net in case animationend never fires
    window.setTimeout(function () {
      el.removeEventListener('animationend', onEnd);
      cleanup(el);
    }, delay + 2000);
  }

  var io = new IntersectionObserver(
    function (entries) {
      var batches = {};

      entries.forEach(function (entry) {
        var el = entry.target;
        var m = meta.get(el);
        if (!m) return;

        if (entry.isIntersecting) {
          (batches[m.id] = batches[m.id] || []).push(el);
        } else if (entry.boundingClientRect.top < 0) {
          // Already scrolled past (anchor jump / refresh restore): show instantly
          io.unobserve(el);
          cleanup(el);
        }
      });

      Object.keys(batches).forEach(function (id) {
        batches[id].sort(byDocumentOrder).forEach(function (el, i) {
          var cfg = meta.get(el).cfg;
          var delay = (cfg.delay || 0) + Math.min(i * (cfg.stagger || 0), cfg.max || 600);

          io.unobserve(el);
          el.style.setProperty('--anim-delay', delay + 'ms');
          el.classList.add('is-inview');
          watchEnd(el, delay);
        });
      });
    },
    {
      threshold: 0,
      rootMargin: '0px 0px -10% 0px', // trigger a little after the element enters
    }
  );

  function register(el, cfg, id) {
    if (meta.has(el)) return;
    meta.set(el, { id: id, cfg: cfg });
    el.classList.add('anim', 'anim--' + cfg.effect);
    io.observe(el);
  }

  /* Manual overrides first: data-anim="fade-up" data-anim-delay="200" */
  Array.prototype.forEach.call(document.querySelectorAll('[data-anim]'), function (el, i) {
    register(
      el,
      {
        effect: el.getAttribute('data-anim') || 'fade-up',
        delay: parseInt(el.getAttribute('data-anim-delay'), 10) || 0,
        stagger: 0,
      },
      'manual-' + i
    );
  });

  /* Auto targets from CONFIG */
  CONFIG.forEach(function (cfg, i) {
    Array.prototype.forEach.call(document.querySelectorAll(cfg.sel), function (el) {
      register(el, cfg, 'cfg-' + i);
    });
  });

  /* Print: reveal everything */
  window.addEventListener('beforeprint', function () {
    io.disconnect();
    Array.prototype.forEach.call(document.querySelectorAll('.anim'), cleanup);
  });

  /* ---------------------------------------------------------
     Scroll progress bar (thin orange line at the top)
     --------------------------------------------------------- */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  var ticking = false;
  function updateBar() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    bar.style.transform = 'scaleX(' + p + ')';
    ticking = false;
  }
  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateBar);
    }
  }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  updateBar();
})();