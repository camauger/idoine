/**
 * Inscription multi-personnes : blocs participants, participants_json, validation des places.
 * Charger avant formPrefill.js / courseDetailForm.js pour que le submit intercepte en premier.
 */
(function () {
  'use strict';

  var MAX_PARTICIPANTS = 8;

  function getForm() {
    return document.getElementById('inscription-form');
  }

  function getList() {
    return document.getElementById('participants-list');
  }

  function getSelect() {
    return document.getElementById('cours');
  }

  function syncCoursHiddenFields() {
    var sel = getSelect();
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
    libelle.value = (opt.textContent || '').replace(/\s*\[COMPLET\]\s*$/i, '').replace(/\s*\[\d+ place\(s\)\]\s*$/i, '').trim();
  }

  function collectParticipants() {
    var list = getList();
    if (!list) return [];
    var blocks = list.querySelectorAll('.participant-block');
    var out = [];
    for (var i = 0; i < blocks.length; i++) {
      var nom = (blocks[i].querySelector('.participant-nom') || {}).value;
      nom = (nom != null ? String(nom) : '').trim();
      var enfantEl = blocks[i].querySelector('.participant-enfant');
      var enfant = enfantEl && enfantEl.value ? String(enfantEl.value).trim() : '';
      if (nom) out.push({ nom: nom, enfant: enfant || null });
    }
    return out;
  }

  function updateBlockTitles(list) {
    var blocks = list.querySelectorAll('.participant-block');
    var n = blocks.length;
    for (var i = 0; i < n; i++) {
      var title = blocks[i].querySelector('.participant-block-title');
      if (title) title.textContent = 'Personne ' + (i + 1);
      var rm = blocks[i].querySelector('.btn-remove-participant');
      if (rm) rm.hidden = n <= 1;
    }
  }

  function cloneFirstBlock(list) {
    var first = list.querySelector('.participant-block');
    if (!first) return null;
    var clone = first.cloneNode(true);
    var inputs = clone.querySelectorAll('input');
    for (var j = 0; j < inputs.length; j++) {
      inputs[j].value = '';
      inputs[j].required = false;
    }
    clone.setAttribute('data-participant-index', String(list.querySelectorAll('.participant-block').length));
    list.appendChild(clone);
    var nomInp = clone.querySelector('.participant-nom');
    if (nomInp) nomInp.required = true;
    bindRemove(clone);
    updateBlockTitles(list);
    return clone;
  }

  function bindRemove(block) {
    var btn = block.querySelector('.btn-remove-participant');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', function () {
      var list = getList();
      if (!list || list.querySelectorAll('.participant-block').length <= 1) return;
      block.remove();
      updateBlockTitles(list);
      var addBtn = document.getElementById('add-participant');
      if (addBtn) addBtn.disabled = false;
    });
  }

  function getPlacesForSelection() {
    var sel = getSelect();
    if (!sel) return null;
    var opt = sel.options[sel.selectedIndex];
    if (!opt || !opt.value) return null;
    var raw = opt.getAttribute('data-places-restantes');
    if (raw == null || raw === '') return null;
    var n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  }

  function onSubmit(ev) {
    var form = getForm();
    var pj = document.getElementById('participants_json');
    if (!form || !pj || !getList()) return;

    ev.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    syncCoursHiddenFields();

    var participants = collectParticipants();
    if (participants.length < 1) {
      alert('Indiquez au moins une personne à inscrire (nom complet).');
      return;
    }
    if (participants.length > MAX_PARTICIPANTS) {
      alert('Maximum ' + MAX_PARTICIPANTS + ' personnes par demande.');
      return;
    }

    var places = getPlacesForSelection();
    if (places != null && participants.length > places) {
      alert(
        'Il ne reste que ' +
          places +
          ' place(s) pour ce cours ; vous demandez ' +
          participants.length +
          ' inscription(s). Réduisez le nombre de personnes ou choisissez un autre cours.'
      );
      return;
    }

    pj.value = JSON.stringify(participants);
    window.HTMLFormElement.prototype.submit.call(form);
  }

  function init() {
    var form = getForm();
    var list = getList();
    if (!form || !list) return;

    var initialBlocks = list.querySelectorAll('.participant-block');
    for (var k = 0; k < initialBlocks.length; k++) {
      bindRemove(initialBlocks[k]);
    }
    updateBlockTitles(list);

    var addBtn = document.getElementById('add-participant');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var n = list.querySelectorAll('.participant-block').length;
        if (n >= MAX_PARTICIPANTS) return;
        cloneFirstBlock(list);
        if (n + 1 >= MAX_PARTICIPANTS) addBtn.disabled = true;
      });
    }

    form.addEventListener('submit', onSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
