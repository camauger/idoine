/**
 * courseFilters.js - Filtrage des sections de cours
 * Affiche/masque les sections selon le filtre sélectionné
 * Supporte les ancres URL: /cours#intensif, /cours#vitrail, etc.
 */
(function () {
  'use strict';

  var SECTION_IDS = ['ceramique', 'intensif', 'enfants', 'vitrail', 'mosaique'];

  var FILTER_MAP = {
    all: SECTION_IDS,
    ceramique: ['ceramique'],
    vitrail: ['vitrail'],
    mosaique: ['mosaique'],
    intensif: ['intensif'],
    enfants: ['enfants']
  };

  function getFilterFromHash() {
    var hash = (window.location.hash || '').replace(/^#/, '').toLowerCase();
    if (FILTER_MAP[hash]) return hash;
    return 'all';
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

  function applyFilter(filter, filterBtns, sectionsWithContent) {
    var sectionsToShow = FILTER_MAP[filter] || FILTER_MAP.all;

    // Update button states
    if (filterBtns && filterBtns.length) {
      filterBtns.forEach(function(btn) {
        var btnFilter = btn.getAttribute('data-filter') || 'all';
        var isActive = btnFilter === filter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    }

    // Show/hide sections
    SECTION_IDS.forEach(function(id) {
      var section = document.getElementById(id);
      if (!section) return;

      var shouldShow = sectionsToShow.indexOf(id) !== -1 && sectionsWithContent[id];
      section.style.display = shouldShow ? '' : 'none';
    });
  }

  function scrollToFirstVisible(filter, sectionsWithContent) {
    var sectionsToShow = FILTER_MAP[filter] || FILTER_MAP.all;
    
    for (var i = 0; i < sectionsToShow.length; i++) {
      var id = sectionsToShow[i];
      if (sectionsWithContent[id]) {
        var section = document.getElementById(id);
        if (section) {
          setTimeout(function() {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
          return;
        }
      }
    }
  }

  function init() {
    var filterBar = document.getElementById('filtres-cours');
    if (!filterBar) return;

    var filterBtns = filterBar.querySelectorAll('.filter-btn');
    var sectionsWithContent = getSectionsWithContent();

    // Apply initial filter from hash
    var currentFilter = getFilterFromHash();
    applyFilter(currentFilter, filterBtns, sectionsWithContent);

    // Only scroll if there's a specific hash (not 'all')
    if (currentFilter !== 'all' && window.location.hash) {
      scrollToFirstVisible(currentFilter, sectionsWithContent);
    }

    // Add click handlers (only once)
    if (filterBar.getAttribute('data-handlers-attached') === 'true') return;
    filterBar.setAttribute('data-handlers-attached', 'true');

    filterBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var filter = this.getAttribute('data-filter') || 'all';
        var freshSections = getSectionsWithContent();
        applyFilter(filter, filterBtns, freshSections);
        scrollToFirstVisible(filter, freshSections);

        // Update URL hash
        var newHash = filter === 'all' ? '' : '#' + filter;
        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + newHash);
        }
      });
    });

    // Handle hash changes
    window.addEventListener('hashchange', function() {
      var filter = getFilterFromHash();
      var freshSections = getSectionsWithContent();
      applyFilter(filter, filterBtns, freshSections);
      if (filter !== 'all') {
        scrollToFirstVisible(filter, freshSections);
      }
    });
  }

  // Run after courses are loaded
  window.addEventListener('courses-loaded', function() {
    setTimeout(init, 50);
  });

  // Also run on DOMContentLoaded as fallback
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
