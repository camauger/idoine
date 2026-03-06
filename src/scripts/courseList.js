/**
 * courseList.js - Charge la liste des cours depuis l'API et affiche les cartes
 * window.ATELIER_API_URL (injecté au build) : si vide, appels en même origine (/api/cours) pour netlify dev ou prod.
 * Pour le backend local : définir ATELIER_API_URL=http://127.0.0.1:8000 dans .env avant le build.
 */
(function () {
  var API_URL = (typeof window !== 'undefined' && window.ATELIER_API_URL != null) ? (window.ATELIER_API_URL || '') : '';

  var GRID_IDS = {
    ceramique_regulier: 'grid-ceramique',
    ceramique_intensif: 'grid-intensif',
    ceramique_enfants: 'grid-enfants',
    vitrail: 'grid-vitrail',
    mosaique: 'grid-mosaique'
  };

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function sectionKey(c) {
    var d = (c.discipline || '').toLowerCase();
    var t = (c.type_cours || '').toLowerCase();
    if (d === 'ceramique' || d === 'céramique') {
      if (t === 'intensif') return 'ceramique_intensif';
      if (t === 'enfants') return 'ceramique_enfants';
      return 'ceramique_regulier';
    }
    if (d === 'vitrail') return 'vitrail';
    if (d === 'mosaique' || d === 'mosaïque') return 'mosaique';
    return 'ceramique_regulier';
  }

  function badgeClass(discipline) {
    var d = (discipline || '').toLowerCase();
    if (d === 'vitrail') return 'badge-vitrail';
    if (d === 'mosaique' || d === 'mosaïque') return 'badge-mosaique';
    return 'badge-ceramique';
  }

  function labelDiscipline(discipline) {
    var d = (discipline || '').toLowerCase();
    if (d === 'vitrail') return 'Vitrail';
    if (d === 'mosaique' || d === 'mosaïque') return 'Mosaïque';
    return 'Céramique';
  }

  function buildCard(c) {
    var category = (c.discipline || '').toLowerCase() + ' ' + (c.type_cours || '').toLowerCase();
    var full = c.places_restantes === 0;
    var availClass = full ? 'course-availability full' : 'course-availability available';
    var availText = full ? 'Complet' : (c.places_restantes === 1 ? '1 place restante' : c.places_restantes + ' places restantes');

    // Jour + heure uniquement (AM/PM/SOIR déjà compris dans l'heure)
    var horaireParts = [c.jour, c.heure].filter(Boolean);
    var horaire = horaireParts.length ? horaireParts.join(' – ') : '';

    var badges = '<span class="course-badge ' + badgeClass(c.discipline) + '">' + esc(labelDiscipline(c.discipline)) + '</span>';
    if ((c.type_cours || '').toLowerCase() === 'intensif') badges += ' <span class="course-badge badge-intensif">Intensif</span>';
    if ((c.type_cours || '').toLowerCase() === 'enfants') badges += ' <span class="course-badge badge-enfants">Enfants</span>';
    if (c.badge_new) badges += ' <span class="course-badge badge-new">Nouveau</span>';

    var details = '';
    if (horaire) details += '<div class="course-detail"><span class="detail-label">Horaire</span><span class="detail-value">' + esc(horaire) + '</span></div>';
    if (c.date_debut) details += '<div class="course-detail"><span class="detail-label">Début</span><span class="detail-value">' + esc(c.date_debut) + '</span></div>';
    if (c.duree_semaines) details += '<div class="course-detail"><span class="detail-label">Durée</span><span class="detail-value">' + esc(c.duree_semaines) + ' semaines</span></div>';
    if (c.prof) details += '<div class="course-detail"><span class="detail-label">Professeur</span><span class="detail-value">' + esc(c.prof) + '</span></div>';
    if (!horaire && !c.date_debut && !c.duree_semaines && !c.prof) details += '<div class="course-detail"><span class="detail-label">Places</span><span class="detail-value">' + (c.places_max || 0) + ' max.</span></div>';

    var desc = c.description ? esc(c.description) : 'Cours à l\'Atelier St-Elme. Inscription via le formulaire en ligne.';
    var prix = (c.prix || '').trim();
    var prixStr = prix.toLowerCase();
    var amount = prix;
    var taxLine = '';
    if (prix) {
      var idx = prix.indexOf(' (');
      if (idx !== -1) {
        amount = prix.slice(0, idx).trim();
        taxLine = prix.slice(idx).trim();
      } else {
        idx = prix.indexOf(' non taxable');
        if (idx !== -1) {
          amount = prix.slice(0, idx).trim();
          taxLine = '(non taxable)';
        } else if (!/non taxable|taxes incluses|taxes en sus|incluses/.test(prixStr)) {
          taxLine = '+ taxes';
        }
      }
    }
    var prixHtml = '';
    if (prix) {
      prixHtml = '<span class="price-amount">' + esc(amount) + '</span>';
      if (taxLine) prixHtml += '<span class="price-tax-line">' + esc(taxLine) + '</span>';
    } else {
      prixHtml = '<span class="price-note">Sur demande</span>';
    }

    var ctaHtml;
    if (full) {
      ctaHtml = '<span class="btn btn-outline btn-sm disabled">Complet</span>';
    } else {
      var inscUrl = '/inscription?cours=' + encodeURIComponent(c.nom || '');
      ctaHtml = '<a href="' + inscUrl + '" class="btn btn-primary btn-sm">S\'inscrire</a>';
    }
    if (c.page_dediee) {
      ctaHtml = '<a href="/' + esc(c.page_dediee) + '/" class="btn btn-outline btn-sm">En savoir plus</a> ' + ctaHtml;
    }

    return '<article class="course-card" data-category="' + esc(category) + '">' +
      '<header class="course-card-header">' +
        '<div class="course-badges">' + badges + '</div>' +
        '<span class="' + availClass + '">' + esc(availText) + '</span>' +
      '</header>' +
      '<div class="course-card-body">' +
        '<h3 class="course-title">' + esc(c.nom) + '</h3>' +
        '<p class="course-description">' + desc + '</p>' +
        '<div class="course-details">' + details + '</div>' +
      '</div>' +
      '<footer class="course-card-footer">' +
        '<div class="course-price">' + prixHtml + '</div>' +
        '<div class="course-cta">' + ctaHtml + '</div>' +
      '</footer>' +
    '</article>';
  }

  function init() {
    var loadingEl = document.getElementById('courses-loading');
    var fallbackEl = document.getElementById('courses-fallback');

    fetch(API_URL + '/api/cours')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('API error')); })
      .then(function (cours) {
        if (loadingEl) loadingEl.style.display = 'none';
        if (!cours || !cours.length) {
          if (fallbackEl) fallbackEl.style.display = 'block';
          window.dispatchEvent(new CustomEvent('courses-loaded'));
          return;
        }

        var bySection = {};
        Object.keys(GRID_IDS).forEach(function (k) { bySection[k] = []; });
        cours.forEach(function (c) {
          var key = sectionKey(c);
          if (bySection[key]) bySection[key].push(c);
        });

        Object.keys(GRID_IDS).forEach(function (key) {
          var gridId = GRID_IDS[key];
          var grid = document.getElementById(gridId);
          var section = grid && grid.closest('section');
          var list = bySection[key] || [];
          if (grid) {
            grid.innerHTML = list.map(buildCard).join('');
            if (section) section.style.display = list.length ? '' : 'none';
          }
        });

        if (fallbackEl) fallbackEl.style.display = 'none';
        window.dispatchEvent(new CustomEvent('courses-loaded'));
      })
      .catch(function () {
        if (loadingEl) loadingEl.style.display = 'none';
        if (fallbackEl) fallbackEl.style.display = 'block';
        window.dispatchEvent(new CustomEvent('courses-loaded'));
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
