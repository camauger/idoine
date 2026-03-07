/**
 * courseFilters.js - Filtrage des sections de cours
 * Affiche/masque les sections selon le filtre sélectionné
 */
(function () {
  'use strict';

  var SECTION_IDS = ['ceramique', 'intensif', 'enfants', 'vitrail', 'mosaique'];

  var FILTER_SECTIONS = {
    all: ['ceramique', 'intensif', 'enfants', 'vitrail', 'mosaique'],
    ceramique: ['ceramique'],
    vitrail: ['vitrail'],
    mosaique: ['mosaique'],
    intensif: ['intensif'],
    enfants: ['enfants']
  };

  var sectionsWithCourses = {};

  function recordSectionsWithCourses() {
    SECTION_IDS.forEach(function(id) {
      var section = document.getElementById(id);
      if (section) {
        var grid = section.querySelector('.card-grid');
        var hasCourses = grid && grid.children.length > 0;
        sectionsWithCourses[id] = hasCourses;
      }
    });
  }

  function setActiveTab(btn, filterBtns) {
    if (!filterBtns || !filterBtns.length) return;
    filterBtns.forEach(function (b) {
      var isActive = b === btn;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function applyFilter(filter) {
    var sectionsToShow = FILTER_SECTIONS[filter] || FILTER_SECTIONS.all;

    SECTION_IDS.forEach(function(id) {
      var section = document.getElementById(id);
      if (!section) return;

      var shouldShow = sectionsToShow.indexOf(id) !== -1;
      var hasCourses = sectionsWithCourses[id];

      if (shouldShow && hasCourses) {
        section.style.display = '';
      } else {
        section.style.display = 'none';
      }
    });

    var firstVisibleSection = null;
    for (var i = 0; i < sectionsToShow.length; i++) {
      var id = sectionsToShow[i];
      if (sectionsWithCourses[id]) {
        firstVisibleSection = document.getElementById(id);
        break;
      }
    }

    if (firstVisibleSection) {
      setTimeout(function() {
        var filterBar = document.getElementById('filtres-cours');
        var scrollTarget = filter === 'all' ? filterBar : firstVisibleSection;
        if (scrollTarget) {
          scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  }

  function init() {
    var filterBar = document.getElementById('filtres-cours');
    var filterBtns = filterBar ? filterBar.querySelectorAll('.filter-btn') : [];

    if (!filterBar || !filterBtns.length) return;

    recordSectionsWithCourses();

    var alreadyInit = filterBar.getAttribute('data-filters-initialized') === 'true';
    if (alreadyInit) return;
    filterBar.setAttribute('data-filters-initialized', 'true');

    filterBtns.forEach(function (b) {
      var isActive = b.classList.contains('active');
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = this.getAttribute('data-filter') || 'all';
        setActiveTab(this, filterBtns);
        applyFilter(filter);
      });

      btn.addEventListener('keydown', function (e) {
        var key = e.key;
        var idx = Array.prototype.indexOf.call(filterBtns, btn);
        var nextIdx = idx;
        if (key === 'ArrowRight' || key === 'ArrowDown') {
          e.preventDefault();
          nextIdx = (idx + 1) % filterBtns.length;
        } else if (key === 'ArrowLeft' || key === 'ArrowUp') {
          e.preventDefault();
          nextIdx = idx - 1;
          if (nextIdx < 0) nextIdx = filterBtns.length - 1;
        } else if (key === 'Home') {
          e.preventDefault();
          nextIdx = 0;
        } else if (key === 'End') {
          e.preventDefault();
          nextIdx = filterBtns.length - 1;
        }
        if (nextIdx !== idx) {
          filterBtns[nextIdx].focus();
          filterBtns[nextIdx].click();
        }
      });
    });
  }

  function run() {
    init();
  }

  document.addEventListener('courses-loaded', function() {
    var filterBar = document.getElementById('filtres-cours');
    if (filterBar) {
      filterBar.removeAttribute('data-filters-initialized');
    }
    run();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
