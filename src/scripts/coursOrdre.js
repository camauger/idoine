/**
 * Ordre chronologique des cours : jour de la semaine, heure de début, date de début.
 * Les champs `jour`, `heure` et `date_debut` sont du texte libre en BD
 * (« Lundi », « 13h30-16h », « 15 et 29 Novembre ») : un tri alphabétique
 * mettrait le jeudi avant le lundi.
 * Expose aussi le libellé affiché des disciplines.
 * Chargé avant courseList.js (/cours) et admin.js (/admin).
 */
(function (global) {
  'use strict';

  var JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  var MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout',
    'septembre', 'octobre', 'novembre', 'decembre'];

  function sansAccents(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  /** Rang du jour de la semaine (lundi = 0) ; jour inconnu → en fin de liste. */
  function rangJour(j) {
    var i = JOURS.indexOf(sansAccents(j));
    return i === -1 ? 99 : i;
  }

  /** Heure de début en minutes (« 13h30-16h » → 810) ; illisible → en fin de liste. */
  function minutesDebut(h) {
    var m = String(h || '').match(/(\d{1,2})\s*h\s*(\d{2})?/i);
    return m ? (+m[1]) * 60 + (+(m[2] || 0)) : 9999;
  }

  /**
   * Clé chronologique de date_debut (« 11 Janvier », « 15 et 29 Novembre » → premier jour).
   * Année scolaire : août → juillet, pour que novembre précède janvier.
   * Date illisible → en fin de liste.
   */
  function cleDateDebut(d) {
    var s = sansAccents(d);
    var jour = s.match(/\d{1,2}/);
    var mois = -1;
    MOIS.forEach(function (nom, i) { if (mois === -1 && s.indexOf(nom) !== -1) mois = i; });
    if (!jour || mois === -1) return 99999;
    return ((mois - 7 + 12) % 12) * 100 + (+jour[0]);
  }

  /** Ordre de la semaine : jour, heure de début, puis nom. */
  function parCreneau(a, b) {
    return (rangJour(a.jour) - rangJour(b.jour)) ||
      (minutesDebut(a.heure) - minutesDebut(b.heure)) ||
      String(a.nom || '').localeCompare(String(b.nom || ''), 'fr') ||
      ((a.id | 0) - (b.id | 0));
  }

  /** Ordre du calendrier : date de début, puis jour et heure. */
  function parDateDebut(a, b) {
    return (cleDateDebut(a.date_debut) - cleDateDebut(b.date_debut)) || parCreneau(a, b);
  }

  /** Libellé affiché d'une discipline (« ceramique » en BD → « Céramique »). */
  function libelleDiscipline(discipline) {
    var d = sansAccents(discipline);
    if (d === 'vitrail') return 'Vitrail';
    if (d === 'mosaique') return 'Mosaïque';
    return 'Céramique';
  }

  global.CoursOrdre = {
    libelleDiscipline: libelleDiscipline,
    rangJour: rangJour,
    minutesDebut: minutesDebut,
    cleDateDebut: cleDateDebut,
    parCreneau: parCreneau,
    parDateDebut: parDateDebut
  };
})(typeof window !== 'undefined' ? window : this);
