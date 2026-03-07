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
    });
  });

  // Load Data
  function loadData() {
    loadCourses();
    loadInscriptions();
  }

  function loadCourses() {
    fetch(API_URL + '/api/admin/courses', { headers: authHeaders() })
      .then(function(r) {
        if (r.status === 401) { clearToken(); showLogin(); throw new Error('Session expirée'); }
        return r.json();
      })
      .then(function(data) {
        courses = data;
        renderCourses();
        updateStats();
        populateCourseFilter();
      })
      .catch(function(err) {
        console.error('Erreur chargement cours:', err);
      });
  }

  function loadInscriptions(courseId) {
    var url = API_URL + '/api/admin/inscriptions';
    if (courseId) url += '?course_id=' + courseId;

    fetch(url, { headers: authHeaders() })
      .then(function(r) {
        if (r.status === 401) { clearToken(); showLogin(); throw new Error('Session expirée'); }
        return r.json();
      })
      .then(function(data) {
        inscriptions = data;
        renderInscriptions();
        updateStats();
      })
      .catch(function(err) {
        console.error('Erreur chargement inscriptions:', err);
      });
  }

  function renderCourses() {
    var tbody = document.querySelector('#courses-table tbody');
    if (!courses.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty">Aucun cours</td></tr>';
      return;
    }

    tbody.innerHTML = courses.map(function(c) {
      var statusClass = c.actif ? 'status-active' : 'status-inactive';
      var statusText = c.actif ? 'Actif' : 'Inactif';
      var placesClass = c.places_restantes === 0 ? 'places-full' : (c.places_restantes <= 2 ? 'places-low' : '');
      
      return '<tr>' +
        '<td class="course-name">' + esc(c.nom) + '</td>' +
        '<td><span class="badge badge-' + esc(c.discipline) + '">' + esc(c.discipline) + '</span></td>' +
        '<td>' + esc(c.jour || '-') + '</td>' +
        '<td>' + esc(c.heure || '-') + '</td>' +
        '<td>' + esc(c.date_debut || '-') + '</td>' +
        '<td class="' + placesClass + '">' + c.places_restantes + '/' + c.places_max + '</td>' +
        '<td>' + esc(c.prix || '-') + '</td>' +
        '<td><span class="status ' + statusClass + '">' + statusText + '</span></td>' +
      '</tr>';
    }).join('');
  }

  function renderInscriptions() {
    var tbody = document.querySelector('#inscriptions-table tbody');
    if (!inscriptions.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">Aucune inscription</td></tr>';
      return;
    }

    tbody.innerHTML = inscriptions.map(function(i) {
      var date = i.created_at ? new Date(i.created_at).toLocaleDateString('fr-CA') : '-';
      var membre = i.est_membre ? 'Oui' : 'Non';
      var message = i.message ? '<span class="has-message" title="' + esc(i.message) + '">Voir</span>' : '-';
      
      return '<tr>' +
        '<td>' + esc(date) + '</td>' +
        '<td>' + esc(i.nom) + '</td>' +
        '<td><a href="mailto:' + esc(i.courriel) + '">' + esc(i.courriel) + '</a></td>' +
        '<td>' + esc(i.telephone || '-') + '</td>' +
        '<td>' + esc(i.course_nom || '-') + '</td>' +
        '<td>' + membre + '</td>' +
        '<td>' + message + '</td>' +
      '</tr>';
    }).join('');
  }

  function updateStats() {
    var activeCourses = courses.filter(function(c) { return c.actif; }).length;
    var totalPlaces = courses.reduce(function(sum, c) { return sum + (c.places_restantes || 0); }, 0);
    
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
