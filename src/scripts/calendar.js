/**
 * Calendar Integration - Atelier St-Elme
 * Fetches and displays events from Outlook ICS calendar
 *
 * - Conserve les évènements passés (vue Mois complète, section « passés » en liste)
 * - Déplie les évènements récurrents (RRULE / EXDATE / RECURRENCE-ID)
 * - Filtre « Cuissons seulement » (titres contenant « cuisson » ou « fournement »)
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

  // Liste de proxies à essayer (Netlify Function en premier, puis fallbacks)
  var CORS_PROXIES = [
    '/.netlify/functions/calendar-proxy?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ];
  var currentProxyIndex = 0;

  function getProxyUrl() {
    return CORS_PROXIES[currentProxyIndex] + encodeURIComponent(ICS_URL);
  }

  // Tous les évènements (passés et à venir), triés par date croissante
  var events = [];
  var currentView = 'list';
  var currentMonth = new Date();
  var showPast = false;      // vue Liste : afficher la section des évènements passés
  var onlyFirings = false;   // filtre « Cuissons seulement »

  // Fenêtre de dépliage des récurrences sans fin (sécurité)
  var RECURRENCE_HORIZON_MONTHS = 18;
  var RECURRENCE_MAX_OCCURRENCES = 500;

  var FIRING_PATTERN = /cuisson|fournement/i;

  var MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  var MONTHS_SHORT_FR = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ];

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function formatTime(date) {
    var h = date.getHours();
    var m = date.getMinutes();
    return h + 'h' + (m < 10 ? '0' : '') + m;
  }

  function formatTimeRange(event) {
    if (event.allDay) return 'Toute la journée';
    var str = formatTime(event.start);
    if (event.end) str += ' - ' + formatTime(event.end);
    return str;
  }

  function formatDate(date) {
    return date.getDate() + ' ' + MONTHS_FR[date.getMonth()] + ' ' + date.getFullYear();
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  function isFiring(title) {
    return FIRING_PATTERN.test(title || '');
  }

  // ---------------------------------------------------------------------------
  // Parsing ICS
  // ---------------------------------------------------------------------------

  function makeEvent(summary, startTime, endTime, location, description) {
    var start = startTime ? startTime.toJSDate() : null;
    if (!start) return null;
    var end = endTime ? endTime.toJSDate() : start;
    var allDay = !!(startTime && startTime.isDate);
    var title = summary || 'Sans titre';

    return {
      title: title,
      start: start,
      end: end,
      allDay: allDay,
      location: location || '',
      description: description || '',
      isFiring: isFiring(title)
    };
  }

  function expandRecurring(icalEvent, horizon) {
    var occurrences = [];
    var iterator;
    try {
      iterator = icalEvent.iterator();
    } catch (err) {
      console.warn('[Calendar] Cannot iterate recurrence for "' + icalEvent.summary + '":', err);
      return [makeEvent(icalEvent.summary, icalEvent.startDate, icalEvent.endDate,
                        icalEvent.location, icalEvent.description)];
    }

    var next;
    var count = 0;
    while ((next = iterator.next()) && count < RECURRENCE_MAX_OCCURRENCES) {
      count++;
      var details;
      try {
        details = icalEvent.getOccurrenceDetails(next);
      } catch (err) {
        continue;
      }
      var occ = makeEvent(details.item.summary, details.startDate, details.endDate,
                          details.item.location, details.item.description);
      if (!occ) continue;
      if (occ.start > horizon) break;
      occurrences.push(occ);
    }
    return occurrences;
  }

  function parseICS(icsData) {
    try {
      var parsed = ICAL.parse(icsData);
      var comp = new ICAL.Component(parsed);
      var vevents = comp.getAllSubcomponents('vevent');

      var horizon = new Date();
      horizon.setMonth(horizon.getMonth() + RECURRENCE_HORIZON_MONTHS);

      // 1) Séparer les évènements maîtres des exceptions (RECURRENCE-ID)
      var masters = {};
      var exceptions = [];
      var singles = [];

      vevents.forEach(function(vevent) {
        var icalEvent = new ICAL.Event(vevent);
        if (icalEvent.isRecurrenceException()) {
          exceptions.push(icalEvent);
        } else if (icalEvent.isRecurring()) {
          masters[icalEvent.uid] = icalEvent;
        } else {
          singles.push(icalEvent);
        }
      });

      // 2) Rattacher les exceptions à leur maître ; orphelines → évènements simples
      exceptions.forEach(function(ex) {
        var master = masters[ex.uid];
        if (master) {
          master.relateException(ex);
        } else {
          singles.push(ex);
        }
      });

      // 3) Construire la liste finale
      var allEvents = [];

      singles.forEach(function(icalEvent) {
        var e = makeEvent(icalEvent.summary, icalEvent.startDate, icalEvent.endDate,
                          icalEvent.location, icalEvent.description);
        if (e) allEvents.push(e);
      });

      Object.keys(masters).forEach(function(uid) {
        allEvents = allEvents.concat(expandRecurring(masters[uid], horizon));
      });

      allEvents.sort(function(a, b) {
        return a.start - b.start;
      });

      var today = startOfToday();
      var upcoming = allEvents.filter(function(e) { return e.start >= today; }).length;
      console.log('[Calendar] Parsed ' + allEvents.length + ' events (' +
                  upcoming + ' upcoming, ' + (allEvents.length - upcoming) + ' past)');
      return allEvents;
    } catch (err) {
      console.error('[Calendar] Parse error:', err);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Sélection / filtres
  // ---------------------------------------------------------------------------

  function visibleEvents() {
    if (!onlyFirings) return events;
    return events.filter(function(e) { return e.isFiring; });
  }

  function isPastEvent(event, today) {
    return event.start < today;
  }

  // ---------------------------------------------------------------------------
  // États
  // ---------------------------------------------------------------------------

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
      renderList();
    } else {
      if (listView) listView.style.display = 'none';
      if (gridView) gridView.style.display = 'block';
      renderGrid();
    }
  }

  function rerender() {
    if (currentView === 'list') {
      renderList();
    } else {
      renderGrid();
    }
  }

  // ---------------------------------------------------------------------------
  // Vue Liste
  // ---------------------------------------------------------------------------

  function eventCardHtml(event, isPast) {
    var idx = events.indexOf(event);
    var day = event.start.getDate();
    var month = MONTHS_SHORT_FR[event.start.getMonth()];
    var year = event.start.getFullYear();
    var showYear = year !== new Date().getFullYear();

    return '<div class="event-card' + (isPast ? ' past' : '') +
             (event.isFiring ? ' firing' : '') + '" data-event-idx="' + idx + '"' +
             ' role="button" tabindex="0">' +
      '<div class="event-date-badge">' +
        '<span class="event-day">' + day + '</span>' +
        '<span class="event-month">' + month + (showYear ? ' ' + year : '') + '</span>' +
      '</div>' +
      '<div class="event-info">' +
        '<h3 class="event-title">' + escapeHtml(event.title) + '</h3>' +
        '<p class="event-time">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' +
          formatTimeRange(event) +
        '</p>' +
        (event.location ? '<p class="event-location">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>' +
          escapeHtml(event.location) +
        '</p>' : '') +
      '</div>' +
    '</div>';
  }

  function bindEventCards(container) {
    container.querySelectorAll('[data-event-idx]').forEach(function(card) {
      var open = function() {
        var idx = parseInt(card.getAttribute('data-event-idx'), 10);
        if (events[idx]) showModal(events[idx]);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });
  }

  function renderList() {
    var container = document.getElementById('events-list');
    var noEvents = document.getElementById('no-events');
    var pastSection = document.getElementById('past-events-section');
    var pastContainer = document.getElementById('past-events-list');
    var toggleBtn = document.getElementById('toggle-past-events');
    if (!container) return;

    var today = startOfToday();
    var visible = visibleEvents();
    var upcoming = visible.filter(function(e) { return !isPastEvent(e, today); });
    var past = visible.filter(function(e) { return isPastEvent(e, today); }).reverse();

    // À venir
    if (upcoming.length === 0) {
      container.innerHTML = '';
      if (noEvents) {
        noEvents.textContent = onlyFirings
          ? 'Aucune cuisson à venir pour le moment.'
          : 'Aucun événement à venir pour le moment.';
        noEvents.style.display = 'block';
      }
    } else {
      if (noEvents) noEvents.style.display = 'none';
      container.innerHTML = upcoming.map(function(e) { return eventCardHtml(e, false); }).join('');
      bindEventCards(container);
    }

    // Bouton et section « passés »
    if (toggleBtn) {
      if (past.length === 0) {
        toggleBtn.style.display = 'none';
      } else {
        toggleBtn.style.display = 'inline-flex';
        toggleBtn.setAttribute('aria-expanded', showPast ? 'true' : 'false');
        toggleBtn.querySelector('.toggle-label').textContent = showPast
          ? 'Masquer les événements passés'
          : 'Voir les événements passés (' + past.length + ')';
      }
    }

    if (pastSection && pastContainer) {
      if (showPast && past.length > 0) {
        pastSection.style.display = 'block';
        pastContainer.innerHTML = past.map(function(e) { return eventCardHtml(e, true); }).join('');
        bindEventCards(pastContainer);
      } else {
        pastSection.style.display = 'none';
        pastContainer.innerHTML = '';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Vue Mois
  // ---------------------------------------------------------------------------

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
    var todayStart = startOfToday();
    var visible = visibleEvents();

    var html = '';

    for (var i = startDay - 1; i >= 0; i--) {
      var d = prevMonthLastDay - i;
      html += '<div class="grid-day other-month"><span class="day-number">' + d + '</span></div>';
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var date = new Date(year, month, day);
      var isToday = isSameDay(date, today);
      var isPast = date < todayStart;
      var dayEvents = visible.filter(function(e) {
        return isSameDay(e.start, date);
      });

      html += '<div class="grid-day' + (isToday ? ' today' : '') + (isPast ? ' past' : '') + '">';
      html += '<span class="day-number">' + day + '</span>';

      if (dayEvents.length > 0) {
        html += '<div class="day-events">';
        var maxShow = 2;
        dayEvents.slice(0, maxShow).forEach(function(evt) {
          var evtIdx = events.indexOf(evt);
          html += '<div class="grid-event' + (isPast ? ' past' : '') + (evt.isFiring ? ' firing' : '') +
                  '" data-event-idx="' + evtIdx + '" role="button" tabindex="0" title="' +
                  escapeHtml(evt.title) + '">' + escapeHtml(evt.title) + '</div>';
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
      var open = function(e) {
        e.stopPropagation();
        var idx = parseInt(el.getAttribute('data-event-idx'), 10);
        if (events[idx]) showModal(events[idx]);
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(e);
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Modale
  // ---------------------------------------------------------------------------

  function showModal(event) {
    var modal = document.getElementById('event-modal');
    if (!modal) return;

    modal.querySelector('.modal-event-title').textContent = event.title;
    modal.querySelector('.modal-event-date').textContent = formatDate(event.start);
    modal.querySelector('.modal-event-time').textContent = formatTimeRange(event);
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

  // ---------------------------------------------------------------------------
  // Chargement
  // ---------------------------------------------------------------------------

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
        console.log('[Calendar] Error:', err.message);
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

        var filterWrap = document.getElementById('calendar-filter');
        if (filterWrap) filterWrap.style.display = 'flex';

        rerender();
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

    var toggleBtn = document.getElementById('toggle-past-events');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        showPast = !showPast;
        renderList();
        if (showPast) {
          var section = document.getElementById('past-events-section');
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    var firingsFilter = document.getElementById('filter-firings');
    if (firingsFilter) {
      firingsFilter.addEventListener('change', function() {
        onlyFirings = this.checked;
        rerender();
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
