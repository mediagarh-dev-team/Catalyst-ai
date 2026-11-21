/* =========================================================
   js/script.js
   Each feature lives in its own function and exits early if
   its section is missing, so one page never breaks another.
   ========================================================= */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- 1. AOS (scroll animations) ---------- */
function initAOS() {
  if (typeof AOS === "undefined") return;
  AOS.init({
    duration: 800,
    easing: "ease-out-cubic",
    once: true,
    offset: 80,
    disable: reduceMotion.matches
  });
}

/* ---------- 2. Header shadow on scroll ---------- */
function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- 3. Campus snapshot (autoplay tabs) ---------- */
function initSnapshot() {
  const root = document.querySelector("[data-snapshot]");
  if (!root) return;

  const tablist = root.querySelector(".snapshot__tabs");
  const tabs = [...root.querySelectorAll(".snapshot__tab")];
  const panels = [...root.querySelectorAll(".snapshot__panel")];

  const DELAY = 4500; // ms between auto-switches
  let current = 0;
  let timer = null;
  let paused = false;
  let visible = false;

  const show = (index) => {
    current = (index + tabs.length) % tabs.length;
    tablist.dataset.active = current;
    tabs.forEach((tab, i) => {
      const on = i === current;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on);
      tab.tabIndex = on ? 0 : -1;
      panels[i].classList.toggle("is-active", on);
    });
  };

  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => {
    stop();
    if (!paused && visible && !reduceMotion.matches) {
      timer = setInterval(() => show(current + 1), DELAY);
    }
  };
  const pause = () => { paused = true; stop(); };
  const resume = () => { paused = false; start(); };

  // Click a tab: switch and restart the timer
  tabs.forEach((tab, i) => tab.addEventListener("click", () => { show(i); start(); }));

  // Arrow-key navigation
  tablist.addEventListener("keydown", (e) => {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    show(current + dir);
    tabs[current].focus();
    start();
  });

  // Pause while the mouse is over the section or a keyboard user is focused inside it
  root.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && pause());
  root.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && resume());
  root.addEventListener("focusin", (e) => e.target.matches(":focus-visible") && pause());
  root.addEventListener("focusout", resume);

  // Only autoplay while the section is on screen
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  }, { threshold: 0.4 }).observe(root);
}

/* ---------- 4. Programmes (Swiper cards) ---------- */
function initProgrammes() {
  const root = document.querySelector("[data-programmes]");
  if (!root || typeof Swiper === "undefined") return;

  const slides = [...root.querySelectorAll(".swiper-slide")];
  const range = root.querySelector("[data-prog-range]");

  // Highlight the middle visible card and update the "1 – 3 of 8" counter
  const update = (swiper) => {
    const perView = Math.floor(swiper.params.slidesPerView);
    const first = Math.max(0, Math.min(swiper.activeIndex, slides.length - perView));
    const featured = first + Math.floor((perView - 1) / 2);

    slides.forEach((slide, i) => slide.classList.toggle("is-featured", i === featured));
    range.textContent = perView === 1 ? `${first + 1}` : `${first + 1} – ${first + perView}`;
  };

  new Swiper(root.querySelector(".programmes__swiper"), {
    slidesPerView: 1.1,
    spaceBetween: 16,
    speed: reduceMotion.matches ? 0 : 600,
    grabCursor: true,
    navigation: {
      prevEl: ".prog-arrow--prev",
      nextEl: ".prog-arrow--next"
    },
    keyboard: { enabled: true, onlyInViewport: true },
    breakpoints: {
      576: { slidesPerView: 2, spaceBetween: 20 },
      992: { slidesPerView: 3, spaceBetween: 24 }
    },
    on: {
      init: update,
      slideChange: update,
      breakpoint: update
    }
  });
}

/* ---------- 5. How admission works (step cards + pagination) ---------- */
function initAdmission() {
  const root = document.querySelector("[data-admission]");
  if (!root || typeof Swiper === "undefined") return;

  const slides = [...root.querySelectorAll(".swiper-slide")];
  const dots = [...root.querySelectorAll("[data-adm-dot]")];
  const prev = root.querySelector("[data-adm-prev]");
  const next = root.querySelector("[data-adm-next]");
  const last = slides.length - 1;
  let active = 0;
  let syncing = false; // true while we move the swiper ourselves

  // Single place that updates card, pagination and arrows
  function goTo(index, moveSwiper = true) {
    active = Math.max(0, Math.min(index, last));

    slides.forEach((slide, i) => slide.classList.toggle("is-active", i === active));
    dots.forEach((dot, i) => {
      const on = i === active;
      dot.classList.toggle("is-active", on);
      on ? dot.setAttribute("aria-current", "step") : dot.removeAttribute("aria-current");
    });
    prev.disabled = active === 0;
    next.disabled = active === last;

    if (moveSwiper) {
      syncing = true;
      swiper.slideTo(active);
      syncing = false;
    }
  }

  const swiper = new Swiper(root.querySelector(".admission__swiper"), {
    slidesPerView: "auto",
    spaceBetween: 16,
    speed: reduceMotion.matches ? 0 : 600,
    grabCursor: true,
    watchOverflow: false,
    on: {
      // User dragged / swiped: keep the highlighted card in sync
      slideChange: (sw) => { if (!syncing) goTo(sw.activeIndex, false); }
    }
  });

  prev.addEventListener("click", () => goTo(active - 1));
  next.addEventListener("click", () => goTo(active + 1));
  dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));
  slides.forEach((slide, i) => slide.addEventListener("click", () => goTo(i)));

  goTo(0, false);
}

/* ---------- Run everything ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initAOS();
  initHeader();
  initSnapshot();
  initProgrammes();
  initAdmission();
});