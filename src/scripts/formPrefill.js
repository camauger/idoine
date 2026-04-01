/**
 * Form Prefill Script - Atelier St-Elme
 * Charge les cours depuis l'API et pré-remplit le formulaire d'inscription
 */

(function() {
  'use strict';

  var API_URL = (typeof window !== 'undefined' && window.ATELIER_API_URL != null) 
    ? (window.ATELIER_API_URL || '') 
    : '';

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getSectionKey(c) {
    var d = (c.discipline || '').toLowerCase();
    var t = (c.type_cours || '').toLowerCase();
    if (d === 'ceramique' || d === 'céramique') {
      if (t === 'intensif') return 'ceramique_intensif';
      if (t === 'enfants') return 'ceramique_enfants';
      return 'ceramique_regulier';
    }
    if (d === 'vitrail') {
      if (t === 'intensif') return 'vitrail_intensif';
      return 'vitrail_regulier';
    }
    if (d === 'mosaique' || d === 'mosaïque') return 'mosaique';
    return 'autre';
  }

  var SECTION_LABELS = {
    ceramique_regulier: 'Céramique - Sessions régulières',
    ceramique_intensif: 'Céramique - Ateliers intensifs',
    ceramique_enfants: 'Céramique - Cours enfants',
    vitrail_regulier: 'Vitrail - Sessions régulières',
    vitrail_intensif: 'Vitrail - Ateliers intensifs',
    mosaique: 'Mosaïque',
    autre: 'Autres cours'
  };

  var SECTION_ORDER = [
    'ceramique_regulier',
    'ceramique_intensif', 
    'ceramique_enfants',
    'vitrail_regulier',
    'vitrail_intensif',
    'mosaique',
    'autre'
  ];

  function buildOptionLabel(c) {
    var parts = [c.nom];
    var details = [];
    if (c.date_debut) details.push(c.date_debut);
    if (c.jour) details.push(c.jour);
    if (c.heure) details.push(c.heure);
    if (details.length > 0) {
      parts.push('(' + details.join(' - ') + ')');
    }
    return parts.join(' ');
  }

  function buildOptionValue(c) {
    // Include name and date to uniquely identify the course
    var value = c.nom;
    if (c.date_debut) {
      value += ' - ' + c.date_debut;
    }
    if (c.jour && c.heure) {
      value += ' (' + c.jour + ' ' + c.heure + ')';
    }
    return value;
  }

  function populateDropdown(selectElement, courses, preselect) {
    selectElement.innerHTML = '';
    
    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Choisissez un cours...';
    selectElement.appendChild(defaultOption);

    var bySection = {};
    SECTION_ORDER.forEach(function(key) { bySection[key] = []; });

    courses.forEach(function(c) {
      if (!c.actif) return;
      var key = getSectionKey(c);
      if (!bySection[key]) bySection[key] = [];
      bySection[key].push(c);
    });

    var preselectedIndex = -1;
    var optionIndex = 1;

    SECTION_ORDER.forEach(function(key) {
      var list = bySection[key];
      if (!list || list.length === 0) return;

      var optgroup = document.createElement('optgroup');
      optgroup.label = SECTION_LABELS[key] || key;

      list.forEach(function(c) {
        var option = document.createElement('option');
        var optValue = buildOptionValue(c);
        option.value = optValue;
        option.textContent = buildOptionLabel(c);
        option.setAttribute('data-course-id', c.id);
        
        if (c.places_restantes === 0) {
          option.textContent += ' [COMPLET]';
          option.disabled = true;
        }

        optgroup.appendChild(option);

        if (preselect && (c.nom === preselect || optValue === preselect)) {
          preselectedIndex = optionIndex;
        }
        optionIndex++;
      });

      selectElement.appendChild(optgroup);
    });

    return preselectedIndex;
  }

  function showError(selectElement) {
    selectElement.innerHTML = '<option value="">Erreur de chargement...</option>';
    var errorEl = document.getElementById('cours-error');
    if (errorEl) errorEl.style.display = 'block';
  }

  function showPrefillNotice(coursName) {
    var formCard = document.querySelector('.form-card-header');
    if (formCard) {
      var notice = document.createElement('div');
      notice.className = 'prefill-notice';
      notice.innerHTML = '<strong>Cours sélectionné :</strong> ' + esc(coursName);
      formCard.appendChild(notice);
    }

    var formElement = document.getElementById('inscription-form');
    if (formElement) {
      setTimeout(function() {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }

  function init() {
    var selectElement = document.getElementById('cours');
    if (!selectElement) return;

    var urlParams = new URLSearchParams(window.location.search);
    var coursParam = urlParams.get('cours');
    var preselect = coursParam ? decodeURIComponent(coursParam) : null;

    fetch(API_URL + '/api/cours', { cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) throw new Error('API error: ' + r.status);
        return r.json();
      })
      .then(function(courses) {
        if (!courses || !courses.length) {
          showError(selectElement);
          return;
        }

        var preselectedIndex = populateDropdown(selectElement, courses, preselect);

        if (preselectedIndex > 0) {
          selectElement.selectedIndex = preselectedIndex;
          selectElement.classList.add('prefilled');
          showPrefillNotice(preselect);
        }
      })
      .catch(function(err) {
        console.error('[Inscription] Erreur chargement cours:', err);
        showError(selectElement);
      });
  }

  function attachSubmitGuard() {
    var form = document.getElementById('inscription-form');
    if (!form) return;
    form.addEventListener('submit', function () {
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Envoi en cours…';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
      attachSubmitGuard();
    });
  } else {
    init();
    attachSubmitGuard();
  }
})();
