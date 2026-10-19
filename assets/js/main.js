/**
 * Juswa Portfolio Main Navigation & Global Seamless Router
 * Manages the floating circular hamburger button, vertical pill menu,
 * and seamless in-page routing to ensure background music continues
 * playing uninterrupted across pages.
 */

import './theme.js';
import './audio.js';
import { initMusicPlayer } from './player.js';
import { initRoom, cleanupRoom } from './room.js';
import { initProjects } from './projects.js';

let roleRotatorInterval = null;

export function initAboutRoleRotator() {
  if (roleRotatorInterval) {
    clearInterval(roleRotatorInterval);
    roleRotatorInterval = null;
  }
  const roleEl = document.getElementById('role-text');
  if (!roleEl) return;

  const roles = [
    "Computer Engineering Student",
    "Digital Artist & Illustrator",
    "Creative Frontend Developer",
    "Embedded & IoT Tinkerer"
  ];
  let roleIndex = 0;

  roleRotatorInterval = setInterval(() => {
    roleIndex = (roleIndex + 1) % roles.length;
    roleEl.style.opacity = '0';
    setTimeout(() => {
      roleEl.textContent = roles[roleIndex];
      roleEl.style.opacity = '1';
    }, 200);
  }, 2800);
}

export function initAboutPolaroid() {
  const card = document.getElementById('polaroid-profile-card');
  const chipDrawn = document.getElementById('chip-drawn');
  const chipIrl = document.getElementById('chip-irl');
  const sub = document.getElementById('polaroid-sub');
  const hint = document.getElementById('polaroid-hint');

  if (!card) return;

  function toggleView() {
    const isIrl = card.classList.toggle('is-irl');

    if (chipDrawn && chipIrl) {
      chipDrawn.classList.toggle('active', !isIrl);
      chipIrl.classList.toggle('active', isIrl);
    }

    if (sub) {
      sub.textContent = isIrl ? 'Real Life • @Shuwawao' : '@Shuwawao • @juswa_draws';
    }

    if (hint) {
      hint.textContent = isIrl ? 'Click to see drawing avatar ⟳' : 'Click drawing to see real photo ⟳';
    }

    if (window.JuswaSound) {
      window.JuswaSound.playClick();
    }
  }

  card.onclick = () => {
    toggleView();
  };

  card.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleView();
    }
  };
}

export function bindNavMenuControls() {
  const navToggleBtn = document.getElementById('nav-toggle-btn');
  const navCloseBtn = document.getElementById('nav-close-btn');
  const navPillMenu = document.getElementById('nav-pill-menu');
  const navMenuWrapper = document.querySelector('.nav-menu-wrapper');
  const navPillItems = document.querySelectorAll('.nav-pill-item');

  function openMenu() {
    if (!navPillMenu) return;
    navPillMenu.classList.add('is-open');
    if (navMenuWrapper) navMenuWrapper.classList.add('is-open');
    if (navToggleBtn) navToggleBtn.setAttribute('aria-expanded', 'true');
    navPillMenu.setAttribute('aria-hidden', 'false');

    if (window.JuswaSound) {
      window.JuswaSound.playClick();
    }
  }

  function closeMenu() {
    if (!navPillMenu) return;
    navPillMenu.classList.remove('is-open');
    if (navMenuWrapper) navMenuWrapper.classList.remove('is-open');
    if (navToggleBtn) navToggleBtn.setAttribute('aria-expanded', 'false');
    navPillMenu.setAttribute('aria-hidden', 'true');

    if (window.JuswaSound) {
      window.JuswaSound.playClick();
    }
  }

  if (navToggleBtn) {
    navToggleBtn.onclick = (e) => {
      e.stopPropagation();
      openMenu();
    };
  }

  if (navCloseBtn) {
    navCloseBtn.onclick = (e) => {
      e.stopPropagation();
      closeMenu();
    };
  }

  // Close menu when clicking outside
  document.onclick = (e) => {
    if (navPillMenu && navPillMenu.classList.contains('is-open')) {
      if (!navPillMenu.contains(e.target) && (!navToggleBtn || !navToggleBtn.contains(e.target))) {
        closeMenu();
      }
    }
  };

  // Close menu on Escape key
  document.onkeydown = (e) => {
    if (e.key === 'Escape' && navPillMenu && navPillMenu.classList.contains('is-open')) {
      closeMenu();
    }
  };

  // Sound effects on pill navigation items
  navPillItems.forEach(item => {
    item.onmouseenter = () => {
      if (window.JuswaSound) window.JuswaSound.playHover();
    };
    item.onmouseleave = () => {};
  });
}

export function bindPageInteractions() {
  // Add hover and click sounds to all interactive elements
  const clickableElements = document.querySelectorAll('.sketch-btn, .filter-chip, .back-link, .card-link');
  clickableElements.forEach(el => {
    el.onmouseenter = () => {
      if (window.JuswaSound) window.JuswaSound.playHover();
    };
    el.onclick = () => {
      if (window.JuswaSound) window.JuswaSound.playClick();
    };
  });

  // Intercept internal page navigation links to prevent full reload
  // and maintain seamless audio playback across pages
  const internalLinks = document.querySelectorAll('a[href]');
  internalLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Only intercept local html files
    const isInternal = href === 'index.html' || href === 'about.html' || href === 'projects.html' || href === './' || href === '/';
    if (isInternal && !link.hasAttribute('target')) {
      link.onclick = (e) => {
        e.preventDefault();
        navigateToPage(href);
      };
    }
  });
}

/**
 * Seamless Client-Side Page Router
 * Loads page content via fetch and swaps <main> and header elements
 * so background audio keeps playing without interruption!
 */
export function navigateToPage(url, pushState = true) {
  const cleanUrl = url.replace('./', '');
  const pageName = cleanUrl.split('?')[0].split('#')[0] || 'index.html';

  if (window.JuswaSound) {
    window.JuswaSound.playClick();
  }

  fetch(pageName)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Update Document Title
      if (doc.title) {
        document.title = doc.title;
      }

      // Sync stylesheets from target page head to ensure all page styles are present
      const targetStyles = doc.querySelectorAll('link[rel="stylesheet"]');
      targetStyles.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
          const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(l => {
            const h = l.getAttribute('href');
            return h === href || (h && h.endsWith(href)) || (href && href.endsWith(h));
          });
          if (!exists) {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = href;
            document.head.appendChild(newLink);
          }
        }
      });

      // Update Header (Pill menu presence / active indicators)
      const currentHeader = document.querySelector('.site-header');
      const newHeader = doc.querySelector('.site-header');
      if (currentHeader && newHeader) {
        currentHeader.innerHTML = newHeader.innerHTML;
        bindNavMenuControls();
      }

      // Update Main Container
      const currentMain = document.querySelector('main');
      const newMain = doc.querySelector('main');
      if (currentMain && newMain) {
        // Subtle fade transition
        currentMain.style.opacity = '0';
        currentMain.style.transform = 'translateY(6px)';
        currentMain.style.transition = 'opacity 0.15s ease, transform 0.15s ease';

        setTimeout(() => {
          currentMain.className = newMain.className;
          currentMain.innerHTML = newMain.innerHTML;
          currentMain.style.opacity = '1';
          currentMain.style.transform = 'translateY(0)';

          window.scrollTo({ top: 0, behavior: 'instant' });

          // Re-initialize page specific controllers
          if (pageName === 'index.html' || pageName === '' || pageName === '/') {
            initRoom();
          } else {
            cleanupRoom();
            if (pageName === 'about.html') {
              initAboutRoleRotator();
              initAboutPolaroid();
            } else if (pageName === 'projects.html') {
              initProjects();
            }
          }

          // Re-bind interactive sounds and links
          bindPageInteractions();
        }, 150);
      }

      // Update History
      if (pushState) {
        window.history.pushState({ page: pageName }, doc.title, url);
      }
    })
    .catch(err => {
      console.warn('Seamless navigation error, using standard fallback:', err);
      window.location.href = url;
    });
}

// Global router exposure
window.navigateToPage = navigateToPage;

// Handle Back / Forward Browser Buttons
window.addEventListener('popstate', (e) => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  navigateToPage(path, false);
});

// Initial Bootstrap on Page Load
function bootstrapApp() {
  bindNavMenuControls();
  bindPageInteractions();
  initMusicPlayer();

  if (window.JuswaTheme) {
    window.JuswaTheme.syncRoomElements(window.JuswaTheme.currentTheme);
  }

  const path = window.location.pathname;
  if (path.includes('about.html')) {
    initAboutRoleRotator();
    initAboutPolaroid();
  } else if (path.includes('projects.html')) {
    initProjects();
  } else {
    initRoom();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
  bootstrapApp();
}
