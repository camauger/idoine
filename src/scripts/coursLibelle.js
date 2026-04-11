/**
 * Libellé cours : retire les suffixes ajoutés sur les <option> (COMPLET, places restantes).
 * Chargé avant formPrefill.js, courseDetailForm.js et inscriptionParticipants.js.
 */
(function (global) {
  'use strict';

  function normalizeCoursLibelle(text) {
    var s = text != null ? String(text) : '';
    s = s.trim();
    s = s.replace(/\s*\[COMPLET\]\s*$/i, '');
    s = s.replace(/\s*\[\d+\s+place\(s\)\]\s*$/i, '');
    return s.trim();
  }

  global.normalizeCoursLibelle = normalizeCoursLibelle;
})(typeof window !== 'undefined' ? window : this);
