/**
 * Helpers cours : normalisation du libellé + synchronisation des champs cachés (cours / course_id).
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

  function syncCoursHiddenFields() {
    var sel = document.getElementById('cours');
    var libelle = document.getElementById('cours-libelle');
    var idField = document.getElementById('course_id');
    if (!sel || !libelle || !idField) return;
    var opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) {
      libelle.value = '';
      idField.value = '';
      return;
    }
    idField.value = opt.value;
    libelle.value = normalizeCoursLibelle(opt.textContent);
  }

  global.normalizeCoursLibelle = normalizeCoursLibelle;
  global.syncCoursHiddenFields = syncCoursHiddenFields;
})(typeof window !== 'undefined' ? window : this);
