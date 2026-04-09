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
      tbody.innerHTML = '<tr><td colspan="8" class="empty">Aucun cours</td></tr>';
      return;
    }

    tbody.innerHTML = courses.map(function(c) {
      var isActif = !!(c.actif === true || c.actif === 'true' || c.actif === 1 || c.actif === 't');
      var statusClass = isActif ? 'status-active' : 'status-inactive';
      var inscrits = Math.max(0, (c.places_max || 0) - (c.places_restantes || 0));
      var placesClass = c.places_restantes === 0 ? 'places-full' : (c.places_restantes <= 2 ? 'places-low' : '');
      var rowMuted = isActif ? '' : ' course-row-inactive';

      return '<tr class="' + rowMuted.trim() + '" data-course-id="' + c.id + '" data-places-max="' + (c.places_max || 0) + '">' +
        '<td class="course-name">' + esc(c.nom) + '</td>' +
        '<td><span class="badge badge-' + esc(c.discipline) + '">' + esc(c.discipline) + '</span></td>' +
        '<td>' + esc(c.jour || '-') + '</td>' +
        '<td>' + esc(c.heure || '-') + '</td>' +
        '<td>' + esc(c.date_debut || '-') + '</td>' +
        '<td class="places-cell ' + placesClass + '">' +
          '<div class="places-edit" title="Places restantes = capacité − inscriptions. Modifier ajuste la capacité du cours.">' +
            '<input type="number" class="form-input places-input" min="0" step="1" ' +
              'data-inscrits="' + inscrits + '" ' +
              'value="' + (c.places_restantes != null ? c.places_restantes : 0) + '" ' +
              'aria-label="Places restantes pour ' + esc(c.nom) + '" />' +
            '<span class="places-inscrits-hint">' + inscrits + ' insc.</span>' +
            '<button type="button" class="btn btn-outline btn-sm btn-save-places">Enregistrer</button>' +
          '</div>' +
        '</td>' +
        '<td>' + esc(c.prix || '-') + '</td>' +
        '<td class="actif-cell">' +
          '<label class="actif-label">' +
            '<input type="checkbox" class="course-actif-cb" ' + (isActif ? 'checked' : '') + ' aria-label="Cours visible sur le site pour ' + esc(c.nom) + '" />' +
            '<span>Visible</span>' +
          '</label>' +
          '<span class="status ' + statusClass + ' actif-pill">' + (isActif ? 'Actif' : 'Masqué') + '</span>' +
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
    var activeCourses = courses.filter(function(c) {
      return !!(c.actif === true || c.actif === 'true' || c.actif === 1 || c.actif === 't');
    }).length;
    var totalPlaces = courses
      .filter(function(c) {
        return !!(c.actif === true || c.actif === 'true' || c.actif === 1 || c.actif === 't');
      })
      .reduce(function(sum, c) { return sum + (c.places_restantes || 0); }, 0);
    
    document.getElementById('stat-courses').textContent = activeCourses;
    document.getElementById('stat-inscriptions').textContent = inscriptions.length;
    document.getElementById('stat-places').textContent = totalPlaces;
  }

  function populateCourseFilter() {
    filterCourse.innerHTML = '<option value="">Tous les cours</option>';
    courses.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nom;
      filterCourse.appendChild(opt);
    });
  }

  // Filter inscriptions by course
  filterCourse.addEventListener('change', function() {
    var courseId = this.value;
    loadInscriptions(courseId || null);
  });

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
