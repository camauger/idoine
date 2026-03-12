/**
 * courseDetailForm.js - Formulaire d'inscription pour pages de cours dédiées
 * Charge uniquement les cours liés à la page (via page_dediee)
 */
(function() {
  'use strict';

  var API_URL = (typeof window !== 'undefined' && window.ATELIER_API_URL != null) 
    ? (window.ATELIER_API_URL || '') 
    : '';

  function buildOptionLabel(c) {
    var parts = [];
    if (c.date_debut) parts.push(c.date_debut);
    if (c.jour) parts.push(c.jour);
    if (c.heure) parts.push(c.heure);
    return parts.join(' - ') || c.nom;
  }

  function buildOptionValue(c) {
    var value = c.nom;
    if (c.date_debut) {
      value += ' - ' + c.date_debut;
    }
    if (c.jour && c.heure) {
      value += ' (' + c.jour + ' ' + c.heure + ')';
    }
    return value;
  }

  function populateDropdown(selectElement, courses) {
    selectElement.innerHTML = '';
    
    if (!courses || courses.length === 0) {
      var noOption = document.createElement('option');
      noOption.value = '';
      noOption.textContent = 'Aucune date disponible';
      selectElement.appendChild(noOption);
      return;
    }

    if (courses.length === 1) {
      var singleOption = document.createElement('option');
      singleOption.value = buildOptionValue(courses[0]);
      singleOption.textContent = buildOptionLabel(courses[0]);
      singleOption.selected = true;
      singleOption.setAttribute('data-course-id', courses[0].id);
      selectElement.appendChild(singleOption);
      return;
    }

    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Choisissez une date...';
    selectElement.appendChild(defaultOption);

    courses.forEach(function(c) {
      var option = document.createElement('option');
      option.value = buildOptionValue(c);
      option.textContent = buildOptionLabel(c);
      option.setAttribute('data-course-id', c.id);
      
      if (c.places_restantes === 0) {
        option.textContent += ' [COMPLET]';
        option.disabled = true;
      } else if (c.places_restantes <= 2) {
        option.textContent += ' [' + c.places_restantes + ' place(s)]';
      }

      selectElement.appendChild(option);
    });
  }

  function showError(selectElement) {
    selectElement.innerHTML = '<option value="">Erreur de chargement...</option>';
    var errorEl = document.getElementById('cours-error');
    if (errorEl) errorEl.style.display = 'block';
  }

  function init() {
    var selectElement = document.getElementById('cours');
    if (!selectElement) return;

    var pageSlug = selectElement.getAttribute('data-page-slug');
    if (!pageSlug) {
      console.warn('[CourseDetailForm] data-page-slug non défini');
      return;
    }

    fetch(API_URL + '/api/cours')
      .then(function(r) {
        if (!r.ok) throw new Error('API error: ' + r.status);
        return r.json();
      })
      .then(function(allCourses) {
        var filteredCourses = allCourses.filter(function(c) {
          return c.page_dediee === pageSlug && c.actif !== false;
        });

        filteredCourses.sort(function(a, b) {
          var dateA = a.date_debut || '';
          var dateB = b.date_debut || '';
          return dateA.localeCompare(dateB);
        });

        populateDropdown(selectElement, filteredCourses);
      })
      .catch(function(err) {
        console.error('[CourseDetailForm] Erreur:', err);
        showError(selectElement);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
