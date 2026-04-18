/**
 * courseDetailSessions.js — Tableau des créneaux (jour, période, heure, places)
 * pour les pages de cours liées à l’API (page_dediee). Complète le CTA / formulaire.
 */
(function () {
  'use strict';

  var API_URL =
    typeof window !== 'undefined' && window.ATELIER_API_URL != null
      ? window.ATELIER_API_URL || ''
      : '';

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function creneauLabel(raw) {
    if (raw == null || raw === '') return '—';
    var x = String(raw).toLowerCase();
    if (x === 'matin') return 'Matin';
    if (x.indexOf('après') !== -1 || x === 'apres-midi' || x === 'apres-midi') return 'Après-midi';
    if (x === 'soir') return 'Soir';
    return String(raw);
  }

  function capitalizeDay(j) {
    if (!j) return '—';
    var s = String(j).trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function placesCell(c) {
    if (c.actif === false) return '—';
    var pr = c.places_restantes;
    if (pr == null) return '—';
    if (Number(pr) === 0) return 'Complet';
    return pr === 1 ? '1 place' : pr + ' places';
  }

  function init() {
    var container = document.getElementById('course-sessions-summary');
    if (!container) return;
    var slug = container.getAttribute('data-page-slug');
    var section = document.getElementById('creneaux-cours');
    if (!slug) {
      if (section) section.hidden = true;
      return;
    }

    fetch(API_URL + '/api/cours', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('API error: ' + r.status);
        return r.json();
      })
      .then(function (all) {
        var linked = (all || []).filter(function (c) {
          return c.page_dediee === slug;
        });
        if (!linked.length) {
          if (section) section.hidden = true;
          return;
        }

        linked.sort(function (a, b) {
          var ja = (a.jour || '') + (a.creneau || '') + (a.heure || '');
          var jb = (b.jour || '') + (b.creneau || '') + (b.heure || '');
          return ja.localeCompare(jb, 'fr');
        });

        var rows = linked
          .map(function (c) {
            return (
              '<tr>' +
              '<td>' +
              esc(capitalizeDay(c.jour)) +
              '</td>' +
              '<td>' +
              esc(creneauLabel(c.creneau)) +
              '</td>' +
              '<td>' +
              esc(c.heure || '—') +
              '</td>' +
              '<td>' +
              esc(c.date_debut || '—') +
              '</td>' +
              '<td>' +
              esc(placesCell(c)) +
              '</td>' +
              '</tr>'
            );
          })
          .join('');

        container.innerHTML =
          '<div class="course-sessions-table-wrap">' +
          '<table class="course-sessions-table">' +
          '<caption class="visually-hidden">Disponibilité par créneau pour ce cours</caption>' +
          '<thead><tr>' +
          '<th scope="col">Jour</th>' +
          '<th scope="col">Période</th>' +
          '<th scope="col">Heure</th>' +
          '<th scope="col">Début</th>' +
          '<th scope="col">Places</th>' +
          '</tr></thead>' +
          '<tbody>' +
          rows +
          '</tbody></table></div>' +
          '<p class="course-sessions-note">Inscription pour un créneau précis (jour et période), selon les places disponibles.</p>';

        if (section) section.hidden = false;
      })
      .catch(function () {
        if (section) section.hidden = true;
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
