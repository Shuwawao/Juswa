/**
 * JUSWA Portfolio — Artistic Scroll Animations & Microinteractions
 * Digital Sketchbook with Technical Engineering Annotations
 * Handles scroll reveals, top progress line, clamped room parallax,
 * and desktop-only sketch cursor accent.
 */

let scrollProgressEl = null;
let cursorRingEl = null;
let revealObserver = null;
let parallaxCleanup = null;
let mousePos = { x: -100, y: -100 };
let ringPos = { x: -100, y: -100 };
let isHoveringInteractive = false;
let rafCursorId = null;

// Helper to check user motion preference
function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Helper to check if fine pointer (desktop mouse) is available
function hasFinePointer() {
  return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/* --------------------------------------------------------------------------
   1. Scroll Progress Bar
   -------------------------------------------------------------------------- */
export function initScrollProgress() {
  if (prefersReducedMotion()) return;

  if (!scrollProgressEl) {
    scrollProgressEl = document.querySelector('.scroll-progress-line');
    if (!scrollProgressEl) {
      scrollProgressEl = document.createElement('div');
      scrollProgressEl.className = 'scroll-progress-line';
      scrollProgressEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(scrollProgressEl);
    }
  }

  let ticking = false;
  const updateProgress = () => {
    if (!scrollProgressEl) return;
    const scrollH = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollH <= 0) {
      scrollProgressEl.style.width = '0%';
    } else {
      const pct = Math.min(100, Math.max(0, (window.scrollY / scrollH) * 100));
      scrollProgressEl.style.width = `${pct}%`;
    }
    ticking = false;
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(updateProgress);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  updateProgress();
}

/* --------------------------------------------------------------------------
   2. Scroll-Triggered Entrance Reveals (IntersectionObserver)
   -------------------------------------------------------------------------- */
export function initScrollReveals() {
  if (prefersReducedMotion()) {
    // If reduced motion requested, reveal everything immediately
    document.querySelectorAll('[data-reveal], [data-reveal-stagger]').forEach(el => {
      el.classList.add('is-revealed');
    });
    return;
  }

  if (revealObserver) {
    revealObserver.disconnect();
  }

  revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;
          target.classList.add('is-revealed');

          // If it's a staggered container, set index variable on children
          if (target.hasAttribute('data-reveal-stagger')) {
            const children = Array.from(target.children);
            children.forEach((child, idx) => {
              child.style.setProperty('--stagger-i', idx);
            });
          }

          observer.unobserve(target);
        }
      });
    },
    {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    }
  );

  const targets = document.querySelectorAll('[data-reveal]:not(.is-revealed), [data-reveal-stagger]:not(.is-revealed)');
  targets.forEach(el => {
    // If element is already in initial viewport on page load, reveal quickly
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95 && rect.bottom > 0) {
      el.classList.add('is-revealed');
      if (el.hasAttribute('data-reveal-stagger')) {
        Array.from(el.children).forEach((child, idx) => {
          child.style.setProperty('--stagger-i', idx);
        });
      }
    } else {
      revealObserver.observe(el);
    }
  });
}

/* --------------------------------------------------------------------------
   3. Desktop-Only Minimalist Sketch Cursor Accent
   -------------------------------------------------------------------------- */
export function initSketchCursor() {
  if (!hasFinePointer() || prefersReducedMotion()) {
    return;
  }

  if (!cursorRingEl) {
    cursorRingEl = document.querySelector('.sketch-cursor-ring');
    if (!cursorRingEl) {
      cursorRingEl = document.createElement('div');
      cursorRingEl.className = 'sketch-cursor-ring';
      cursorRingEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cursorRingEl);
    }
  }

  const interactiveSelector = 'a, button, [role="button"], input, textarea, select, .room-hotspot, .brief-project-card, .github-repo-card, .polaroid-card, .sketch-word-highlight';

  const onMouseMove = (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;

    if (cursorRingEl && !cursorRingEl.classList.contains('is-visible')) {
      cursorRingEl.classList.add('is-visible');
    }

    const hovered = e.target.closest(interactiveSelector);
    if (hovered && !isHoveringInteractive) {
      isHoveringInteractive = true;
      cursorRingEl.classList.add('is-hovering');
    } else if (!hovered && isHoveringInteractive) {
      isHoveringInteractive = false;
      cursorRingEl.classList.remove('is-hovering');
    }
  };

  const onMouseLeave = () => {
    if (cursorRingEl) {
      cursorRingEl.classList.remove('is-visible');
    }
  };

  const renderCursor = () => {
    if (cursorRingEl) {
      // Smooth interpolation
      ringPos.x += (mousePos.x - ringPos.x) * 0.22;
      ringPos.y += (mousePos.y - ringPos.y) * 0.22;
      cursorRingEl.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
    }
    rafCursorId = requestAnimationFrame(renderCursor);
  };

  window.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('mouseleave', onMouseLeave);

  if (!rafCursorId) {
    rafCursorId = requestAnimationFrame(renderCursor);
  }
}

/* --------------------------------------------------------------------------
   4. Clamped Room Parallax (Subtle Artwork Movement)
   -------------------------------------------------------------------------- */
export function initRoomParallax() {
  if (!hasFinePointer() || prefersReducedMotion()) return;

  if (parallaxCleanup) {
    parallaxCleanup();
    parallaxCleanup = null;
  }

  const roomStage = document.getElementById('room-stage');
  if (!roomStage) return;

  const sunEl = document.getElementById('room-sun');
  const moonEl = document.getElementById('room-moon');
  const lightEl = document.querySelector('.layer-light');

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let isMoving = false;
  let rafParallaxId = null;

  const onMouseMove = (e) => {
    const rect = roomStage.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      targetX = 0;
      targetY = 0;
      return;
    }

    // Normalized offset from -1 to 1
    const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    // Clamped strictly to subtle 3px - 5px range
    targetX = normX;
    targetY = normY;

    if (!isMoving) {
      isMoving = true;
      loop();
    }
  };

  const onMouseLeave = () => {
    targetX = 0;
    targetY = 0;
  };

  const loop = () => {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;

    const celestialX = currentX * -5;
    const celestialY = currentY * -3;
    const lightX = currentX * 3.5;
    const lightY = currentY * 2;

    if (sunEl) sunEl.style.transform = `translate3d(${celestialX}px, ${celestialY}px, 0)`;
    if (moonEl) moonEl.style.transform = `translate3d(${celestialX}px, ${celestialY}px, 0)`;
    if (lightEl) lightEl.style.transform = `translate3d(${lightX}px, ${lightY}px, 0)`;

    if (Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001) {
      rafParallaxId = requestAnimationFrame(loop);
    } else {
      isMoving = false;
    }
  };

  roomStage.addEventListener('mousemove', onMouseMove, { passive: true });
  roomStage.addEventListener('mouseleave', onMouseLeave);

  parallaxCleanup = () => {
    roomStage.removeEventListener('mousemove', onMouseMove);
    roomStage.removeEventListener('mouseleave', onMouseLeave);
    if (rafParallaxId) cancelAnimationFrame(rafParallaxId);
    if (sunEl) sunEl.style.transform = '';
    if (moonEl) moonEl.style.transform = '';
    if (lightEl) lightEl.style.transform = '';
  };
}

/* --------------------------------------------------------------------------
   5. Public Lifecycle Initialization & Refresh Hooks
   -------------------------------------------------------------------------- */
export function initAnimations() {
  initScrollProgress();
  initScrollReveals();
  initSketchCursor();
  initRoomParallax();
}

export function refreshAnimations() {
  initScrollReveals();
  initRoomParallax();
}
