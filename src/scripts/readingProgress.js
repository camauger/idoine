/**
 * Initialize the reading progress indicator.
 * Only activates on pages with .post-content.
 */
export function initReadingProgress() {
  const article = document.querySelector('.post-content');
  if (!article) return;

  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-label', 'Progression de lecture');
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', '100');
  progressBar.setAttribute('aria-valuenow', '0');

  const progressFill = document.createElement('div');
  progressFill.className = 'reading-progress__fill';
  progressBar.appendChild(progressFill);

  document.body.insertBefore(progressBar, document.body.firstChild);

  // Layout values change only on resize / font load — cache them.
  let articleTop = 0;
  let articleEnd = 0;
  let visibilityThreshold = 0;

  function measure() {
    const rect = article.getBoundingClientRect();
    const articleHeight = article.offsetHeight;
    const windowHeight = window.innerHeight;
    articleTop = rect.top + window.scrollY;
    articleEnd = articleTop + articleHeight - windowHeight;
    visibilityThreshold = articleTop - windowHeight / 2;
  }

  // Short-circuit identical writes — scroll fires 60×/s but the rounded
  // progress and visibility usually don't change frame-to-frame.
  let lastProgressRounded = -1;
  let lastVisible = null;

  function updateProgress() {
    const scrollY = window.scrollY;

    let progress = 0;
    if (scrollY >= articleTop && scrollY <= articleEnd) {
      progress = ((scrollY - articleTop) / (articleEnd - articleTop)) * 100;
    } else if (scrollY > articleEnd) {
      progress = 100;
    }
    progress = Math.min(100, Math.max(0, progress));

    const rounded = Math.round(progress);
    if (rounded !== lastProgressRounded) {
      progressFill.style.transform = `scaleX(${progress / 100})`;
      progressBar.setAttribute('aria-valuenow', rounded);
      lastProgressRounded = rounded;
    }

    const shouldBeVisible = scrollY > visibilityThreshold && progress < 100;
    if (shouldBeVisible !== lastVisible) {
      progressBar.classList.toggle('visible', shouldBeVisible);
      lastVisible = shouldBeVisible;
    }
  }

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

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    requestAnimationFrame(() => {
      measure();
      updateProgress();
    });
  }, { passive: true });

  measure();
  updateProgress();
}

/**
 * Initialize sidenote toggle functionality for mobile.
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
