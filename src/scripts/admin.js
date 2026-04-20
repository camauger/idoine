/**
 * admin.js - Interface d'administration
 */
(function() {
  'use strict';

  var API_URL = (typeof window !== 'undefined' && window.ATELIER_API_URL) || '';
  var TOKEN_KEY = 'admin_token';

  // DOM Elements
  var loginSection = document.getElementById('admin-login');
  var dashboardSection = document.getElementById('admin-dashboard');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var logoutBtn = document.getElementById('logout-btn');
  var tabs = document.querySelectorAll('.admin-tab');
  var filterCourse = document.getElementById('filter-course');
  var exportCsvBtn = document.getElementById('export-csv');

  // State
  var courses = [];
  var inscriptions = [];

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function authHeaders() {
    var token = getToken();
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
  }

  function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadData();
  }

  function showError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
  }

  function hideError() {
    loginError.style.display = 'none';
  }

  // Login
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    hideError();
    var password = document.getElementById('password').value;

    fetch(API_URL + '/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    })
    .then(function(r) {
      if (!r.ok) throw new Error('Mot de passe incorrect');
      return r.json();
    })
    .then(function(data) {
      setToken(data.access_token);
      showDashboard();
    })
    .catch(function(err) {
      showError(err.message || 'Erreur de connexion');
    });
  });

  // Logout
  logoutBtn.addEventListener('click', function() {
    clearToken();
    showLogin();
  });

  // Tabs
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      var tabId = this.getAttribute('data-tab');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      this.classList.add('active');
      document.querySelectorAll('.admin-tab-content').forEach(function(c) {
        c.style.display = 'none';
      });
      document.getElementById('tab-' + tabId).style.display = 'block';
      if (tabId === 'inscriptions' && getToken()) {
        loadInscriptions(filterCourse.value || null).catch(function() {});
      }
    });
  });

  // Load Data — cours d'abord (pour date session si l'API ne renvoie pas course_date)
  function loadData() {
    loadCourses()
      .then(function() {
        return loadInscriptions();
      })
      .catch(function(err) {
        console.error('Erreur chargement admin:', err);
      });
  }

  /** Met à jour actif (+ places_max courant pour l’API Netlify). */
  function putCourseActif(courseId, actif) {
    var course = courses.find(function(x) { return x.id === courseId; });
    var placesMax = course ? (course.places_max || 0) : 0;
    if (!course) {
      var row = document.querySelector('tr[data-course-id="' + courseId + '"]');
      if (row) placesMax = parseInt(row.getAttribute('data-places-max'), 10) || 0;
    }
    return fetch(API_URL + '/api/admin/courses/' + courseId, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({ places_max: placesMax, actif: !!actif })
    })
      .then(function(r) {
        if (r.status === 401) { clearToken(); showLogin(); throw new Error('Session expirée'); }
        if (!r.ok) {
          return r.json().then(
            function(j) {
              var d = j && j.detail;
              var msg = typeof d === 'string' ? d : (Array.isArray(d) ? d.map(function(x) { return x.msg || ''; }).filter(Boolean).join(', ') : '');
              return Promise.reject(new Error(msg || 'Erreur'));
            },
            function() { return Promise.reject(new Error('Erreur HTTP ' + r.status)); }
          );
        }
        return r.json();
      })
      .then(function(updated) {
        var i = courses.findIndex(function(x) { return x.id === courseId; });
        if (i >= 0) courses[i] = updated;
        return updated;
      });
  }

  function loadCourses() {
    return fetch(API_URL + '/api/admin/courses', { headers: authHeaders() })
      .then(function(r) {
        if (r.status === 401) { clearToken(); showLogin(); throw new Error('Session expirée'); }
        return r.json();
      })
      .then(function(data) {
        courses = data;
        renderCourses();
        updateStats();
        populateCourseFilter();
      });
  }

  /** Tri : regroupe par groupe_slug, puis par créneau. */
  function sortCoursesForAdmin(list) {
    return list.slice().sort(function(a, b) {
      var ga = (a.groupe_slug != null && String(a.groupe_slug).trim()) ? String(a.groupe_slug).trim() : '';
      var gb = (b.groupe_slug != null && String(b.groupe_slug).trim()) ? String(b.groupe_slug).trim() : '';
      if (ga !== gb) {
        if (!ga && !gb) {
          var cmpNom = (a.nom || '').localeCompare(b.nom || '', 'fr');
          return cmpNom !== 0 ? cmpNom : (a.id - b.id);
        }
        if (!ga) return 1;
        if (!gb) return -1;
        return ga.localeCompare(gb);
      }
      var ja = (a.jour || '') + (a.creneau || '') + (a.heure || '');
      var jb = (b.jour || '') + (b.creneau || '') + (b.heure || '');
      var cj = ja.localeCompare(jb, 'fr');
      return cj !== 0 ? cj : (a.id - b.id);
    });
  }

  function formatCreneau(c) {
    var parts = [];
    if (c.jour) parts.push(String(c.jour).trim());
    if (c.creneau) parts.push(String(c.creneau).trim());
    if (c.heure) parts.push(String(c.heure).trim());
    return parts.length ? parts.join(' · ') : '—';
  }

  function truncate(str, max) {
    var s = String(str || '');
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
  }

  function loadInscriptions(courseId) {
    var url = API_URL + '/api/admin/inscriptions';
    if (courseId) url += '?course_id=' + courseId;

    return fetch(url, { headers: authHeaders() })
      .then(function(r) {
        if (r.status === 401) { clearToken(); showLogin(); throw new Error('Session expirée'); }
        return r.json();
      })
      .then(function(data) {
        inscriptions = data;
        renderInscriptions();
        updateStats();
      });
  }

  function renderCourses() {
    var tbody = document.querySelector('#courses-table tbody');
    if (!courses.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty">Aucun cours</td></tr>';
      return;
    }

    var sorted = sortCoursesForAdmin(courses);
    tbody.innerHTML = sorted.map(function(c, idx) {
      var isActif = !!(c.actif === true || c.actif === 'true' || c.actif === 1 || c.actif === 't');
      var statusClass = isActif ? 'status-active' : 'status-inactive';
      var inscrits = Math.max(0, (c.places_max || 0) - (c.places_restantes || 0));
      var placesClass = c.places_restantes === 0 ? 'places-full' : (c.places_restantes <= 2 ? 'places-low' : '');
      var rowMuted = isActif ? '' : ' course-row-inactive';
      var gs = (c.groupe_slug != null && String(c.groupe_slug).trim()) ? String(c.groupe_slug).trim() : '';
      var prev = idx > 0 ? sorted[idx - 1] : null;
      var prevGs = prev && prev.groupe_slug != null ? String(prev.groupe_slug).trim() : '';
      var isGroupStart = gs && gs !== prevGs;
      var trClass = (rowMuted + (gs ? ' course-row-grouped' : '') + (isGroupStart ? ' course-row-group-start' : '')).trim();

      var groupeCell = gs
        ? '<code class="admin-groupe-slug" title="' + esc(gs) + '">' + esc(truncate(gs, 28)) + '</code>'
        : '<span class="admin-cell-muted">—</span>';
      var slugCell = '<code class="admin-course-slug" title="' + esc(c.slug || '') + '">' + esc(truncate(c.slug || '—', 36)) + '</code>';

      return '<tr class="' + trClass + '" data-course-id="' + c.id + '" data-places-max="' + (c.places_max || 0) + '">' +
        '<td class="course-name">' + esc(c.nom) + '</td>' +
        '<td class="cell-groupe">' + groupeCell + '</td>' +
        '<td class="cell-slug">' + slugCell + '</td>' +
        '<td><span class="badge badge-' + esc(c.discipline) + '">' + esc(c.discipline) + '</span></td>' +
        '<td class="cell-creneau">' + esc(formatCreneau(c)) + '</td>' +
        '<td>' + esc(c.date_debut || '-') + '</td>' +
        '<td class="places-cell ' + placesClass + '">' +
          '<div class="places-edit" title="Places restantes = capacité − inscriptions. Modifier ajuste la capacité de ce créneau.">' +
            '<input type="number" class="form-input places-input" min="0" step="1" ' +
              'data-inscrits="' + inscrits + '" ' +
              'value="' + (c.places_restantes != null ? c.places_restantes : 0) + '" ' +
              'aria-label="Places restantes pour le créneau #' + c.id + ' (' + esc(c.nom) + ')" />' +
            '<span class="places-inscrits-hint">' + inscrits + ' insc.</span>' +
            '<button type="button" class="btn btn-outline btn-sm btn-save-places">Enregistrer</button>' +
          '</div>' +
        '</td>' +
        '<td>' + esc(c.prix || '-') + '</td>' +
        '<td class="actif-cell">' +
          '<label class="actif-label">' +
            '<input type="checkbox" class="course-actif-cb" ' + (isActif ? 'checked' : '') + ' aria-label="Créneau #' + c.id + ' visible sur le site" />' +
            '<span>Visible</span>' +
          '</label>' +
          '<span class="status ' + statusClass + ' actif-pill">' + (isActif ? 'Actif' : 'Masqué') + '</span>' +
        '</td>' +
        '<td class="cell-actions">' +
          '<button type="button" class="btn btn-outline btn-sm btn-edit-course" ' +
            'aria-label="Modifier le créneau #' + c.id + '">' +
            'Éditer' +
          '</button>' +
          '<button type="button" class="btn btn-outline btn-sm btn-delete-course" ' +
            'aria-label="Supprimer le créneau #' + c.id + '">' +
            'Supprimer' +
          '</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.btn-save-places').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var row = btn.closest('tr');
        var id = parseInt(row.getAttribute('data-course-id'), 10);
        var input = row.querySelector('.places-input');
        var inscrits = parseInt(input.getAttribute('data-inscrits'), 10) || 0;
        var restantes = parseInt(input.value, 10);
        if (isNaN(restantes) || restantes < 0) {
          alert('Indiquez un nombre de places restantes valide (0 ou plus).');
          return;
        }
        var placesMax = inscrits + restantes;
        btn.disabled = true;
        fetch(API_URL + '/api/admin/courses/' + id, {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify({ places_max: placesMax })
        })
          .then(function(r) {
            if (r.status === 401) { clearToken(); showLogin(); throw new Error('Session expirée'); }
            if (!r.ok) {
              return r.json().then(
                function(j) {
                  var d = j && j.detail;
                  var msg = typeof d === 'string' ? d : (Array.isArray(d) ? d.map(function(x) { return x.msg || ''; }).filter(Boolean).join(', ') : '');
                  return Promise.reject(new Error(msg || 'Erreur'));
                },
                function() {
                  return Promise.reject(new Error('Erreur HTTP ' + r.status));
                }
              );
            }
            return r.json();
          })
          .then(function(updated) {
            var i = courses.findIndex(function(x) { return x.id === id; });
            if (i >= 0) courses[i] = updated;
            renderCourses();
            updateStats();
            populateCourseFilter();
          })
          .catch(function(err) {
            alert(err.message || 'Impossible d\'enregistrer les places.');
          })
          .finally(function() {
            btn.disabled = false;
          });
      });
    });

    tbody.querySelectorAll('.course-actif-cb').forEach(function(cb) {
      cb.addEventListener('change', function() {
        var row = cb.closest('tr');
        var id = parseInt(row.getAttribute('data-course-id'), 10);
        var want = cb.checked;
        var revert = !want;
        cb.disabled = true;
        putCourseActif(id, want)
          .then(function() {
            renderCourses();
            updateStats();
            populateCourseFilter();
          })
          .catch(function(err) {
            cb.checked = revert;
            alert(err.message || 'Impossible de mettre à jour la visibilité du cours.');
            cb.disabled = false;
          });
      });
    });

    tbody.querySelectorAll('.btn-delete-course').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var row = btn.closest('tr');
        var id = parseInt(row.getAttribute('data-course-id'), 10);
        var nameCell = row.querySelector('.course-name');
        var label = nameCell ? nameCell.textContent.trim() : ('#' + id);
        if (!confirm(
          'Supprimer le créneau « ' + label + ' » (id ' + id + ') ?\n\n' +
          'Les inscriptions liées à ce créneau seront définitivement supprimées.'
        )) {
          return;
        }
        btn.disabled = true;
        fetch(API_URL + '/api/admin/courses/' + id, {
          method: 'DELETE',
          headers: authHeaders()
        })
          .then(function(r) {
            if (r.status === 401) { clearToken(); showLogin(); throw new Error('Session expirée'); }
            if (r.status === 404) {
              return Promise.reject(new Error('Ce créneau n’existe plus.'));
            }
            if (!r.ok) {
              return r.json().then(
                function(j) {
                  var d = j && j.detail;
                  var msg = typeof d === 'string' ? d : (Array.isArray(d) ? d.map(function(x) { return x.msg || ''; }).filter(Boolean).join(', ') : '');
                  return Promise.reject(new Error(msg || 'Erreur'));
                },
                function() {
                  return Promise.reject(new Error('Erreur HTTP ' + r.status));
                }
              );
            }
            return r.json();
          })
          .then(function() {
            courses = courses.filter(function(c) { return c.id !== id; });
            renderCourses();
            populateCourseFilter();
            return loadInscriptions();
          })
          .catch(function(err) {
            alert(err.message || 'Impossible de supprimer ce créneau.');
          })
          .finally(function() {
            btn.disabled = false;
          });
      });
    });

    tbody.querySelectorAll('.btn-edit-course').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var row = btn.closest('tr');
        var id = parseInt(row.getAttribute('data-course-id'), 10);
        var c = courses.find(function(x) { return x.id === id; });
        if (!c) return;
        resetAddCourseForm();
        setAddCourseMode('edit', c);
        var dlg = document.getElementById('dialog-add-course');
        if (dlg && typeof dlg.showModal === 'function') {
          dlg.showModal();
        }
      });
    });
  }

  function renderInscriptions() {
    var tbody = document.querySelector('#inscriptions-table tbody');
    if (!inscriptions.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty">Aucune inscription</td></tr>';
      return;
    }

    tbody.innerHTML = inscriptions.map(function(i, idx) {
      var dateInscription = i.created_at ? new Date(i.created_at).toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' }) : '-';
      var membre = (i.est_membre === true || i.est_membre === 'true' || i.est_membre === 't' || i.est_membre === 1) ? 'Oui' : 'Non';
      var message = i.message 
        ? '<button class="btn-message" data-idx="' + idx + '">Voir</button>' 
        : '-';
      
      // Use course_date from API (fallback to courses lookup if not available)
      var coursDate = i.course_date || '-';
      if (coursDate === '-') {
        var courseInfo = courses.find(function(c) { return c.id === i.course_id; });
        if (courseInfo && courseInfo.date_debut) {
          coursDate = courseInfo.date_debut;
        }
      }
      
      return '<tr>' +
        '<td>' + esc(dateInscription) + '</td>' +
        '<td>' + esc(i.nom) + '</td>' +
        '<td><a href="mailto:' + esc(i.courriel) + '">' + esc(i.courriel) + '</a></td>' +
        '<td>' + esc(i.telephone || '-') + '</td>' +
        '<td>' + esc(i.course_nom || '-') + '</td>' +
        '<td>' + esc(coursDate) + '</td>' +
        '<td>' + membre + '</td>' +
        '<td>' + message + '</td>' +
      '</tr>';
    }).join('');

    // Add click handlers for message buttons
    tbody.querySelectorAll('.btn-message').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-idx'), 10);
        var insc = inscriptions[idx];
        if (insc && insc.message) {
          showMessageModal(insc);
        }
      });
    });
  }

  function showMessageModal(inscription) {
    // Remove existing modal if any
    var existing = document.getElementById('message-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'message-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = 
      '<div class="modal-content">' +
        '<div class="modal-header">' +
          '<h3>Message de ' + esc(inscription.nom) + '</h3>' +
          '<button class="modal-close">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<p><strong>Cours:</strong> ' + esc(inscription.course_nom || '-') + '</p>' +
          '<p><strong>Date:</strong> ' + (inscription.created_at ? new Date(inscription.created_at).toLocaleDateString('fr-CA') : '-') + '</p>' +
          '<hr>' +
          '<p class="message-text">' + esc(inscription.message).replace(/\n/g, '<br>') + '</p>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', function() {
      modal.remove();
    });
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });
  }

  function updateStats() {
    var activeRows = courses.filter(function(c) {
      return !!(c.actif === true || c.actif === 'true' || c.actif === 1 || c.actif === 't');
    });
    var logicalKeys = {};
    activeRows.forEach(function(c) {
      var g = (c.groupe_slug != null && String(c.groupe_slug).trim()) ? String(c.groupe_slug).trim() : '';
      var key = g ? 'g:' + g : 'id:' + c.id;
      logicalKeys[key] = true;
    });
    var logicalCount = Object.keys(logicalKeys).length;
    var totalPlaces = activeRows.reduce(function(sum, c) { return sum + (c.places_restantes || 0); }, 0);

    document.getElementById('stat-courses').textContent = logicalCount;
    var subEl = document.getElementById('stat-course-lines');
    if (subEl) {
      if (!activeRows.length) {
        subEl.textContent = '';
      } else if (activeRows.length > logicalCount) {
        subEl.textContent = activeRows.length + ' lignes créneau, regroupées en ' + logicalCount + ' carte(s) sur la page Cours';
      } else {
        subEl.textContent = activeRows.length + ' ligne' + (activeRows.length > 1 ? 's' : '') + ' au catalogue';
      }
    }
    document.getElementById('stat-inscriptions').textContent = inscriptions.length;
    document.getElementById('stat-places').textContent = totalPlaces;
  }

  function populateCourseFilter() {
    filterCourse.innerHTML = '<option value="">Tous les cours</option>';
    var sorted = sortCoursesForAdmin(courses);
    sorted.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      var g = (c.groupe_slug != null && String(c.groupe_slug).trim()) ? String(c.groupe_slug).trim() : '';
      var creneau = formatCreneau(c);
      var label = c.nom;
      if (creneau !== '—') label += ' — ' + creneau;
      else if (c.slug) label += ' — ' + c.slug;
      else label += ' — #' + c.id;
      if (g) opt.setAttribute('title', 'Groupe : ' + g + ' · slug : ' + (c.slug || ''));
      opt.textContent = label;
      filterCourse.appendChild(opt);
    });
  }

  // Filter inscriptions by course
  filterCourse.addEventListener('change', function() {
    var courseId = this.value;
    loadInscriptions(courseId || null);
  });

  // Ajouter un cours (dialog + POST /api/admin/courses)
  var dialogAddCourse = document.getElementById('dialog-add-course');
  var formAddCourse = document.getElementById('form-add-course');
  var btnAddCourse = document.getElementById('btn-add-course');
  var btnCancelAddCourse = document.getElementById('btn-cancel-add-course');
  var btnSlugFromNom = document.getElementById('btn-slug-from-nom');
  var addCourseError = document.getElementById('add-course-error');

  function slugifyFromNom(s) {
    if (!s) return '';
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\u0300-\u036f/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
  }

  function showAddCourseError(msg) {
    if (!addCourseError) return;
    if (msg) {
      addCourseError.textContent = msg;
      addCourseError.hidden = false;
    } else {
      addCourseError.textContent = '';
      addCourseError.hidden = true;
    }
  }

  function fillCourseFormFromCourse(c) {
    function setVal(id, v) {
      var el = document.getElementById(id);
      if (el) el.value = v != null && v !== undefined ? String(v) : '';
    }
    setVal('add-course-nom', c.nom);
    setVal('add-course-slug', c.slug);
    var disc = document.getElementById('add-course-discipline');
    if (disc) disc.value = c.discipline || 'ceramique';
    var typ = document.getElementById('add-course-type');
    if (typ) typ.value = c.type_cours || 'regulier';
    setVal('add-course-jour', c.jour);
    setVal('add-course-creneau', c.creneau);
    setVal('add-course-heure', c.heure);
    setVal('add-course-duree', c.duree_semaines != null ? c.duree_semaines : '');
    setVal('add-course-debut', c.date_debut);
    setVal('add-course-places', c.places_max != null ? c.places_max : 6);
    setVal('add-course-prix', c.prix);
    setVal('add-course-prof', c.prof);
    setVal('add-course-salle', c.salle);
    var desc = document.getElementById('add-course-desc');
    if (desc) desc.value = c.description != null ? String(c.description) : '';
    setVal('add-course-page', c.page_dediee);
    setVal('add-course-image', c.image_url);
    setVal('add-course-groupe', c.groupe_slug);
    var act = document.getElementById('add-course-actif');
    if (act) {
      act.checked = !!(c.actif === true || c.actif === 'true' || c.actif === 1 || c.actif === 't');
    }
    var bn = document.getElementById('add-course-badge-new');
    if (bn) {
      bn.checked = !!(c.badge_new === true || c.badge_new === 'true' || c.badge_new === 1 || c.badge_new === 't');
    }
  }

  function setAddCourseMode(mode, c) {
    var editId = document.getElementById('edit-course-id');
    var titleEl = document.getElementById('dialog-add-course-title');
    var hintEl = document.getElementById('add-course-dialog-hint');
    var submitBtn = document.getElementById('btn-submit-add-course');
    var multiBlock = document.querySelector('.add-course-creneaux-block');
    if (mode === 'edit' && c) {
      if (editId) editId.value = String(c.id);
      if (titleEl) titleEl.textContent = 'Modifier le cours';
      if (hintEl) {
        hintEl.hidden = false;
        hintEl.textContent =
          'Vous modifiez ce créneau uniquement (ligne n° ' +
          c.id +
          '). Les autres créneaux du même groupe ne sont pas modifiés ici.';
      }
      if (submitBtn) submitBtn.textContent = 'Enregistrer';
      if (multiBlock) multiBlock.setAttribute('hidden', '');
      fillCourseFormFromCourse(c);
    } else {
      if (editId) editId.value = '';
      if (titleEl) titleEl.textContent = 'Nouveau cours';
      if (hintEl) {
        hintEl.hidden = true;
        hintEl.textContent = '';
      }
      if (submitBtn) submitBtn.textContent = 'Créer le cours';
      if (multiBlock) multiBlock.removeAttribute('hidden');
    }
  }

  function resetAddCourseForm() {
    if (!formAddCourse) return;
    formAddCourse.reset();
    var pl = document.getElementById('add-course-places');
    if (pl) pl.value = '6';
    var act = document.getElementById('add-course-actif');
    if (act) act.checked = true;
    var extra = document.getElementById('add-course-creneaux-extra');
    if (extra) extra.innerHTML = '';
    showAddCourseError('');
    setAddCourseMode('create');
  }

  var btnAddCreneauSlot = document.getElementById('btn-add-creneau-slot');
  var tplCreneauRow = document.getElementById('tpl-creneau-row');
  var creneauxExtra = document.getElementById('add-course-creneaux-extra');

  if (btnAddCreneauSlot && tplCreneauRow && creneauxExtra) {
    btnAddCreneauSlot.addEventListener('click', function() {
      var node = tplCreneauRow.content.cloneNode(true);
      creneauxExtra.appendChild(node);
    });
    creneauxExtra.addEventListener('click', function(e) {
      var rm = e.target && e.target.closest && e.target.closest('.btn-remove-creneau');
      if (!rm) return;
      var row = rm.closest('.creneau-extra-row');
      if (row) row.remove();
    });
  }

  if (btnAddCourse && dialogAddCourse) {
    btnAddCourse.addEventListener('click', function() {
      resetAddCourseForm();
      if (typeof dialogAddCourse.showModal === 'function') {
        dialogAddCourse.showModal();
      }
    });
  }

  if (btnCancelAddCourse && dialogAddCourse) {
    btnCancelAddCourse.addEventListener('click', function() {
      resetAddCourseForm();
      if (typeof dialogAddCourse.close === 'function') {
        dialogAddCourse.close();
      }
    });
  }

  if (btnSlugFromNom) {
    btnSlugFromNom.addEventListener('click', function() {
      var nomEl = document.getElementById('add-course-nom');
      var slugEl = document.getElementById('add-course-slug');
      if (nomEl && slugEl) slugEl.value = slugifyFromNom(nomEl.value);
    });
  }

  if (formAddCourse) {
    formAddCourse.addEventListener('submit', function(e) {
      e.preventDefault();
      showAddCourseError('');

      var nom = document.getElementById('add-course-nom');
      var slug = document.getElementById('add-course-slug');
      var placesEl = document.getElementById('add-course-places');
      var dureeEl = document.getElementById('add-course-duree');
      if (!nom || !slug || !placesEl) return;

      var nomT = nom.value.trim();
      var slugT = slug.value.trim().toLowerCase();
      if (!nomT || !slugT) {
        showAddCourseError('Le nom et le slug sont obligatoires.');
        return;
      }

      var dureeRaw = dureeEl ? dureeEl.value.trim() : '';
      var duree_semaines = null;
      if (dureeRaw !== '') {
        duree_semaines = parseInt(dureeRaw, 10);
        if (Number.isNaN(duree_semaines) || duree_semaines < 0) {
          showAddCourseError('Durée (semaines) : nombre entier positif ou vide.');
          return;
        }
      }

      var placesMax = parseInt(placesEl.value, 10);
      if (Number.isNaN(placesMax) || placesMax < 0) {
        showAddCourseError('Places max : nombre entier ≥ 0.');
        return;
      }

      function optStr(id) {
        var el = document.getElementById(id);
        if (!el) return null;
        var t = String(el.value || '').trim();
        return t === '' ? null : t;
      }

      function optStrEl(el) {
        if (!el) return null;
        var t = String(el.value || '').trim();
        return t === '' ? null : t;
      }

      var payload = {
        nom: nomT,
        slug: slugT,
        discipline: document.getElementById('add-course-discipline').value,
        type_cours: document.getElementById('add-course-type').value,
        jour: optStr('add-course-jour'),
        creneau: optStr('add-course-creneau'),
        heure: optStr('add-course-heure'),
        duree_semaines: duree_semaines,
        date_debut: optStr('add-course-debut'),
        places_max: placesMax,
        prix: optStr('add-course-prix'),
        prof: optStr('add-course-prof'),
        salle: optStr('add-course-salle'),
        description: optStr('add-course-desc'),
        page_dediee: optStr('add-course-page'),
        image_url: optStr('add-course-image'),
        actif: document.getElementById('add-course-actif') ? document.getElementById('add-course-actif').checked : true,
        badge_new: document.getElementById('add-course-badge-new') ? document.getElementById('add-course-badge-new').checked : false,
        groupe_slug: optStr('add-course-groupe')
      };

      var extraWrap = document.getElementById('add-course-creneaux-extra');
      var extraRows = extraWrap ? extraWrap.querySelectorAll('.creneau-extra-row') : [];
      var editIdEl = document.getElementById('edit-course-id');
      var editId = editIdEl && editIdEl.value && String(editIdEl.value).trim()
        ? parseInt(editIdEl.value, 10)
        : null;

      if (editId) {
        if (extraRows.length > 0) {
          showAddCourseError('En mode édition, retirez les créneaux supplémentaires du formulaire ou annulez.');
          return;
        }
        var submitBtnEdit = document.getElementById('btn-submit-add-course');
        if (submitBtnEdit) submitBtnEdit.disabled = true;
        fetch(API_URL + '/api/admin/courses/' + editId, {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
          body: JSON.stringify(payload)
        })
          .then(function(r) {
            if (r.status === 401) {
              clearToken();
              showLogin();
              throw new Error('Session expirée');
            }
            return r.json().then(function(j) {
              if (!r.ok) {
                var d = j && j.detail;
                var msg = typeof d === 'string' ? d : (Array.isArray(d) ? d.map(function(x) { return x.msg || ''; }).filter(Boolean).join(', ') : 'Erreur');
                throw new Error(msg || 'Erreur');
              }
              return j;
            });
          })
          .then(function() {
            if (dialogAddCourse && typeof dialogAddCourse.close === 'function') {
              dialogAddCourse.close();
            }
            resetAddCourseForm();
            return loadCourses();
          })
          .catch(function(err) {
            showAddCourseError(err.message || 'Impossible d\'enregistrer le cours.');
          })
          .finally(function() {
            if (submitBtnEdit) submitBtnEdit.disabled = false;
          });
        return;
      }

      if (extraRows.length > 0) {
        var creneaux = [
          {
            jour: optStr('add-course-jour'),
            creneau: optStr('add-course-creneau'),
            heure: optStr('add-course-heure'),
            places_max: placesMax,
            date_debut: optStr('add-course-debut')
          }
        ];
        for (var ei = 0; ei < extraRows.length; ei++) {
          var row = extraRows[ei];
          var pmExtra = parseInt(row.querySelector('.creneau-places').value, 10);
          if (Number.isNaN(pmExtra) || pmExtra < 0) {
            showAddCourseError('Places max : nombre entier ≥ 0 pour chaque créneau supplémentaire.');
            return;
          }
          creneaux.push({
            jour: optStrEl(row.querySelector('.creneau-jour')),
            creneau: optStrEl(row.querySelector('.creneau-creneau')),
            heure: optStrEl(row.querySelector('.creneau-heure')),
            places_max: pmExtra,
            date_debut: optStrEl(row.querySelector('.creneau-date-debut'))
          });
        }
        payload.creneaux = creneaux;
        delete payload.jour;
        delete payload.creneau;
        delete payload.heure;
        delete payload.date_debut;
        delete payload.places_max;
      }

      var submitBtn = document.getElementById('btn-submit-add-course');
      if (submitBtn) submitBtn.disabled = true;

      fetch(API_URL + '/api/admin/courses', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify(payload)
      })
        .then(function(r) {
          if (r.status === 401) {
            clearToken();
            showLogin();
            throw new Error('Session expirée');
          }
          return r.json().then(function(j) {
            if (!r.ok) {
              var d = j && j.detail;
              var msg = typeof d === 'string' ? d : (Array.isArray(d) ? d.map(function(x) { return x.msg || ''; }).filter(Boolean).join(', ') : 'Erreur');
              throw new Error(msg || 'Erreur');
            }
            return j;
          });
        })
        .then(function() {
          if (dialogAddCourse && typeof dialogAddCourse.close === 'function') {
            dialogAddCourse.close();
          }
          resetAddCourseForm();
          return loadCourses();
        })
        .catch(function(err) {
          showAddCourseError(err.message || 'Impossible de créer le cours.');
        })
        .finally(function() {
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  // Export CSV
  exportCsvBtn.addEventListener('click', function() {
    var courseId = filterCourse.value;
    var url = API_URL + '/api/admin/inscriptions/export?format=csv';
    if (courseId) url += '&course_id=' + courseId;

    fetch(url, { headers: authHeaders() })
      .then(function(r) {
        if (r.status === 401) { clearToken(); showLogin(); throw new Error('Session expirée'); }
        return r.blob();
      })
      .then(function(blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'inscriptions.csv';
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(function(err) {
        console.error('Erreur export CSV:', err);
        alert('Erreur lors de l\'export CSV');
      });
  });

  function esc(s) {
    if (s === undefined || s === null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Init
  function init() {
    if (getToken()) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
