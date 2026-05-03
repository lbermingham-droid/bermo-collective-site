/* ─── BERMO Launch — Main JS ─────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initFadeUp();
  initLoadingBar();
  initCTAForm();
  initCopyBlock();
  initNav();
});

/* ─── Fade-up on scroll ──────────────────────────────────────────── */
function initFadeUp() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => observer.observe(el));
}

/* ─── Animated loading bar (BB interface) ────────────────────────── */
function initLoadingBar() {
  const fill = document.querySelector('.loading-bar-block__fill');
  const percent = document.querySelector('.loading-bar-block__percent');
  if (!fill) return;

  const target = 37;
  let current = 0;

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      fill.style.width = target + '%';

      const interval = setInterval(() => {
        current = Math.min(current + 1, target);
        if (percent) percent.textContent = current + '%';
        if (current >= target) clearInterval(interval);
      }, 65);

      observer.disconnect();
    }
  }, { threshold: 0.5 });

  observer.observe(fill.closest('.loading-bar-block'));
}

/* ─── CTA inline form expand ─────────────────────────────────────── */
function initCTAForm() {
  const trigger = document.querySelector('.cta-trigger');
  const form = document.querySelector('.inline-form');
  const formEl = document.querySelector('#waitlist-form');
  const successEl = document.querySelector('.form-success');

  if (!trigger || !form) return;

  trigger.addEventListener('click', () => {
    const isOpen = form.classList.contains('is-open');
    form.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(!isOpen));

    if (!isOpen) {
      setTimeout(() => {
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const firstInput = form.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  });

  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      const submitBtn = formEl.querySelector('.form-submit');
      if (submitBtn) {
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
      }
    });
  }
}

/* ─── Copy-to-clipboard for context block ────────────────────────── */
function initCopyBlock() {
  const btns = document.querySelectorAll('.code-block__copy');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const block = btn.closest('.code-block');
      const text = block ? block.querySelector('code')?.textContent || block.textContent.replace('Copy', '').trim() : '';
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  });
}

/* ─── Nav scroll effect ──────────────────────────────────────────── */
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 80) {
      nav.style.background = 'rgba(10,10,10,0.97)';
    } else {
      nav.style.background = 'rgba(10,10,10,0.88)';
    }
    lastY = y;
  }, { passive: true });
}
