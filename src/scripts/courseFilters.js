/**
 * courseFilters.js - Ancres vers les sections de cours + barre de filtres
 * Les ancres fonctionnent même sans barre de filtres (scroll direct vers l'id).
 */
(function () {
  var SECTION_IDS = ['ceramique', 'vitrail', 'mosaique', 'intensif', 'enfants', 'filtres-cours'];
  var ANCHOR_MAP = {
    all: 'filtres-cours',
    ceramique: 'ceramique',
    vitrail: 'vitrail',
    mosaique: 'mosaique',
    intensif: 'intensif',
    enfants: 'enfants'
  };

  function hashToFilter(hash) {
    var id = (hash || '').replace(/^#/, '');
    var map = { filtres-cours: 'all', ceramique: 'ceramique', vitrail: 'vitrail', mosaique: 'mosaique', intensif: 'intensif', enfants: 'enfants' };
    return map[id] || null;
  }

  function isSectionId(id) {
    return SECTION_IDS.indexOf(id) !== -1;
  }

  /** Roule vers l'élément d'id donné et affiche la section si elle est masquée. */
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var section = el.id === id && el.classList && el.classList.contains('courses-section') ? el : (el.closest && el.closest('section'));
    if (section && section.classList && section.classList.contains('courses-section')) {
      section.style.setProperty('display', '');
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Applique le hash courant : scroll vers la section (indépendant de la barre de filtres). */
  function applyHash() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    if (!hash || !isSectionId(hash)) return;
    scrollToId(hash);
  }

  /** Applique le hash après un court délai (pour laisser le DOM se mettre à jour). */
  function applyHashSoon() {
    applyHash();
    setTimeout(applyHash, 100);
    setTimeout(applyHash, 500);
  }

  function setActiveTab(btn, filterBtns) {
    if (!filterBtns || !filterBtns.length) return;
    filterBtns.forEach(function (b) {
      var isActive = b === btn;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function goToSection(filter, filterBtns) {
    if (filterBtns && filterBtns.length) {
      var btn = Array.prototype.find.call(filterBtns, function (b) {
        return (b.getAttribute('data-filter') || '') === filter;
      }) || filterBtns[0];
      setActiveTab(btn, filterBtns);
    }
    var anchorId = ANCHOR_MAP[filter];
    if (anchorId) {
      scrollToId(anchorId);
      var hash = filter === 'all' ? '' : anchorId;
      if (window.history.replaceState) {
        window.history.replaceState(null, '', hash ? '#' + hash : window.location.pathname);
      } else {
        window.location.hash = hash;
      }
    }
  }

  function init() {
    var filterBar = document.getElementById('filtres-cours');
    var filterBtns = filterBar ? filterBar.querySelectorAll('.filter-btn') : [];

    // --- Ancres : toujours actives si on a un hash de section ---
    applyHashSoon();
    window.addEventListener('hashchange', applyHashSoon);

    if (!filterBar || !filterBtns.length) return;

    var alreadyInit = filterBar.getAttribute('data-filters-initialized') === 'true';
    if (!alreadyInit) filterBar.setAttribute('data-filters-initialized', 'true');

    filterBtns.forEach(function (b) {
      var isActive = b.classList.contains('active');
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    var filterFromHash = hashToFilter(window.location.hash);
    if (filterFromHash) goToSection(filterFromHash, filterBtns);

    if (alreadyInit) {
      if (filterFromHash) goToSection(filterFromHash, filterBtns);
      return;
    }

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
