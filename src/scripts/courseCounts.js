/**
 * courseCounts.js - Affiche les places restantes en temps réel depuis l'API
 * Nécessite window.ATELIER_API_URL (optionnel, '' = même origine)
 */
(function () {
  var API_URL = (typeof window !== 'undefined' && window.ATELIER_API_URL) || '';

  function init() {
    var cards = document.querySelectorAll('.course-card[data-category]');
    if (!cards.length) return;

    fetch(API_URL + '/api/cours', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('API error')); })
      .then(function (cours) {
        cards.forEach(function (card) {
          var titleEl = card.querySelector('.course-title');
          var availabilityEl = card.querySelector('.course-availability');
          var btnWrap = card.querySelector('.course-cta, .course-card-footer');
          var signupLink = btnWrap ? btnWrap.querySelector('a[href*="inscription"]') : null;

          if (!titleEl || !availabilityEl) return;

          var idAttr = card.getAttribute('data-course-id');
          var course = null;
          if (idAttr != null && idAttr !== '') {
            course = cours.find(function (c) {
              return String(c.id) === idAttr;
            });
          }
          if (!course) {
            var title = titleEl.textContent.trim();
            course = cours.find(function (c) {
              return c.nom && c.nom.trim() === title;
            });
          }

          if (!course) return;

          var restantes = course.places_restantes;
          if (restantes === 0) {
            availabilityEl.textContent = 'Complet';
            availabilityEl.className = 'course-availability full';
            if (signupLink) {
              var span = document.createElement('span');
              span.className = 'btn btn-outline btn-sm disabled';
              span.textContent = 'Complet';
              signupLink.parentNode.replaceChild(span, signupLink);
            }
          } else {
            availabilityEl.className = 'course-availability available';
            availabilityEl.textContent = restantes === 1 ? '1 place restante' : restantes + ' places restantes';
          }
        });
      })
      .catch(function () { /* silent: keep static content */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
