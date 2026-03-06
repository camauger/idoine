/**
 * inscriptionApi.js - Charge les cours depuis l'API et envoie le formulaire vers l'API (BD)
 * Liste des cours : GET /api/cours. Envoi : POST /api/inscriptions.
 * Si window.ATELIER_API_URL est défini, les appels vont vers cette origine ; sinon même origine (ex. Netlify Function).
 */
(function () {
  var API_URL = (typeof window !== 'undefined' && window.ATELIER_API_URL != null) ? (window.ATELIER_API_URL || '') : '';

  function byDisciplineType(c) {
    if (c.discipline === 'ceramique' && c.type_cours === 'regulier') return 'Céramique - Sessions régulières';
    if (c.discipline === 'ceramique' && c.type_cours === 'intensif') return 'Céramique - Intensifs';
    if (c.discipline === 'ceramique' && c.type_cours === 'enfants') return 'Céramique - Enfants';
    if (c.discipline === 'vitrail') return 'Vitrail';
    if (c.discipline === 'mosaique') return 'Mosaïque';
    return c.discipline || 'Autres';
  }

  function formatApiError(detail) {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length) {
      return detail.map(function (e) {
        var loc = (e.loc && e.loc.slice(-1)[0]) || '';
        return (loc ? loc + ' : ' : '') + (e.msg || e.message || '');
      }).join('\n');
    }
    return 'Erreur lors de l\'inscription.';
  }

  function init() {
    var form = document.getElementById('inscription-form');
    var select = document.getElementById('cours');
    var submitBtn = form && form.querySelector('button[type="submit"]');
    if (!form || !select) return;

    fetch(API_URL + '/api/cours')
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(function (cours) {
          if (!cours.length) return;
          var groups = {};
          cours.forEach(function (c) {
            var label = byDisciplineType(c);
            if (!groups[label]) groups[label] = [];
            groups[label].push(c);
          });
          var order = ['Céramique - Sessions régulières', 'Céramique - Intensifs', 'Céramique - Enfants', 'Vitrail', 'Mosaïque', 'Autres'];
          select.innerHTML = '<option value="">Choisissez un cours...</option>';
          order.forEach(function (label) {
            if (!groups[label]) return;
            var optgroup = document.createElement('optgroup');
            optgroup.label = label;
            groups[label].forEach(function (c) {
              var opt = document.createElement('option');
              opt.value = String(c.id);
              opt.setAttribute('data-cours', c.nom || '');
              opt.textContent = c.places_restantes === 0 ? c.nom + ' (complet)' : (c.nom + (c.date_debut ? ' - ' + c.date_debut : '') + (c.heure ? ' ' + c.heure : ''));
              opt.disabled = c.places_restantes === 0;
              optgroup.appendChild(opt);
            });
            select.appendChild(optgroup);
          });
          var urlParams = new URLSearchParams(window.location.search);
          var coursParam = urlParams.get('cours');
          if (coursParam) {
            var decoded = decodeURIComponent(coursParam).trim();
            for (var i = 0; i < select.options.length; i++) {
              var o = select.options[i];
              if (o.value && (o.getAttribute('data-cours') === decoded || o.value === decoded)) {
                select.selectedIndex = i;
                break;
              }
            }
          }
        })
        .catch(function () {});

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var coursVal = (select.value || '').trim();
      if (!coursVal) {
        alert('Veuillez choisir un cours.');
        return;
      }
      var fd = new FormData(form);
      var body = {
        nom: (fd.get('nom') || '').trim(),
        courriel: (fd.get('courriel') || '').trim(),
        telephone: (fd.get('telephone') || '').trim(),
        enfant: (fd.get('enfant') || '').trim() || null,
        message: (fd.get('message') || '').trim() || null,
        newsletter: fd.get('newsletter') === 'oui'
      };
      if (/^\d+$/.test(coursVal)) {
        body.course_id = parseInt(coursVal, 10);
      } else {
        body.cours = coursVal;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Envoi en cours…';
      }
      fetch(API_URL + '/api/inscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) {
            if (r.ok) {
              window.location.href = '/inscription-merci/';
              return;
            }
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Envoyer ma demande d\'inscription';
            }
            alert(formatApiError(data.detail || 'Erreur lors de l\'inscription.'));
          });
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Envoyer ma demande d\'inscription';
          }
          alert('Impossible de contacter le serveur. Vérifiez que l\'API est démarrée (backend). Vous pouvez nous écrire à atelierstelme@gmail.com');
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
