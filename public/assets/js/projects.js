/**
 * Juswa Portfolio Projects Filter & Interaction Controller
 */

export function initProjects() {
  const filterButtons = document.querySelectorAll('.filter-chip');
  const projectCards = document.querySelectorAll('.project-card');
  if (filterButtons.length === 0 || projectCards.length === 0) return;

  const firstChip = filterButtons[0];
  if (firstChip.dataset.projectsInitialized === 'true') return;
  firstChip.dataset.projectsInitialized = 'true';

  filterButtons.forEach(btn => {
    btn.onclick = () => {
      const category = btn.getAttribute('data-filter');

      // Update active filter chip
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (window.JuswaSound) {
        window.JuswaSound.playClick();
      }

      // Filter cards
      projectCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (category === 'all' || cardCategory === category) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translate(0, 0)';
          }, 10);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(() => {
            card.style.display = 'none';
          }, 150);
        }
      });
    };
  });
}

window.initJuswaProjects = initProjects;
export default initProjects;

