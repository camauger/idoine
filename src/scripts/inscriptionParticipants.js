/**
 * Inscription multi-personnes : blocs participants, participants_json, validation des places.
 * Charger après coursLibelle.js ; avant formPrefill.js / courseDetailForm.js (submit intercepté en premier).
 */
(function () {
  'use strict';

  var MAX_PARTICIPANTS = 8;
  var DIALOG_ID = 'inscription-site-dialog';

  /**
   * Modale accessible (charte du site) à la place de alert().
   * @param {{ title: string, message: string }} opts
   */
  function showSiteDialog(opts) {
    var title = (opts && opts.title) || 'Information';
    var message = (opts && opts.message) || '';
    var prevActive = document.activeElement;

    var existing = document.getElementById(DIALOG_ID);
    if (existing) existing.remove();

    var root = document.createElement('div');
    root.id = DIALOG_ID;
    root.className = 'site-dialog';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', DIALOG_ID + '-title');

    var backdrop = document.createElement('div');
    backdrop.className = 'site-dialog__backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    var panel = document.createElement('div');
    panel.className = 'site-dialog__panel';

    var accent = document.createElement('div');
    accent.className = 'site-dialog__accent';
    accent.setAttribute('aria-hidden', 'true');

    var h = document.createElement('h2');
    h.id = DIALOG_ID + '-title';
    h.className = 'site-dialog__title';
    h.textContent = title;

    var p = document.createElement('p');
    p.className = 'site-dialog__message';
    p.textContent = message;

    var actions = document.createElement('div');
    actions.className = 'site-dialog__actions';

    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn btn-primary site-dialog__ok';
    ok.textContent = 'Compris';

    function close() {
      root.remove();
      document.removeEventListener('keydown', onKey);
      if (prevActive && typeof prevActive.focus === 'function') {
        try {
          prevActive.focus();
        } catch (e) {
          /* ignore */
        }
      }
    }

    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        close();
      }
    }

    backdrop.addEventListener('click', close);
    ok.addEventListener('click', close);

    actions.appendChild(ok);
    panel.appendChild(accent);
    panel.appendChild(h);
    panel.appendChild(p);
    panel.appendChild(actions);
    root.appendChild(backdrop);
    root.appendChild(panel);
    document.body.appendChild(root);

    document.addEventListener('keydown', onKey);
    ok.focus();
  }

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
    libelle.value = window.normalizeCoursLibelle
      ? window.normalizeCoursLibelle(opt.textContent)
      : (opt.textContent || '').trim();
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
      blocks[i].setAttribute('data-participant-index', String(i));
      var title = blocks[i].querySelector('.participant-block-title');
      if (title) title.textContent = 'Personne ' + (i + 1);
      var rm = blocks[i].querySelector('.btn-remove-participant');
      if (rm) rm.hidden = n <= 1;
      var nomInp = blocks[i].querySelector('.participant-nom');
      var enfantInp = blocks[i].querySelector('.participant-enfant');
      var nomLbl = blocks[i].querySelector('.participant-nom-label');
      var enfantLbl = blocks[i].querySelector('.participant-enfant-label');
      var nomId = 'participant-nom-' + i;
      var enfantId = 'participant-enfant-' + i;
      if (nomInp) nomInp.id = nomId;
      if (enfantInp) enfantInp.id = enfantId;
      if (nomLbl) nomLbl.setAttribute('for', nomId);
      if (enfantLbl) enfantLbl.setAttribute('for', enfantId);
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
      showSiteDialog({
        title: 'Participants',
        message:
          'Indiquez au moins une personne à inscrire (nom complet).',
      });
      return;
    }
    if (participants.length > MAX_PARTICIPANTS) {
      showSiteDialog({
        title: 'Limite atteinte',
        message:
          'Maximum ' +
          MAX_PARTICIPANTS +
          ' personnes par demande d’inscription.',
      });
      return;
    }

    var places = getPlacesForSelection();
    if (places != null && participants.length > places) {
      showSiteDialog({
        title: 'Places insuffisantes',
        message:
          'Il ne reste que ' +
          places +
          ' place(s) pour ce cours ; vous demandez ' +
          participants.length +
          ' inscription(s). Réduisez le nombre de personnes ou choisissez un autre cours.',
      });
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
