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

  var ILLISIBLE = 99999999; // date inconnue → en fin de liste

  /**
   * Clé AAAAMMJJ du libellé date_debut (« 11 Janvier », « 15 et 29 Novembre » → premier jour).
   * Sans année explicite, on la déduit de l'année scolaire en cours (août → juillet) :
   * même règle que backend/migrate_add_debut_le.py.
   */
  function cleDateDebut(d, aujourdHui) {
    var s = sansAccents(d);
    var jour = s.match(/\b\d{1,2}\b/);
    var mois = -1;
    MOIS.forEach(function (nom, i) { if (mois === -1 && s.indexOf(nom) !== -1) mois = i; });
    if (!jour || mois === -1) return ILLISIBLE;
    var annee = s.match(/\b20\d{2}\b/);
    var y;
    if (annee) {
      y = +annee[0];
    } else {
      var ref = aujourdHui && typeof aujourdHui.getMonth === 'function' ? aujourdHui : new Date();
      var debutScolaire = ref.getMonth() >= 7 ? ref.getFullYear() : ref.getFullYear() - 1;
      y = mois >= 7 ? debutScolaire : debutScolaire + 1;
    }
    return y * 10000 + (mois + 1) * 100 + (+jour[0]);
  }

  /** Clé AAAAMMJJ d'un cours : debut_le (« 2027-01-11 ») si renseignée, sinon le libellé. */
  function cleDebut(c, aujourdHui) {
    var iso = c && c.debut_le ? String(c.debut_le).match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
    if (iso) return (+iso[1]) * 10000 + (+iso[2]) * 100 + (+iso[3]);
    return cleDateDebut(c && c.date_debut, aujourdHui);
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
    return (cleDebut(a) - cleDebut(b)) || parCreneau(a, b);
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
    cleDebut: cleDebut,
    parCreneau: parCreneau,
    parDateDebut: parDateDebut
  };
})(typeof window !== 'undefined' ? window : this);
