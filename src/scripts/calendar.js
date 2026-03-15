/**
 * Calendar Integration - Atelier St-Elme
 * Fetches and displays events from Outlook ICS calendar
 */
(function() {
  'use strict';

  function waitForICAL(callback, maxAttempts) {
    var attempts = 0;
    maxAttempts = maxAttempts || 50;

    function check() {
      if (typeof ICAL !== 'undefined') {
        callback();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(check, 100);
      } else {
        console.error('[Calendar] ICAL.js failed to load');
        showError();
      }
    }
    check();
  }

  var ICS_URL = window.CALENDAR_ICS_URL || '';

  // Liste de proxies CORS à essayer
  var CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];
  var currentProxyIndex = 0;

  function getProxyUrl() {
    return CORS_PROXIES[currentProxyIndex] + encodeURIComponent(ICS_URL);
  }

  var events = [];
  var currentView = 'list';
  var currentMonth = new Date();

  var MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  var MONTHS_SHORT_FR = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ];

  function formatTime(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    return h + 'h' + (m < 10 ? '0' : '') + m;
  }

  function formatDate(date) {
    return date.getDate() + ' ' + MONTHS_FR[date.getMonth()] + ' ' + date.getFullYear();
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  function parseICS(icsData) {
    try {
      var parsed = ICAL.parse(icsData);
      var comp = new ICAL.Component(parsed);
      var vevents = comp.getAllSubcomponents('vevent');

      var today = new Date();
      today.setHours(0, 0, 0, 0);

      var allEvents = vevents.map(function(vevent) {
        var dtstart = vevent.getFirstPropertyValue('dtstart');
        var dtend = vevent.getFirstPropertyValue('dtend');
        var summary = vevent.getFirstPropertyValue('summary');
        var location = vevent.getFirstPropertyValue('location');
        var description = vevent.getFirstPropertyValue('description');

        var startDate = dtstart ? dtstart.toJSDate() : null;
        var endDate = dtend ? dtend.toJSDate() : startDate;

        if (!startDate) return null;

        return {
          title: summary || 'Sans titre',
          start: startDate,
          end: endDate,
          location: location || '',
          description: description || ''
        };
      }).filter(function(e) {
        return e !== null && e.start >= today;
      });

      allEvents.sort(function(a, b) {
        return a.start - b.start;
      });

      console.log('[Calendar] Parsed ' + allEvents.length + ' upcoming events');
      return allEvents;
    } catch (err) {
      console.error('[Calendar] Parse error:', err);
      return [];
    }
  }

  function showLoading() {
    var el = document.getElementById('calendar-loading');
    if (el) el.style.display = 'flex';
  }

  function hideLoading() {
    var el = document.getElementById('calendar-loading');
    if (el) el.style.display = 'none';
  }

  function showError() {
    hideLoading();
    var el = document.getElementById('calendar-error');
    if (el) el.style.display = 'block';
  }

  function showView(view) {
    currentView = view;
    var listView = document.getElementById('calendar-list-view');
    var gridView = document.getElementById('calendar-grid-view');
    var btns = document.querySelectorAll('.view-btn');

    btns.forEach(function(btn) {
      var isActive = btn.getAttribute('data-view') === view;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (view === 'list') {
      if (listView) listView.style.display = 'block';
      if (gridView) gridView.style.display = 'none';
    } else {
      if (listView) listView.style.display = 'none';
      if (gridView) gridView.style.display = 'block';
      renderGrid();
    }
  }

  function renderList() {
    var container = document.getElementById('events-list');
    var noEvents = document.getElementById('no-events');
    if (!container) return;

    if (events.length === 0) {
      container.innerHTML = '';
      if (noEvents) noEvents.style.display = 'block';
      return;
    }

    if (noEvents) noEvents.style.display = 'none';

    container.innerHTML = events.map(function(event, idx) {
      var day = event.start.getDate();
      var month = MONTHS_SHORT_FR[event.start.getMonth()];
      var timeStr = formatTime(event.start);
      if (event.end) {
        timeStr += ' - ' + formatTime(event.end);
      }

      return '<div class="event-card" data-event-idx="' + idx + '">' +
        '<div class="event-date-badge">' +
          '<span class="event-day">' + day + '</span>' +
          '<span class="event-month">' + month + '</span>' +
        '</div>' +
        '<div class="event-info">' +
          '<h3 class="event-title">' + escapeHtml(event.title) + '</h3>' +
          '<p class="event-time">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' +
            timeStr +
          '</p>' +
          (event.location ? '<p class="event-location">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' +
            escapeHtml(event.location) +
          '</p>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    container.querySelectorAll('.event-card').forEach(function(card) {
      card.addEventListener('click', function() {
        var idx = parseInt(this.getAttribute('data-event-idx'), 10);
        if (events[idx]) showModal(events[idx]);
      });
    });
  }

  function renderGrid() {
    var gridContainer = document.getElementById('calendar-grid');
    var monthLabel = document.getElementById('current-month');
    if (!gridContainer) return;

    var year = currentMonth.getFullYear();
    var month = currentMonth.getMonth();

    if (monthLabel) {
      monthLabel.textContent = MONTHS_FR[month] + ' ' + year;
    }

    var firstDay = new Date(year, month, 1);
    var lastDay = new Date(year, month + 1, 0);
    var startDay = firstDay.getDay();
    var daysInMonth = lastDay.getDate();

    var prevMonthLastDay = new Date(year, month, 0).getDate();
    var today = new Date();

    var html = '';

    for (var i = startDay - 1; i >= 0; i--) {
      var d = prevMonthLastDay - i;
      html += '<div class="grid-day other-month"><span class="day-number">' + d + '</span></div>';
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(year, month, day);
      var isToday = isSameDay(date, today);
      var dayEvents = events.filter(function(e) {
        return isSameDay(e.start, date);
      });

      html += '<div class="grid-day' + (isToday ? ' today' : '') + '">';
      html += '<span class="day-number">' + day + '</span>';

      if (dayEvents.length > 0) {
        html += '<div class="day-events">';
        var maxShow = 2;
        dayEvents.slice(0, maxShow).forEach(function(evt, idx) {
          var evtIdx = events.indexOf(evt);
          html += '<div class="grid-event" data-event-idx="' + evtIdx + '">' + escapeHtml(evt.title) + '</div>';
        });
        if (dayEvents.length > maxShow) {
          html += '<span class="more-events">+' + (dayEvents.length - maxShow) + ' autre(s)</span>';
        }
        html += '</div>';
      }

      html += '</div>';
    }

    var totalCells = startDay + daysInMonth;
    var remaining = 7 - (totalCells % 7);
    if (remaining < 7) {
      for (var j = 1; j <= remaining; j++) {
        html += '<div class="grid-day other-month"><span class="day-number">' + j + '</span></div>';
      }
    }

    gridContainer.innerHTML = html;

    gridContainer.querySelectorAll('.grid-event').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(this.getAttribute('data-event-idx'), 10);
        if (events[idx]) showModal(events[idx]);
      });
    });
  }

  function showModal(event) {
    var modal = document.getElementById('event-modal');
    if (!modal) return;

    modal.querySelector('.modal-event-title').textContent = event.title;
    modal.querySelector('.modal-event-date').textContent = formatDate(event.start);
    modal.querySelector('.modal-event-time').textContent = formatTime(event.start) + ' - ' + formatTime(event.end);
    modal.querySelector('.modal-event-location').textContent = event.location || '';
    modal.querySelector('.modal-event-description').innerHTML = event.description ? escapeHtml(event.description).replace(/\n/g, '<br>') : '';

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    modal.querySelector('.modal-close').focus();
  }

  function hideModal() {
    var modal = document.getElementById('event-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fetchWithRetry() {
    var proxyUrl = getProxyUrl();
    console.log('[Calendar] Trying proxy:', CORS_PROXIES[currentProxyIndex]);

    return fetch(proxyUrl)
      .then(function(response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(function(icsData) {
        if (!icsData || icsData.indexOf('BEGIN:VCALENDAR') === -1) {
          throw new Error('Invalid ICS data');
        }
        return icsData;
      })
      .catch(function(err) {
        currentProxyIndex++;
        if (currentProxyIndex < CORS_PROXIES.length) {
          console.log('[Calendar] Retrying with next proxy...');
          return fetchWithRetry();
        }
        throw err;
      });
  }

  function init() {
    if (!ICS_URL) {
      console.error('[Calendar] No ICS URL configured');
      showError();
      return;
    }

    showLoading();

    fetchWithRetry()
      .then(function(icsData) {
        events = parseICS(icsData);
        hideLoading();

        var listView = document.getElementById('calendar-list-view');
        if (listView) listView.style.display = 'block';

        renderList();

        if (currentView === 'grid') {
          renderGrid();
        }
      })
      .catch(function(err) {
        console.error('[Calendar] Fetch error:', err);
        showError();
      });

    document.querySelectorAll('.view-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        showView(this.getAttribute('data-view'));
      });
    });

    var prevBtn = document.getElementById('prev-month');
    var nextBtn = document.getElementById('next-month');

    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderGrid();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderGrid();
      });
    }

    var modal = document.getElementById('event-modal');
    if (modal) {
      modal.querySelector('.modal-close').addEventListener('click', hideModal);
      modal.querySelector('.modal-backdrop').addEventListener('click', hideModal);
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') hideModal();
      });
    }
  }

  function start() {
    waitForICAL(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
