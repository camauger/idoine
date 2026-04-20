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
          if (!titleEl) return;

          if (card.classList.contains('course-card-grouped')) {
            var availabilityEl = card.querySelector('.course-card-header .course-availability');
            var slotLines = card.querySelectorAll('.course-slot-line[data-course-id]');
            var sumRestantes = 0;
            slotLines.forEach(function (line) {
              var idAttr = line.getAttribute('data-course-id');
              var course = idAttr ? cours.find(function (c) { return String(c.id) === idAttr; }) : null;
              var slotAvail = line.querySelector('.course-slot-availability');
              var signupLink = line.querySelector('a[href*="inscription"]');
              if (!course || !slotAvail) return;
              var restantes = course.places_restantes;
              sumRestantes += Math.max(0, restantes | 0);
              if (restantes === 0) {
                slotAvail.textContent = 'Complet';
                slotAvail.className = 'course-slot-availability course-availability full';
                if (signupLink && signupLink.parentNode) {
                  var span = document.createElement('span');
                  span.className = 'btn btn-outline btn-sm disabled';
                  span.textContent = 'Complet';
                  signupLink.parentNode.replaceChild(span, signupLink);
                }
              } else {
                slotAvail.className = 'course-slot-availability course-availability available';
                slotAvail.textContent = restantes === 1 ? '1 place' : restantes + ' places';
              }
            });
            if (availabilityEl) {
              var allFull = slotLines.length > 0 && Array.prototype.every.call(slotLines, function (line) {
                var idAttr = line.getAttribute('data-course-id');
                var course = idAttr ? cours.find(function (c) { return String(c.id) === idAttr; }) : null;
                return course && (course.places_restantes | 0) === 0;
              });
              if (allFull) {
                availabilityEl.textContent = 'Complet';
                availabilityEl.className = 'course-availability full';
              } else {
                availabilityEl.className = 'course-availability available';
                availabilityEl.textContent = sumRestantes === 1 ? '1 place au total' : sumRestantes + ' places au total';
              }
            }
            return;
          }

          var availabilityEl = card.querySelector('.course-availability');
          var btnWrap = card.querySelector('.course-cta, .course-card-footer');
          var signupLink = btnWrap ? btnWrap.querySelector('a[href*="inscription"]') : null;

          if (!availabilityEl) return;

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
