/**
 * courseDetailCta.js — Masque le CTA « S'inscrire » sur les pages course-detail
 * lorsqu'aucune session liée (page_dediee) n'est réservable (actif + places).
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

  function init() {
    var section = document.querySelector('.section-cta-registration[data-page-slug]');
    if (!section) return;
    var slug = section.getAttribute('data-page-slug');
    var banner = document.getElementById('course-cta-banner');
    var msgEl = document.getElementById('course-cta-message');
    if (!slug || !banner) return;

    fetch(API_URL + '/api/cours', { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('API error: ' + r.status);
        return r.json();
      })
      .then(function (allCourses) {
        var linkedAll = (allCourses || []).filter(function (c) {
          return c.page_dediee === slug;
        });
        var bookable = linkedAll.filter(isBookable);
        if (bookable.length > 0) return;
        banner.hidden = true;
        if (msgEl) {
          msgEl.textContent = getClosureMessage(linkedAll);
          msgEl.hidden = false;
        }
      })
      .catch(function (err) {
        console.warn('[CourseDetailCta]', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
