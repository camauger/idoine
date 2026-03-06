/**
 * courseFilters.js - Navigation par ancre sur la page des cours
 * Au clic sur un bouton : mise à jour de l'onglet actif et défilement vers la section.
 * Aucun masquage de cartes (navigation uniquement).
 */
(function () {
  var ANCHOR_MAP = {
    all: 'filtres-cours',
    ceramique: 'ceramique',
    vitrail: 'vitrail',
    mosaique: 'mosaique',
    intensif: 'intensif',
    enfants: 'enfants'
  };

  function scrollToAnchor(id) {
    var el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setActiveTab(btn, filterBtns) {
    filterBtns.forEach(function (b) {
      var isActive = b === btn;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function goToSection(filter, filterBtns) {
    setActiveTab(
      Array.prototype.find.call(filterBtns, function (b) {
        return (b.getAttribute('data-filter') || '') === filter;
      }) || filterBtns[0],
      filterBtns
    );
    var anchorId = ANCHOR_MAP[filter];
    if (anchorId) scrollToAnchor(anchorId);
  }

  function init() {
    var filterBar = document.getElementById('filtres-cours');
    var filterBtns = filterBar ? filterBar.querySelectorAll('.filter-btn') : [];
    if (!filterBtns.length) return;

    if (filterBar.getAttribute('data-filters-initialized') === 'true') return;
    filterBar.setAttribute('data-filters-initialized', 'true');

    filterBtns.forEach(function (b) {
      var isActive = b.classList.contains('active');
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = this.getAttribute('data-filter') || 'all';
        goToSection(filter, filterBtns);
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
          var f = filterBtns[nextIdx].getAttribute('data-filter') || 'all';
          goToSection(f, filterBtns);
        }
      });
    });
  }

  function run() {
    init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  document.addEventListener('courses-loaded', run);
})();
