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

  // Cours indexés par id (String) pour alimenter le récapitulatif.
  var coursesById = {};

  // -- Helpers d'affichage du récapitulatif (alignés sur courseList.js) -------

  function creneauLabel(raw) {
    if (raw == null || raw === '') return '';
    var x = String(raw).toLowerCase();
    if (x === 'matin') return 'Matin';
    if (x.indexOf('après') !== -1 || x === 'apres-midi') return 'Après-midi';
    if (x === 'soir') return 'Soir';
    return String(raw);
  }

  function capitalizeDay(j) {
    if (!j) return '';
    var s = String(j).trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function labelDiscipline(discipline) {
    var d = (discipline || '').toLowerCase();
    if (d === 'vitrail') return 'Vitrail';
    if (d === 'mosaique' || d === 'mosaïque') return 'Mosaïque';
    return 'Céramique';
  }

  function badgeClass(discipline) {
    var d = (discipline || '').toLowerCase();
    if (d === 'vitrail') return 'badge-vitrail';
    if (d === 'mosaique' || d === 'mosaïque') return 'badge-mosaique';
    return 'badge-ceramique';
  }

  /** Sépare montant et mention de taxe, comme les cartes de cours. */
  function formatPrix(rawPrix) {
    var prix = (rawPrix || '').trim();
    if (!prix) return '<span class="price-note">Sur demande</span>';
    var prixStr = prix.toLowerCase();
    var amount = prix;
    var taxLine = '';
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
    var html = '<span class="price-amount">' + esc(amount) + '</span>';
    if (taxLine) html += ' <span class="price-tax-line">' + esc(taxLine) + '</span>';
    return html;
  }

  /** Clé de discipline pour l'accent visuel du récapitulatif. */
  function disciplineKey(discipline) {
    var d = (discipline || '').toLowerCase();
    if (d === 'vitrail') return 'vitrail';
    if (d === 'mosaique' || d === 'mosaïque') return 'mosaique';
    return 'ceramique';
  }

  function recapRow(icon, label, valueHtml) {
    return '<div class="cours-recap-row">' +
      '<dt class="cours-recap-label">' +
        '<i class="fa-solid ' + icon + '" aria-hidden="true"></i>' +
        '<span>' + esc(label) + '</span>' +
      '</dt>' +
      '<dd class="cours-recap-value">' + valueHtml + '</dd>' +
    '</div>';
  }

  /** Construit le récapitulatif complet d'un cours. */
  function buildRecapHtml(c) {
    var badges = '<span class="course-badge ' + badgeClass(c.discipline) + '">' + esc(labelDiscipline(c.discipline)) + '</span>';
    var t = (c.type_cours || '').toLowerCase();
    if (t === 'intensif') badges += ' <span class="course-badge badge-intensif">Intensif</span>';
    if (t === 'enfants') badges += ' <span class="course-badge badge-enfants">Enfants</span>';

    var horaireParts = [];
    if (c.jour) horaireParts.push(esc(capitalizeDay(c.jour)));
    if (c.creneau) horaireParts.push(esc(creneauLabel(c.creneau)));
    if (c.heure) horaireParts.push(esc(c.heure));

    var rows = '';
    if (horaireParts.length) rows += recapRow('fa-clock', 'Horaire', horaireParts.join(' · '));
    if (c.date_debut) rows += recapRow('fa-calendar', 'Début', esc(c.date_debut));
    if (c.duree_semaines) rows += recapRow('fa-hourglass-half', 'Durée', esc(c.duree_semaines) + ' semaines');
    rows += recapRow('fa-user', 'Professeur', c.prof ? esc(c.prof) : 'À confirmer');
    rows += recapRow('fa-tag', 'Prix', formatPrix(c.prix));

    var places;
    if (c.places_restantes === 0) {
      places = '<span class="cours-recap-full">Complet</span>';
    } else if (c.places_restantes != null) {
      places = esc(String(c.places_restantes)) + (c.places_restantes === 1 ? ' place restante' : ' places restantes');
    } else {
      places = (c.places_max || 0) + ' places max.';
    }
    rows += recapRow('fa-users', 'Places', places);

    var desc = (c.description || '').trim();
    var descHtml = desc
      ? '<p class="cours-recap-description">' + esc(desc) + '</p>'
      : '';

    return '<div class="cours-recap-card cours-recap-card--' + disciplineKey(c.discipline) + '">' +
      '<div class="cours-recap-head">' +
        '<div class="cours-recap-badges">' + badges + '</div>' +
        '<h3 class="cours-recap-title">' + esc(c.nom || 'Cours') + '</h3>' +
      '</div>' +
      '<dl class="cours-recap-details">' + rows + '</dl>' +
      descHtml +
    '</div>';
  }

  /**
   * Affiche la question « propre argile » seulement pour les cours de céramique.
   * Masquée : radios non requises et décochées pour ne pas bloquer la soumission.
   */
  function updateArgileGroup() {
    var group = document.getElementById('propre-argile-group');
    var sel = document.getElementById('cours');
    if (!group || !sel) return;
    var c = coursesById[sel.value];
    var show = !!c && disciplineKey(c.discipline) === 'ceramique';
    group.hidden = !show;
    var radios = group.querySelectorAll('input[type="radio"]');
    Array.prototype.forEach.call(radios, function (radio) {
      radio.required = show;
      if (!show) radio.checked = false;
    });
  }

  /** Rend le récapitulatif selon le cours actuellement sélectionné. */
  function renderRecapFromSelect() {
    var recap = document.getElementById('cours-recap');
    var sel = document.getElementById('cours');
    if (!recap || !sel) return;
    var c = coursesById[sel.value];
    if (!c) {
      recap.innerHTML = '<p class="cours-recap-empty">Sélectionnez un cours ci-dessus pour afficher le récapitulatif complet (horaire, professeur, description, prix).</p>';
      return;
    }
    recap.innerHTML = buildRecapHtml(c);
  }

  /**
   * Aligne les paramètres de l'URL (course_id / cours) sur le cours sélectionné,
   * sans recharger ni ajouter d'entrée d'historique. Évite qu'un rechargement,
   * un partage de lien ou un favori ne restaure l'ancien cours.
   */
  function updateUrlForSelection() {
    if (!window.history || !window.history.replaceState) return;
    var sel = document.getElementById('cours');
    if (!sel) return;
    var url = new URL(window.location.href);
    var c = coursesById[sel.value];
    if (c && c.id != null) {
      url.searchParams.set('course_id', String(c.id));
      if (c.nom) url.searchParams.set('cours', c.nom);
      else url.searchParams.delete('cours');
    } else {
      url.searchParams.delete('course_id');
      url.searchParams.delete('cours');
    }
    window.history.replaceState(window.history.state, '', url);
  }

  /** Aligné sur courseList.sectionKey : intensifs / enfants avant la discipline. */
  function getSectionKey(c) {
    var d = (c.discipline || '').toLowerCase();
    var t = (c.type_cours || '').toLowerCase();
    if (t === 'intensif') return 'ceramique_intensif';
    if (t === 'enfants') return 'ceramique_enfants';
    if (d === 'ceramique' || d === 'céramique') return 'ceramique_regulier';
    if (d === 'vitrail') return 'vitrail_regulier';
    if (d === 'mosaique' || d === 'mosaïque') return 'mosaique';
    return 'autre';
  }

  var SECTION_LABELS = {
    ceramique_regulier: 'Céramique - Sessions régulières',
    ceramique_intensif: 'Ateliers intensifs',
    ceramique_enfants: 'Céramique - Cours enfants',
    vitrail_regulier: 'Vitrail - Sessions régulières',
    mosaique: 'Mosaïque',
    autre: 'Autres cours'
  };

  var SECTION_ORDER = [
    'ceramique_regulier',
    'ceramique_intensif',
    'ceramique_enfants',
    'vitrail_regulier',
    'mosaique',
    'autre'
  ];

  /** Aligné sur courseList.matiereCeramiqueRegulier (inscription = choix du créneau précis). */
  function getMatiereKey(c) {
    var slug = (c.slug || '').toLowerCase();
    var nom = (c.nom || '').toLowerCase();
    var s = slug + ' ' + nom;
    if (/tournage/.test(s)) return 'tournage';
    if (/façonnage|faconnage/.test(s)) return 'faconnage';
    return 'autre';
  }

  var MATIERE_ORDER = ['tournage', 'faconnage', 'autre'];
  var MATIERE_LABELS = { tournage: 'Tournage', faconnage: 'Façonnage', autre: 'Autres' };

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

    function appendOptions(list, optgroupLabel) {
      var optgroup = document.createElement('optgroup');
      optgroup.label = optgroupLabel;

      list.forEach(function (c) {
        var option = document.createElement('option');
        var optValue = buildOptionValue(c);
        option.value = String(c.id);
        option.textContent = buildOptionLabel(c);
        option.setAttribute('data-course-id', c.id);
        option.setAttribute('data-cours-label', optValue);

        if (c.places_restantes === 0) {
          option.textContent += ' [COMPLET]';
          option.disabled = true;
        }

        option.setAttribute('data-places-restantes', String(c.places_restantes != null ? c.places_restantes : 0));

        optgroup.appendChild(option);

        // course_id en priorité si plusieurs créneaux partagent le même nom
        if (preselect && (
          String(c.id) === preselect ||
          optValue === preselect ||
          decodeURIComponent(preselect) === optValue ||
          c.nom === preselect
        )) {
          preselectedIndex = optionIndex;
        }
        optionIndex++;
      });

      selectElement.appendChild(optgroup);
    }

    SECTION_ORDER.forEach(function (key) {
      var list = bySection[key];
      if (!list || list.length === 0) return;

      if (key === 'ceramique_regulier') {
        var byM = { tournage: [], faconnage: [], autre: [] };
        list.forEach(function (c) {
          var mk = getMatiereKey(c);
          if (!byM[mk]) byM[mk] = [];
          byM[mk].push(c);
        });
        MATIERE_ORDER.forEach(function (mk) {
          var sub = byM[mk];
          if (!sub || !sub.length) return;
          var label = (SECTION_LABELS[key] || '') + ' — ' + (MATIERE_LABELS[mk] || mk);
          appendOptions(sub, label);
        });
        return;
      }

      appendOptions(list, SECTION_LABELS[key] || key);
    });

    return preselectedIndex;
  }

  /**
   * Mode « demande d'information » : quand aucun cours n'est disponible
   * (liste vide ou API en erreur), le formulaire reste utilisable et
   * l'envoi est étiqueté comme demande d'information (Netlify Forms).
   */
  function enableInfoRequestMode(selectElement) {
    selectElement.innerHTML = '';
    var opt = document.createElement('option');
    opt.value = "Demande d'information";
    opt.textContent = "Demande d'information";
    opt.selected = true;
    selectElement.appendChild(opt);
    if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();

    var recap = document.getElementById('cours-recap');
    if (recap) {
      recap.innerHTML = '<p class="cours-recap-empty">' +
        'Aucun cours n\u2019est ouvert aux inscriptions pour le moment. ' +
        'Vous pouvez tout de m\u00eame nous envoyer une demande d\u2019information : ' +
        'remplissez le formulaire et nous vous r\u00e9pondrons par courriel.' +
      '</p>';
    }

    var subject = document.querySelector('#inscription-form input[name="subject"]');
    if (subject) subject.value = "Demande d'information - Ateliers St-Elme";

    var submitBtn = document.querySelector('#inscription-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Envoyer ma demande d'information";
  }

  // Arrivée depuis une carte de cours : on amène le formulaire (et son
  // récapitulatif déjà rempli) dans le champ de vision.
  function scrollToForm() {
    var formElement = document.getElementById('inscription-form');
    if (!formElement) return;
    setTimeout(function () {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  }

  function init() {
    var selectElement = document.getElementById('cours');
    if (!selectElement) return;

    var urlParams = new URLSearchParams(window.location.search);
    var courseIdParam = urlParams.get('course_id');
    var coursParam = urlParams.get('cours');
    var preselect = courseIdParam || (coursParam ? decodeURIComponent(coursParam) : null);

    fetch(API_URL + '/api/cours', { cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) throw new Error('API error: ' + r.status);
        return r.json();
      })
      .then(function(courses) {
        var actifs = (courses || []).filter(function (c) { return c && c.actif; });
        if (!actifs.length) {
          enableInfoRequestMode(selectElement);
          return;
        }

        coursesById = {};
        courses.forEach(function (c) {
          if (c && c.id != null) coursesById[String(c.id)] = c;
        });

        var preselectedIndex = populateDropdown(selectElement, courses, preselect);

        if (preselectedIndex > 0) {
          selectElement.selectedIndex = preselectedIndex;
          selectElement.classList.add('prefilled');
          scrollToForm();
        }
        if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
        renderRecapFromSelect();
        updateArgileGroup();
        selectElement.addEventListener('change', function () {
          if (window.syncCoursHiddenFields) window.syncCoursHiddenFields();
          renderRecapFromSelect();
          updateArgileGroup();
          updateUrlForSelection();
        });
      })
      .catch(function(err) {
        console.error('[Inscription] Erreur chargement cours:', err);
        enableInfoRequestMode(selectElement);
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
