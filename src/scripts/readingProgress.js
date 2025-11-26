// =============================================================================
// Reading Progress Indicator
// =============================================================================
// Shows a subtle progress bar at the top of the viewport while reading articles

/**
 * Initialize the reading progress indicator
 * Only activates on pages with .post-content
 */
export function initReadingProgress() {
  const article = document.querySelector('.post-content');

  // Only initialize on article pages
  if (!article) return;

  // Create progress bar element
  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-label', 'Progression de lecture');
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', '100');
  progressBar.setAttribute('aria-valuenow', '0');

  // Create inner fill element
  const progressFill = document.createElement('div');
  progressFill.className = 'reading-progress__fill';
  progressBar.appendChild(progressFill);

  // Insert at the top of the body
  document.body.insertBefore(progressBar, document.body.firstChild);

  // Calculate and update progress
  function updateProgress() {
    const articleRect = article.getBoundingClientRect();
    const articleTop = articleRect.top + window.scrollY;
    const articleHeight = article.offsetHeight;
    const windowHeight = window.innerHeight;
    const scrollY = window.scrollY;

    // Calculate how much of the article has been scrolled through
    const articleStart = articleTop;
    const articleEnd = articleTop + articleHeight - windowHeight;

    let progress = 0;

    if (scrollY >= articleStart && scrollY <= articleEnd) {
      progress = ((scrollY - articleStart) / (articleEnd - articleStart)) * 100;
    } else if (scrollY > articleEnd) {
      progress = 100;
    }

    // Clamp between 0 and 100
    progress = Math.min(100, Math.max(0, progress));

    // Update visual
    progressFill.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(progress));

    // Add/remove visibility class
    if (scrollY > articleStart - windowHeight / 2 && progress < 100) {
      progressBar.classList.add('visible');
    } else {
      progressBar.classList.remove('visible');
    }
  }

  // Throttled scroll handler
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }

  // Listen for scroll events
  window.addEventListener('scroll', onScroll, { passive: true });

  // Initial calculation
  updateProgress();

  // Recalculate on resize
  window.addEventListener('resize', () => {
    requestAnimationFrame(updateProgress);
  }, { passive: true });
}

/**
 * Initialize sidenote toggle functionality for mobile
 */
export function initSidenotes() {
  const toggles = document.querySelectorAll('.sidenote-toggle');

  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const sidenoteId = toggle.getAttribute('aria-controls');
      const sidenote = document.getElementById(sidenoteId);

      if (sidenote) {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
        sidenote.classList.toggle('visible');
      }
    });
  });

  // Intersection observer for desktop sidenote animations
  if (window.matchMedia('(min-width: 1200px)').matches) {
    const sidenotes = document.querySelectorAll('.sidenote');

    if (sidenotes.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
            }
          });
        },
        { threshold: 0.1 }
      );

      sidenotes.forEach(note => observer.observe(note));
    }
  }
}

