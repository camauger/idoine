/**
 * navCoursesVisibility.js - Masque les éléments de menu pour les disciplines sans cours
 * S'exécute sur toutes les pages pour mettre à jour dynamiquement le sous-menu "Cours"
 */
(function () {
  'use strict';

  var API_URL = (typeof window !== 'undefined' && window.ATELIER_API_URL != null) 
    ? (window.ATELIER_API_URL || '') 
    : '';

  var DISCIPLINE_MAP = {
    ceramique: ['ceramique', 'céramique'],
    vitrail: ['vitrail'],
    mosaique: ['mosaique', 'mosaïque'],
    intensif: [],
    enfants: []
  };

  function countBySection(courses) {
    var counts = {
      ceramique: 0,
      vitrail: 0,
      mosaique: 0,
      intensif: 0,
      enfants: 0
    };

    courses.forEach(function(c) {
      var d = (c.discipline || '').toLowerCase();
      var t = (c.type_cours || '').toLowerCase();

      if (t === 'intensif') {
        counts.intensif++;
      } else if (t === 'enfants') {
        counts.enfants++;
      } else if (d === 'vitrail') {
        counts.vitrail++;
      } else if (d === 'mosaique' || d === 'mosaïque') {
        counts.mosaique++;
      } else {
        counts.ceramique++;
      }
    });

    return counts;
  }

  function hideEmptyNavItems(counts) {
    var navSubmenus = document.querySelectorAll('.nav-submenu');
    
    navSubmenus.forEach(function(submenu) {
      var links = submenu.querySelectorAll('a[href*="#"]');
      
      links.forEach(function(link) {
        var href = link.getAttribute('href') || '';
        var hashMatch = href.match(/#(\w+)$/);
        if (!hashMatch) return;
        
        var sectionId = hashMatch[1];
        var hasContent = counts[sectionId] > 0;
        var li = link.closest('li');
        if (li) {
          li.style.display = hasContent ? '' : 'none';
        }
      });
    });
  }

  function init() {
    fetch(API_URL + '/api/cours', { cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) throw new Error('API error');
        return r.json();
      })
      .then(function(courses) {
        if (!courses || !courses.length) {
          hideEmptyNavItems({ ceramique: 0, vitrail: 0, mosaique: 0, intensif: 0, enfants: 0 });
          return;
        }
        var counts = countBySection(courses);
        hideEmptyNavItems(counts);
      })
      .catch(function() {
        // En cas d'erreur, ne pas masquer les éléments
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
