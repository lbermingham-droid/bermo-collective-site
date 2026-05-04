/* ─── BERMO Launch — Main JS ───────────────────────────────────────
   Animations, counters, interactivity. Stripe-DNA: motion is purposeful. */

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initLoader();
  initCounter();
  initWaitlistTrigger();
  initCopy();
  initModal();
});

/* ═══════════════════════════════════════════════════════════════════
   1. Nav — adds shadow when scrolled
   ═══════════════════════════════════════════════════════════════════ */
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ═══════════════════════════════════════════════════════════════════
   2. Reveal-on-scroll
   ═══════════════════════════════════════════════════════════════════ */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -10% 0px' });
  els.forEach((el) => io.observe(el));
}

/* ═══════════════════════════════════════════════════════════════════
   3. Loader — animates fill to 37%, ticks the percent label,
      progressively lights up network rows. Stops at 37 forever.
   ═══════════════════════════════════════════════════════════════════ */
function initLoader() {
  const loader = document.querySelector('.loader');
  if (!loader) return;

  const fill = loader.querySelector('.loader__fill');
  const pct  = loader.querySelector('.loader__pct');
  const rows = loader.querySelectorAll('.loader__row');
  const target = 37;
  let played = false;

  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !played) {
      played = true;
      if (fill) fill.style.width = target + '%';
      let n = 0;
      const tick = setInterval(() => {
        n = Math.min(n + 1, target);
        if (pct) pct.textContent = n + '%';
        if (n === 14 && rows[0]) rows[0].classList.add('is-on');
        if (n >= target) clearInterval(tick);
      }, 60);
      io.disconnect();
    }
  }, { threshold: 0.5 });
  io.observe(loader);
}

/* ═══════════════════════════════════════════════════════════════════
   4. Counter — counts up to data-target when in view
   ═══════════════════════════════════════════════════════════════════ */
function initCounter() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.counter, 10);
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      io.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach((el) => io.observe(el));
}

/* ═══════════════════════════════════════════════════════════════════
   5. Waitlist trigger — smooth-scroll to #waitlist
   ═══════════════════════════════════════════════════════════════════ */
function initWaitlistTrigger() {
  document.querySelectorAll('[data-scroll]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const id = el.getAttribute('data-scroll');
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const input = target.querySelector('input[type="email"]');
      setTimeout(() => input && input.focus(), 700);
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   6. Copy-to-clipboard for code blocks
   ═══════════════════════════════════════════════════════════════════ */
function initCopy() {
  document.querySelectorAll('.code__copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const block = btn.closest('.code');
      if (!block) return;
      const body = block.querySelector('.code__body');
      const text = (body ? body.textContent : block.textContent).trim();
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('is-copied');
        setTimeout(() => {
          btn.textContent = orig || 'Copy';
          btn.classList.remove('is-copied');
        }, 1800);
      });
    });
  });
}

/* ═══════════════════════════════════════════════════════════════════
   7. Coming-soon modal — first visit only, sessionStorage gate
   ═══════════════════════════════════════════════════════════════════ */
function initModal() {
  const modal = document.getElementById('modal');
  if (!modal) return;
  const dismiss = modal.querySelector('[data-modal-dismiss]');

  if (!sessionStorage.getItem('bermo-modal-seen')) {
    setTimeout(() => modal.classList.add('is-open'), 700);
  }

  const close = () => {
    modal.classList.remove('is-open');
    sessionStorage.setItem('bermo-modal-seen', '1');
  };

  if (dismiss) dismiss.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
