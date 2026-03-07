/**
 * courseFilters.js - Navigation par ancres vers les sections de cours
 * Masque les boutons de filtre et les éléments de menu pour les disciplines sans cours.
 */
(function () {
  'use strict';

  var SECTION_IDS = ['ceramique', 'intensif', 'enfants', 'vitrail', 'mosaique'];

  function scrollToSection(sectionId) {
    var section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updateActiveButton(filterBtns, activeFilter) {
    filterBtns.forEach(function(btn) {
      var btnFilter = btn.getAttribute('data-filter') || 'all';
      var isActive = btnFilter === activeFilter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function getSectionsWithContent() {
    var result = {};
    SECTION_IDS.forEach(function(id) {
      var section = document.getElementById(id);
      if (section) {
        var grid = section.querySelector('.card-grid');
        result[id] = grid && grid.children.length > 0;
      } else {
        result[id] = false;
      }
    });
    return result;
  }

  function hideEmptyFilterButtons(filterBar, sectionsWithContent) {
    if (!filterBar) return;
    var filterBtns = filterBar.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(function(btn) {
      var filter = btn.getAttribute('data-filter') || 'all';
      
      if (filter === 'all') {
        btn.style.display = '';
        return;
      }
      
      var hasContent = sectionsWithContent[filter] === true;
      btn.style.display = hasContent ? '' : 'none';
    });
  }

  function hideEmptyNavItems(sectionsWithContent) {
    var navSubmenu = document.querySelector('.nav-submenu');
    if (!navSubmenu) return;
    
    var navLinks = navSubmenu.querySelectorAll('a[href*="#"]');
    
    navLinks.forEach(function(link) {
      var href = link.getAttribute('href') || '';
      var hashMatch = href.match(/#(\w+)$/);
      if (!hashMatch) return;
      
      var sectionId = hashMatch[1];
      var hasContent = sectionsWithContent[sectionId] === true;
      var li = link.closest('li');
      if (li) {
        li.style.display = hasContent ? '' : 'none';
      }
    });
  }

  function init() {
    var filterBar = document.getElementById('filtres-cours');
    var sectionsWithContent = getSectionsWithContent();

    hideEmptyFilterButtons(filterBar, sectionsWithContent);
    hideEmptyNavItems(sectionsWithContent);

    if (!filterBar) return;

    var filterBtns = filterBar.querySelectorAll('.filter-btn:not([style*="display: none"])');

    var hash = (window.location.hash || '').replace(/^#/, '').toLowerCase();
    if (hash && SECTION_IDS.indexOf(hash) !== -1 && sectionsWithContent[hash]) {
      updateActiveButton(filterBtns, hash);
      setTimeout(function() {
        scrollToSection(hash);
      }, 100);
    }

    if (filterBar.getAttribute('data-handlers-attached') === 'true') return;
    filterBar.setAttribute('data-handlers-attached', 'true');

    filterBar.addEventListener('click', function(e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;
      
      var filter = btn.getAttribute('data-filter') || 'all';
      var visibleBtns = filterBar.querySelectorAll('.filter-btn:not([style*="display: none"])');
      updateActiveButton(visibleBtns, filter);

      if (filter === 'all') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        scrollToSection(filter);
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + '#' + filter);
        }
      }
    });

    window.addEventListener('hashchange', function() {
      var newHash = (window.location.hash || '').replace(/^#/, '').toLowerCase();
      var freshSections = getSectionsWithContent();
      var visibleBtns = filterBar.querySelectorAll('.filter-btn:not([style*="display: none"])');
      
      if (newHash && SECTION_IDS.indexOf(newHash) !== -1 && freshSections[newHash]) {
        updateActiveButton(visibleBtns, newHash);
        scrollToSection(newHash);
      } else {
        updateActiveButton(visibleBtns, 'all');
      }
    });
  }

  window.addEventListener('courses-loaded', function() {
    setTimeout(init, 50);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
