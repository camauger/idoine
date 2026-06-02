/**
 * courseDetailForm.js - Formulaire d'inscription pour pages de cours dédiées
 * Charge uniquement les cours liés à la page (via page_dediee), réservables uniquement.
 */
(function () {
  'use strict';

  var API_URL =
    typeof window !== 'undefined' && window.ATELIER_API_URL != null
      ? window.ATELIER_API_URL || ''
      : '';

  function isBookable(c) {
    if (c.actif === false) return false;
    var pr = c.places_restantes;
    if (pr == null) return true;
    return Number(pr) > 0;
  }

  function getClosureMessage(linkedAll) {
    if (!linkedAll.length) {
      return 'Aucune session n’est associée à cette page pour le moment.';
    }
    var activeCourses = linkedAll.filter(function (c) {
      return c.actif !== false;
    });
    if (!activeCourses.length) {
      return 'Les inscriptions ne sont pas ouvertes pour ce cours.';
    }
    var allActiveFull = activeCourses.every(function (c) {
      var pr = c.places_restantes;
      return pr != null && Number(pr) === 0;
    });
    if (allActiveFull) {
      return 'Ce cours est complet. Aucune place n’est disponible pour le moment.';
    }
    return 'Il n’y a actuellement aucune place disponible pour ce cours.';
  }

  function applyFormClosedState(message) {
    var notice = document.getElementById('inscription-unavailable');
    var wrap = document.getElementById('inscription-form-wrap');
    if (notice) {
      notice.textContent = message;
      notice.hidden = false;
    }
    if (wrap) wrap.hidden = true;
  }

  function buildOptionLabel(c) {
    var parts = [];
    if (c.date_debut) parts.push(c.date_debut);
    if (c.jour) parts.push(c.jour);
    if (c.heure) parts.push(c.heure);
    return parts.join(' - ') || c.nom;
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
      var c0 = courses[0];
      singleOption.value = String(c0.id);
      singleOption.textContent = buildOptionLabel(c0);
      singleOption.selected = true;
      singleOption.setAttribute('data-course-id', c0.id);
      singleOption.setAttribute(
        'data-places-restantes',
        String(c0.places_restantes != null ? c0.places_restantes : 0)
      );
      selectElement.appendChild(singleOption);
      return;
    }

    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Choisissez une date...';
    selectElement.appendChild(defaultOption);

    courses.forEach(function (c) {
      var option = document.createElement('option');
      option.value = String(c.id);
      option.textContent = buildOptionLabel(c);
      option.setAttribute('data-course-id', c.id);

      if (c.places_restantes != null && c.places_restantes <= 2) {
        option.textContent += ' [' + c.places_restantes + ' place(s)]';
      }

      option.setAttribute(
        'data-places-restantes',
        String(c.places_restantes != null ? c.places_restantes : 0)
      );

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

    fetch(API_URL + '/api/cours', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('API error: ' + r.status);
        return r.json();
      })
      .then(function (allCourses) {
        var linkedAll = (allCourses || []).filter(function (c) {
          return c.page_dediee === pageSlug;
        });
        var bookable = linkedAll.filter(isBookable);

        if (bookable.length === 0) {
          applyFormClosedState(getClosureMessage(linkedAll));
          return;
        }

        bookable.sort(function (a, b) {
          var dateA = a.date_debut || '';
          var dateB = b.date_debut || '';
          return dateA.localeCompare(dateB);
        });

        populateDropdown(selectElement, bookable);

        var urlParams = new URLSearchParams(window.location.search);
        var cid = urlParams.get('course_id');
        if (cid && /^\d+$/.test(String(cid).trim())) {
          var want = String(cid).trim();
          for (var oi = 0; oi < selectElement.options.length; oi++) {
            if (selectElement.options[oi].value === want) {
              selectElement.selectedIndex = oi;
              break;
            }
          }
        }

        if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
        selectElement.addEventListener('change', function () {
          if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
        });
      })
      .catch(function (err) {
        console.error('[CourseDetailForm] Erreur:', err);
        showError(selectElement);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      init();
    });
  } else {
    init();
  }
})();
