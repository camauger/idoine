/**
 * courseList.js - Charge la liste des cours depuis l'API et affiche les cartes
 * window.ATELIER_API_URL (injecté au build) : si vide, appels en même origine (/api/cours) pour netlify dev ou prod.
 * Pour le backend local : définir ATELIER_API_URL=http://127.0.0.1:8000 dans .env avant le build.
 */
(function () {
  var API_URL = (typeof window !== 'undefined' && window.ATELIER_API_URL != null) ? (window.ATELIER_API_URL || '') : '';

  var GRID_IDS = {
    ceramique_tournage: 'grid-ceramique-tournage',
    ceramique_faconnage: 'grid-ceramique-faconnage',
    ceramique_autre: 'grid-ceramique-autre',
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

  /** Complète la description carte si la BD n’a pas encore la mention (ex. après mise à jour JSON). */
  function enrichCardDescription(c) {
    var d = (c.description || '').trim();
    if (!d) return '';
    if (c.slug === 'vitrail-intensif-niveau-1-11-avril' && !/16\s*ans/i.test(d)) {
      d = d.replace(/\s*\.\s*$/, '') + '. 16 ans et plus.';
    }
    return d;
  }

  /**
   * Matière pour les céramiques régulières (tournage / façonnage / autres), dérivée du slug et du nom.
   */
  function matiereCeramiqueRegulier(c) {
    var slug = (c.slug || '').toLowerCase();
    var nom = (c.nom || '').toLowerCase();
    var s = slug + ' ' + nom;
    if (/tournage/.test(s)) return 'ceramique_tournage';
    if (/façonnage|faconnage/.test(s)) return 'ceramique_faconnage';
    return 'ceramique_autre';
  }

  function sectionKey(c) {
    var d = (c.discipline || '').toLowerCase();
    var t = (c.type_cours || '').toLowerCase();

    if (t === 'intensif') return 'ceramique_intensif';
    if (t === 'enfants') return 'ceramique_enfants';
    if (d === 'vitrail') return 'vitrail';
    if (d === 'mosaique' || d === 'mosaïque') return 'mosaique';
    if (d === 'ceramique' || d === 'céramique') return matiereCeramiqueRegulier(c);

    return 'ceramique_autre';
  }

  function creneauLabel(raw) {
    if (raw == null || raw === '') return '';
    var x = String(raw).toLowerCase();
    if (x === 'matin') return 'Matin';
    if (x.indexOf('après') !== -1 || x === 'apres-midi' || x === 'apres-midi') return 'Après-midi';
    if (x === 'soir') return 'Soir';
    return String(raw);
  }

  function capitalizeDay(j) {
    if (!j) return '';
    var s = String(j).trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
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

  var PLACEHOLDER_GENERIC = '/assets/images/course-placeholder.svg';

  /** Image par défaut selon la discipline (si image_url absent en BD). */
  function defaultImageForCourse(c) {
    var d = (c.discipline || '').toLowerCase();
    var t = (c.type_cours || '').toLowerCase();
    if (d === 'vitrail') return '/assets/images/vitrail-preview.jpg';
    if (d === 'mosaique' || d === 'mosaïque') return '/assets/images/mosaique-intensif.jpg';
    if (t === 'enfants') return '/assets/images/ceramique-preview.jpg';
    return '/assets/images/ceramique-preview.jpg';
  }

  function courseCardImageSrc(c) {
    var custom = (c.image_url != null && String(c.image_url).trim()) ? String(c.image_url).trim() : '';
    return custom || defaultImageForCourse(c);
  }

  /** Trie les lignes d’un même groupe (jour / période / heure). */
  function sortSlots(a, b) {
    var ja = (a.jour || '') + ' ' + (a.creneau || '') + ' ' + (a.heure || '');
    var jb = (b.jour || '') + ' ' + (b.creneau || '') + ' ' + (b.heure || '');
    return ja.localeCompare(jb, 'fr');
  }

  /**
   * Regroupe les lignes API par groupe_slug ; les cours sans groupe restent seuls.
   * @returns {Array<{ kind: 'one', c: object } | { kind: 'group', slots: object[] }>}
   */
  function expandCoursesForDisplay(cours) {
    var byGroup = {};
    var singles = [];
    (cours || []).forEach(function (c) {
      var g = (c.groupe_slug != null && String(c.groupe_slug).trim()) ? String(c.groupe_slug).trim() : '';
      if (!g) {
        singles.push({ kind: 'one', c: c });
      } else {
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(c);
      }
    });
    var out = [];
    singles.forEach(function (x) { out.push(x); });
    Object.keys(byGroup).forEach(function (g) {
      var arr = byGroup[g].slice().sort(sortSlots);
      if (arr.length === 1) out.push({ kind: 'one', c: arr[0] });
      else out.push({ kind: 'group', slots: arr });
    });
    return out;
  }

  /** Carte unique avec plusieurs créneaux (inscription par ligne). */
  function buildGroupedCard(slots) {
    var c0 = slots[0];
    var category = (c0.discipline || '').toLowerCase() + ' ' + (c0.type_cours || '').toLowerCase();
    var sumPlaces = 0;
    slots.forEach(function (s) {
      sumPlaces += Math.max(0, s.places_restantes | 0);
    });
    var allFull = slots.every(function (s) { return (s.places_restantes | 0) === 0; });
    var availClass = allFull ? 'course-availability full' : 'course-availability available';
    var availText = allFull
      ? 'Complet'
      : (sumPlaces === 1 ? '1 place au total' : sumPlaces + ' places au total');

    var badges = '<span class="course-badge ' + badgeClass(c0.discipline) + '">' + esc(labelDiscipline(c0.discipline)) + '</span>';
    if ((c0.type_cours || '').toLowerCase() === 'intensif') badges += ' <span class="course-badge badge-intensif">Intensif</span>';
    if ((c0.type_cours || '').toLowerCase() === 'enfants') badges += ' <span class="course-badge badge-enfants">Enfants</span>';
    if (c0.badge_new) badges += ' <span class="course-badge badge-new">Nouveau</span>';
    badges += ' <span class="course-badge badge-multi-slot">Plusieurs créneaux</span>';

    var rawDesc = enrichCardDescription(c0);
    var desc = rawDesc ? esc(rawDesc) : 'Cours à l\'Atelier St-Elme. Inscription via le formulaire en ligne.';
    var prix = (c0.prix || '').trim();
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

    var slotsHtml = slots.map(function (s) {
      var full = (s.places_restantes | 0) === 0;
      var slotAvailClass = full ? 'course-slot-availability course-availability full' : 'course-slot-availability course-availability available';
      var slotAvailText = full ? 'Complet' : ((s.places_restantes | 0) === 1 ? '1 place' : (s.places_restantes + ' places'));
      var metaParts = [];
      if (s.jour) metaParts.push(esc(capitalizeDay(s.jour)));
      if (s.creneau) metaParts.push(esc(creneauLabel(s.creneau)));
      if (s.heure) metaParts.push(esc(s.heure));
      if (s.date_debut) metaParts.push(esc(s.date_debut));
      var meta = metaParts.join(' · ');
      var ctaSlot;
      if (full) {
        ctaSlot = '<span class="btn btn-outline btn-sm disabled">Complet</span>';
      } else {
        var inscUrl =
          '/inscription?course_id=' +
          encodeURIComponent(String(s.id != null ? s.id : '')) +
          '&cours=' +
          encodeURIComponent(s.nom || '');
        ctaSlot = '<a href="' + inscUrl + '" class="btn btn-primary btn-sm">S\'inscrire</a>';
      }
      return '<li class="course-slot-line" data-course-id="' + esc(String(s.id != null ? s.id : '')) + '">' +
        '<div class="course-slot-line-main">' +
          '<span class="course-slot-meta">' + meta + '</span>' +
          '<span class="' + slotAvailClass + '">' + esc(slotAvailText) + '</span>' +
        '</div>' +
        '<div class="course-slot-line-cta">' + ctaSlot + '</div>' +
      '</li>';
    }).join('');

    var topCtaHtml = '';
    if (c0.page_dediee) {
      topCtaHtml = '<a href="/' + esc(c0.page_dediee) + '/" class="btn btn-outline btn-sm">En savoir plus</a>';
    }

    var imgSrc = courseCardImageSrc(c0);
    var imgFallback = defaultImageForCourse(c0);
    var imgGeneric = PLACEHOLDER_GENERIC;
    var hasCustom = !!(c0.image_url != null && String(c0.image_url).trim());
    var onImgErr = hasCustom
      ? ' onerror="if(!this.dataset._imgfb){this.dataset._imgfb=\'1\';this.src=\'' + imgFallback + '\';}else{this.onerror=null;this.src=\'' + imgGeneric + '\';}"'
      : ' onerror="this.onerror=null;this.src=\'' + imgGeneric + '\'"';

    return '<article class="course-card course-card-grouped" data-category="' + esc(category) + '">' +
      '<div class="course-card-thumb">' +
        '<img src="' + esc(imgSrc) + '" alt="' + esc(c0.nom || 'Cours') + '" loading="lazy" decoding="async" width="640" height="400"' + onImgErr + '>' +
      '</div>' +
      '<header class="course-card-header">' +
        '<div class="course-badges">' + badges + '</div>' +
        '<span class="' + availClass + '">' + esc(availText) + '</span>' +
      '</header>' +
      '<div class="course-card-body">' +
        '<h3 class="course-title">' + esc(c0.nom) + '</h3>' +
        '<div class="course-description-wrap">' +
          '<p class="course-description">' + desc + '</p>' +
          '<button type="button" class="course-description-toggle" hidden aria-expanded="false">Lire la suite</button>' +
        '</div>' +
        '<p class="course-slots-intro">Créneaux et inscription :</p>' +
        '<ul class="course-slots-list">' + slotsHtml + '</ul>' +
      '</div>' +
      '<footer class="course-card-footer">' +
        '<div class="course-price">' + prixHtml + '</div>' +
        '<div class="course-cta">' + topCtaHtml + '</div>' +
      '</footer>' +
    '</article>';
  }

  function buildCard(c) {
    var category = (c.discipline || '').toLowerCase() + ' ' + (c.type_cours || '').toLowerCase();
    var full = c.places_restantes === 0;
    var availClass = full ? 'course-availability full' : 'course-availability available';
    var availText = full ? 'Complet' : (c.places_restantes === 1 ? '1 place restante' : c.places_restantes + ' places restantes');

    var badges = '<span class="course-badge ' + badgeClass(c.discipline) + '">' + esc(labelDiscipline(c.discipline)) + '</span>';
    if ((c.type_cours || '').toLowerCase() === 'intensif') badges += ' <span class="course-badge badge-intensif">Intensif</span>';
    if ((c.type_cours || '').toLowerCase() === 'enfants') badges += ' <span class="course-badge badge-enfants">Enfants</span>';
    if (c.badge_new) badges += ' <span class="course-badge badge-new">Nouveau</span>';

    var details = '';
    if (c.jour) details += '<div class="course-detail"><span class="detail-label">Jour</span><span class="detail-value">' + esc(capitalizeDay(c.jour)) + '</span></div>';
    if (c.creneau) details += '<div class="course-detail"><span class="detail-label">Période</span><span class="detail-value">' + esc(creneauLabel(c.creneau)) + '</span></div>';
    if (c.heure) details += '<div class="course-detail"><span class="detail-label">Heure</span><span class="detail-value">' + esc(c.heure) + '</span></div>';
    if (c.date_debut) details += '<div class="course-detail"><span class="detail-label">Début</span><span class="detail-value">' + esc(c.date_debut) + '</span></div>';
    if (c.duree_semaines) details += '<div class="course-detail"><span class="detail-label">Durée</span><span class="detail-value">' + esc(c.duree_semaines) + ' semaines</span></div>';
    if (c.prof) details += '<div class="course-detail"><span class="detail-label">Professeur</span><span class="detail-value">' + esc(c.prof) + '</span></div>';
    if (!c.jour && !c.creneau && !c.heure && !c.date_debut && !c.duree_semaines && !c.prof) details += '<div class="course-detail"><span class="detail-label">Places</span><span class="detail-value">' + (c.places_max || 0) + ' max.</span></div>';

    var rawDesc = enrichCardDescription(c);
    var desc = rawDesc ? esc(rawDesc) : 'Cours à l\'Atelier St-Elme. Inscription via le formulaire en ligne.';
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
      var inscUrl =
        '/inscription?course_id=' +
        encodeURIComponent(String(c.id != null ? c.id : '')) +
        '&cours=' +
        encodeURIComponent(c.nom || '');
      ctaHtml = '<a href="' + inscUrl + '" class="btn btn-primary btn-sm">S\'inscrire</a>';
    }
    if (c.page_dediee) {
      ctaHtml = '<a href="/' + esc(c.page_dediee) + '/" class="btn btn-outline btn-sm">En savoir plus</a> ' + ctaHtml;
    }

    var imgSrc = courseCardImageSrc(c);
    var imgFallback = defaultImageForCourse(c);
    var imgGeneric = PLACEHOLDER_GENERIC;
    var hasCustom = !!(c.image_url != null && String(c.image_url).trim());
    var onImgErr = hasCustom
      ? ' onerror="if(!this.dataset._imgfb){this.dataset._imgfb=\'1\';this.src=\'' + imgFallback + '\';}else{this.onerror=null;this.src=\'' + imgGeneric + '\';}"'
      : ' onerror="this.onerror=null;this.src=\'' + imgGeneric + '\'"';

    return '<article class="course-card" data-course-id="' + esc(String(c.id != null ? c.id : '')) + '" data-category="' + esc(category) + '">' +
      '<div class="course-card-thumb">' +
        '<img src="' + esc(imgSrc) + '" alt="' + esc(c.nom || 'Cours') + '" loading="lazy" decoding="async" width="640" height="400"' + onImgErr + '>' +
      '</div>' +
      '<header class="course-card-header">' +
        '<div class="course-badges">' + badges + '</div>' +
        '<span class="' + availClass + '">' + esc(availText) + '</span>' +
      '</header>' +
      '<div class="course-card-body">' +
        '<h3 class="course-title">' + esc(c.nom) + '</h3>' +
        '<div class="course-description-wrap">' +
          '<p class="course-description">' + desc + '</p>' +
          '<button type="button" class="course-description-toggle" hidden aria-expanded="false">Lire la suite</button>' +
        '</div>' +
        '<div class="course-details">' + details + '</div>' +
      '</div>' +
      '<footer class="course-card-footer">' +
        '<div class="course-price">' + prixHtml + '</div>' +
        '<div class="course-cta">' + ctaHtml + '</div>' +
      '</footer>' +
    '</article>';
  }

  /** Affiche le bouton « Lire la suite » uniquement si la description déborde. */
  function revealDescriptionToggles(root) {
    var wraps = (root || document).querySelectorAll('.course-description-wrap');
    wraps.forEach(function (wrap) {
      var p = wrap.querySelector('.course-description');
      var btn = wrap.querySelector('.course-description-toggle');
      if (!p || !btn) return;
      if (p.classList.contains('is-expanded')) return;
      var overflow = p.scrollHeight - p.clientHeight > 1;
      btn.hidden = !overflow;
    });
  }

  /** Délégation : ouvre/ferme la description. */
  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('.course-description-toggle');
    if (!btn) return;
    var wrap = btn.closest('.course-description-wrap');
    if (!wrap) return;
    var p = wrap.querySelector('.course-description');
    if (!p) return;
    var expanded = p.classList.toggle('is-expanded');
    btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    btn.textContent = expanded ? 'Réduire' : 'Lire la suite';
  });

  function init() {
    var loadingEl = document.getElementById('courses-loading');
    var fallbackEl = document.getElementById('courses-fallback');
    if (loadingEl) loadingEl.setAttribute('aria-busy', 'true');

    fetch(API_URL + '/api/cours', { cache: 'no-store' })
      .then(function (r) {
        if (r.ok) return r.json();
        return r.json().catch(function () { return {}; }).then(function (body) {
          console.warn("[Cours] API erreur", r.status, body.detail || body.error || r.statusText);
          return Promise.reject(new Error(body.detail || body.error || "API error"));
        });
      })
      .then(function (cours) {
        if (loadingEl) {
          loadingEl.style.display = 'none';
          loadingEl.setAttribute('aria-busy', 'false');
        }
        if (!cours || !cours.length) {
          if (fallbackEl) fallbackEl.style.display = 'block';
          window.dispatchEvent(new CustomEvent('courses-loaded'));
          return;
        }

        var bySection = {};
        Object.keys(GRID_IDS).forEach(function (k) { bySection[k] = []; });
        var expanded = expandCoursesForDisplay(cours);
        expanded.forEach(function (item) {
          var c0 = item.kind === 'one' ? item.c : item.slots[0];
          var key = sectionKey(c0);
          if (bySection[key]) bySection[key].push(item);
        });

        var CERAMIQUE_KEYS = ['ceramique_tournage', 'ceramique_faconnage', 'ceramique_autre'];
        var visibleDelay = 0;

        Object.keys(GRID_IDS).forEach(function (key) {
          var gridId = GRID_IDS[key];
          var grid = document.getElementById(gridId);
          var list = bySection[key] || [];
          if (!grid) return;

          grid.innerHTML = list.map(function (item) {
            return item.kind === 'group' ? buildGroupedCard(item.slots) : buildCard(item.c);
          }).join('');

          var matiereGroup = grid.closest('.matiere-group');
          if (matiereGroup) {
            matiereGroup.style.display = list.length ? '' : 'none';
            return;
          }

          var section = grid.closest('section');
          if (!section) return;
          if (list.length) {
            section.style.display = '';
            (function (s, d) {
              setTimeout(function () {
                s.classList.add('visible');
              }, d);
            })(section, visibleDelay);
            visibleDelay += 100;
          } else {
            section.style.display = 'none';
          }
        });

        var ceramiqueSection = document.getElementById('ceramique');
        if (ceramiqueSection) {
          var hasCeramique = CERAMIQUE_KEYS.some(function (k) {
            return (bySection[k] || []).length > 0;
          });
          if (hasCeramique) {
            ceramiqueSection.style.display = '';
            (function (s, d) {
              setTimeout(function () {
                s.classList.add('visible');
              }, d);
            })(ceramiqueSection, visibleDelay);
          } else {
            ceramiqueSection.style.display = 'none';
          }
        }

        if (fallbackEl) fallbackEl.style.display = 'none';
        revealDescriptionToggles();
        var resizeTimer = 0;
        window.addEventListener('resize', function () {
          if (resizeTimer) cancelAnimationFrame(resizeTimer);
          resizeTimer = requestAnimationFrame(function () {
            revealDescriptionToggles();
          });
        });
        window.dispatchEvent(new CustomEvent('courses-loaded'));
      })
      .catch(function () {
        if (loadingEl) {
          loadingEl.style.display = 'none';
          loadingEl.setAttribute('aria-busy', 'false');
        }
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
