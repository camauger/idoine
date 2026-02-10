/**
 * courseFilters.js - Filtrage des cartes de cours
 * Affiche ou masque les cartes selon le bouton de filtre actif et fait défiler vers l'ancre correspondante.
 */
(function () {
  var ANCHOR_MAP = {
    all: 'filtres-cours',
    ceramique: 'ceramique',
    vitrail: 'vitrail',
    intensif: 'intensif',
    enfants: 'enfants'
  };

  function scrollToAnchor(id) {
    var el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function init() {
    var filterBtns = document.querySelectorAll('.filter-bar .filter-btn');
    var cards = document.querySelectorAll('.course-card[data-category]');
    if (!filterBtns.length || !cards.length) return;

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = this.getAttribute('data-filter') || 'all';

        // Mettre à jour l'état actif des boutons
        filterBtns.forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });

        // Afficher ou masquer les cartes
        cards.forEach(function (card) {
          var category = (card.getAttribute('data-category') || '').toLowerCase();
          var match = filter === 'all' || category.indexOf(filter) !== -1;
          card.classList.toggle('hidden', !match);
        });

        // Défiler vers l'ancre correspondante
        var anchorId = ANCHOR_MAP[filter];
        if (anchorId) {
          scrollToAnchor(anchorId);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
