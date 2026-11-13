// js/ui.js
import { Storage } from './storage.js';
import { toggleTheme } from './theme.js';
import { LAGOS_LOCATIONS, getLocationById, searchLocations, POPULAR_AREAS_MAPPING, findNearestLGA } from '../data/locations.js';

/* ─── SVG Icons ──────────────────────────────────────────────── */
const Icon = {
  sun: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  drop: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`,
  wind: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
  rain: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>`,
  clock: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  pin: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  gps: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/><circle cx="12" cy="12" r="3"/></svg>`,
  spinner: `<svg class="lga-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
  bell: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  chevronDown: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  check: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  shirt: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/></svg>`,
  logo: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>`
};

export const UI = {
  /* ── Navbar ────────────────────────────────────────────────── */
  renderNavbar(activePage) {
    const navbar = document.createElement('nav');
    navbar.className = 'navbar';
    navbar.setAttribute('role', 'navigation');
    navbar.setAttribute('aria-label', 'Main navigation');

    const pages = [
      { id: 'dashboard',    href: 'dashboard.html',    label: 'Dashboard' },
      { id: 'planner',      href: 'planner.html',      label: 'Planner' },
      { id: 'forecast',     href: 'forecast.html',     label: 'Forecast' },
      { id: 'calendar',     href: 'calendar.html',     label: 'Calendar' },
      { id: 'compare',      href: 'compare.html',      label: 'Compare' },
      { id: 'simulator',    href: 'simulator.html',    label: 'Simulator' },
      { id: 'history',      href: 'history.html',      label: 'History' },
      { id: 'how-it-works', href: 'how-it-works.html', label: 'How It Works' },
      { id: 'about',        href: 'about.html',        label: 'About' },
    ];

    const linksHTML = pages.map(p =>
      `<a href="${p.href}" class="${activePage === p.id ? 'active' : ''}" aria-current="${activePage === p.id ? 'page' : 'false'}">${p.label}</a>`
    ).join('');

    navbar.innerHTML = `
      <a class="nav-brand" href="index.html" aria-label="Smart Weather Laundry Scheduler home">
        <span class="nav-brand-icon" aria-hidden="true">${Icon.logo}</span>
        <span>Smart Laundry</span>
      </a>

      <div class="nav-links" id="navLinks" role="menubar">${linksHTML}</div>

      <div class="nav-controls">
        <button class="theme-toggle" id="themeToggleBtn"
          aria-label="Switch colour theme" aria-pressed="false">
          <span class="theme-toggle-thumb">☀️</span>
        </button>
        <button class="mobile-menu-btn" id="menuBtn"
          aria-expanded="false" aria-controls="navLinks" aria-label="Open navigation menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    `;

    document.body.insertBefore(navbar, document.body.firstChild);

    const menuBtn = document.getElementById('menuBtn');
    const navLinks = document.getElementById('navLinks');
    if (menuBtn && navLinks) {
      menuBtn.addEventListener('click', () => {
        const open = navLinks.classList.toggle('active');
        menuBtn.setAttribute('aria-expanded', open);
      });
    }

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => toggleTheme());
    }

    // Close mobile menu on outside click
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target) && navLinks) {
        navLinks.classList.remove('active');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  },

  /* ── Interactive Searchable LGA Location Selector with Auto-Detect ── */
  renderLocationSelector(containerOrId, options = {}) {
    const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!container) return;

    const initialId = options.activeId || Storage.getActiveLocationId() || 'ikeja';
    let currentLga = getLocationById(initialId);
    let currentMode = Storage.getLocationDetectionMode() || 'manual';
    const onSelect = typeof options.onSelect === 'function' ? options.onSelect : () => {};

    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'lga-selector-container';

    // Top Control Row (Manual Selector Button + Detect Location Button)
    const controlRow = document.createElement('div');
    controlRow.className = 'lga-control-group';

    // 1. Manual Selector Trigger Button
    const triggerBtn = document.createElement('button');
    triggerBtn.type = 'button';
    triggerBtn.className = 'lga-selector-btn';
    triggerBtn.setAttribute('aria-haspopup', 'dialog');
    triggerBtn.setAttribute('aria-expanded', 'false');
    triggerBtn.setAttribute('aria-label', `Selected location: ${currentLga.fullName}. Click to change Lagos LGA manually.`);

    function updateTriggerLabel() {
      const modeLabel = currentMode === 'gps' ? ' (Auto)' : '';
      triggerBtn.innerHTML = `
        <span class="lga-btn-main">
          <span class="lga-btn-icon">${currentMode === 'gps' ? Icon.gps : Icon.pin}</span>
          <span class="lga-btn-text">${currentLga.fullName || currentLga.name + ' LGA'}${modeLabel}</span>
        </span>
        <span class="lga-btn-chevron">${Icon.chevronDown}</span>
      `;
    }
    updateTriggerLabel();

    // 2. "Use My Location" Button
    const detectBtn = document.createElement('button');
    detectBtn.type = 'button';
    detectBtn.className = 'lga-detect-btn';
    detectBtn.setAttribute('aria-label', 'Use my current location via browser GPS');
    detectBtn.innerHTML = `
      <span class="lga-detect-icon">${Icon.gps}</span>
      <span class="lga-detect-text">Use My Location</span>
    `;

    controlRow.appendChild(triggerBtn);
    controlRow.appendChild(detectBtn);

    // 3. Status/Notification Banner (Inline feedback for GPS detection & errors)
    const statusBanner = document.createElement('div');
    statusBanner.className = 'lga-status-banner';
    statusBanner.setAttribute('role', 'status');
    statusBanner.setAttribute('aria-live', 'polite');
    statusBanner.style.display = 'none';

    // 4. Popover Dropdown
    const popover = document.createElement('div');
    popover.className = 'lga-popover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-modal', 'true');
    popover.setAttribute('aria-label', 'Select Lagos Local Government Area');

    // Popover Header
    const header = document.createElement('div');
    header.className = 'lga-popover-header';
    header.innerHTML = `
      <div>
        <div class="lga-popover-title">Select Lagos LGA</div>
        <div class="lga-popover-subtitle">All 20 Local Government Areas · Lagos State</div>
      </div>
      <button type="button" class="lga-popover-close" aria-label="Close location selector">✕</button>
    `;

    // Popover GPS Auto-Detect Quick Action
    const popoverGpsAction = document.createElement('div');
    popoverGpsAction.className = 'lga-popover-gps-action';
    popoverGpsAction.innerHTML = `
      <button type="button" class="lga-popover-detect-btn">
        <span class="lga-detect-icon">${Icon.gps}</span>
        <span>Detect My Location (GPS)</span>
      </button>
    `;

    // Search input
    const searchWrap = document.createElement('div');
    searchWrap.className = 'lga-search-wrap';
    searchWrap.innerHTML = `
      <span class="lga-search-icon">🔍</span>
      <input type="text" class="lga-search-input" placeholder="Search Lagos LGA (e.g. Ikeja, Lekki, Surulere)..." autocomplete="off" spellcheck="false" aria-label="Search Lagos LGA" />
      <button type="button" class="lga-search-clear" aria-label="Clear search">✕</button>
    `;

    // Popular Area Quick Filter Chips
    const chipsSection = document.createElement('div');
    chipsSection.className = 'lga-chips-section';
    chipsSection.innerHTML = `
      <span class="lga-chips-label">Popular:</span>
      <button type="button" class="lga-chip" data-lga="ikeja">Ikeja</button>
      <button type="button" class="lga-chip" data-lga="eti-osa">Lekki / VI</button>
      <button type="button" class="lga-chip" data-lga="lagos-mainland">Yaba</button>
      <button type="button" class="lga-chip" data-lga="surulere">Surulere</button>
      <button type="button" class="lga-chip" data-lga="amuwo-odofin">Festac</button>
      <button type="button" class="lga-chip" data-lga="ikorodu">Ikorodu</button>
      <button type="button" class="lga-chip" data-lga="alimosho">Alimosho</button>
      <button type="button" class="lga-chip" data-lga="badagry">Badagry</button>
      <button type="button" class="lga-chip" data-lga="epe">Epe</button>
    `;

    // Scrollable LGA List
    const listEl = document.createElement('ul');
    listEl.className = 'lga-list';
    listEl.setAttribute('role', 'listbox');
    listEl.setAttribute('aria-label', 'Lagos Local Government Areas list');

    // Popover Footer
    const footer = document.createElement('div');
    footer.className = 'lga-popover-footer';
    footer.innerHTML = `
      <span>20 Official LGAs</span>
      <span>Lagos State, Nigeria</span>
    `;

    popover.appendChild(header);
    popover.appendChild(popoverGpsAction);
    popover.appendChild(searchWrap);
    popover.appendChild(chipsSection);
    popover.appendChild(listEl);
    popover.appendChild(footer);

    wrapper.appendChild(controlRow);
    wrapper.appendChild(statusBanner);
    wrapper.appendChild(popover);
    container.appendChild(wrapper);

    const searchInput = searchWrap.querySelector('.lga-search-input');
    const searchClear = searchWrap.querySelector('.lga-search-clear');
    const closeBtn = header.querySelector('.lga-popover-close');
    const popoverDetectBtn = popoverGpsAction.querySelector('.lga-popover-detect-btn');

    let highlightedIndex = -1;
    let currentFilteredList = [...LAGOS_LOCATIONS];
    let statusTimeout = null;

    // Helper: Display status message
    function showStatusMessage({ type = 'info', title = '', message = '', showManualBtn = false, autoHide = false }) {
      if (statusTimeout) {
        clearTimeout(statusTimeout);
        statusTimeout = null;
      }

      statusBanner.className = `lga-status-banner status-${type}`;
      statusBanner.innerHTML = `
        <div class="lga-status-content">
          <span class="lga-status-icon">${type === 'loading' ? Icon.spinner : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
          <div class="lga-status-body">
            ${title ? `<div class="lga-status-title">${title}</div>` : ''}
            <div class="lga-status-desc">${message}</div>
            ${showManualBtn ? `
              <button type="button" class="lga-status-action-btn" id="statusManualSelectBtn">
                Select Lagos LGA Manually →
              </button>
            ` : ''}
          </div>
          <button type="button" class="lga-status-dismiss" aria-label="Dismiss notification">✕</button>
        </div>
      `;
      statusBanner.style.display = 'block';

      const dismissBtn = statusBanner.querySelector('.lga-status-dismiss');
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          statusBanner.style.display = 'none';
        });
      }

      const manualBtn = statusBanner.querySelector('#statusManualSelectBtn');
      if (manualBtn) {
        manualBtn.addEventListener('click', () => {
          statusBanner.style.display = 'none';
          openPopover();
        });
      }

      if (autoHide) {
        statusTimeout = setTimeout(() => {
          statusBanner.style.display = 'none';
        }, 5000);
      }
    }

    // Helper: Update detect button visual states
    function setDetectBtnState(state, customText = '') {
      if (state === 'loading') {
        detectBtn.classList.add('is-loading');
        detectBtn.disabled = true;
        detectBtn.innerHTML = `
          <span class="lga-detect-icon">${Icon.spinner}</span>
          <span class="lga-detect-text">Detecting location...</span>
        `;
        if (popoverDetectBtn) {
          popoverDetectBtn.disabled = true;
          popoverDetectBtn.innerHTML = `<span class="lga-detect-icon">${Icon.spinner}</span> <span>Detecting location...</span>`;
        }
      } else if (state === 'success') {
        detectBtn.classList.remove('is-loading');
        detectBtn.classList.add('is-success');
        detectBtn.disabled = false;
        detectBtn.innerHTML = `
          <span class="lga-detect-icon">${Icon.check}</span>
          <span class="lga-detect-text">${customText || 'Location Detected'}</span>
        `;
        if (popoverDetectBtn) {
          popoverDetectBtn.disabled = false;
          popoverDetectBtn.innerHTML = `<span class="lga-detect-icon">${Icon.check}</span> <span>${customText || 'Location Detected'}</span>`;
        }
      } else if (state === 'error') {
        detectBtn.classList.remove('is-loading');
        detectBtn.classList.remove('is-success');
        detectBtn.disabled = false;
        detectBtn.innerHTML = `
          <span class="lga-detect-icon">${Icon.gps}</span>
          <span class="lga-detect-text">${customText || 'Try Again'}</span>
        `;
        if (popoverDetectBtn) {
          popoverDetectBtn.disabled = false;
          popoverDetectBtn.innerHTML = `<span class="lga-detect-icon">${Icon.gps}</span> <span>${customText || 'Try Again'}</span>`;
        }
      } else {
        // Default
        detectBtn.classList.remove('is-loading', 'is-success');
        detectBtn.disabled = false;
        detectBtn.innerHTML = `
          <span class="lga-detect-icon">${Icon.gps}</span>
          <span class="lga-detect-text">Use My Location</span>
        `;
        if (popoverDetectBtn) {
          popoverDetectBtn.disabled = false;
          popoverDetectBtn.innerHTML = `<span class="lga-detect-icon">${Icon.gps}</span> <span>Detect My Location (GPS)</span>`;
        }
      }
    }

    // Geolocation Trigger Handler
    function handleDetectLocation() {
      if (!('geolocation' in navigator) || !navigator.geolocation) {
        setDetectBtnState('error', 'Unsupported');
        showStatusMessage({
          type: 'error',
          title: 'LOCATION DETECTION NOT SUPPORTED',
          message: 'Your browser does not support automatic location detection. Please select your Lagos LGA manually.',
          showManualBtn: true
        });
        return;
      }

      setDetectBtnState('loading');
      showStatusMessage({
        type: 'loading',
        title: 'LOCATING YOU...',
        message: '📍 Detecting your location via GPS... Please allow location permission if prompted.'
      });

      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;

          const matchResult = findNearestLGA(lat, lon);

          if (!matchResult.isWithinLagos) {
            setDetectBtnState('error', 'Outside Lagos');
            showStatusMessage({
              type: 'warning',
              title: 'LOCATION OUTSIDE SUPPORTED AREA',
              message: 'We detected your location, but it is outside the currently supported Lagos State coverage.',
              showManualBtn: true
            });
            return;
          }

          const matchedLga = matchResult.lga;
          setDetectBtnState('success', 'Location Detected');

          showStatusMessage({
            type: 'success',
            title: 'LOCATION DETECTED',
            message: `📍 ${matchedLga.name} LGA · Location detected automatically.`,
            autoHide: true
          });

          setTimeout(() => {
            setDetectBtnState('default');
          }, 3500);

          // Select matched LGA automatically in 'gps' mode
          selectLga(matchedLga, 'gps', { lat, lon });
        },
        (error) => {
          let title = 'LOCATION DETECTION ERROR';
          let message = 'We could not determine your location. Please select your Lagos LGA manually.';

          if (error.code === 1) { // PERMISSION_DENIED
            title = 'LOCATION PERMISSION DENIED';
            message = 'Location permission was denied. You can select your Lagos LGA manually.';
          } else if (error.code === 2) { // POSITION_UNAVAILABLE
            title = 'LOCATION UNAVAILABLE';
            message = "We couldn't determine your location. Please select your Lagos LGA manually.";
          } else if (error.code === 3) { // TIMEOUT
            title = 'LOCATION DETECTION TIMED OUT';
            message = 'Location detection timed out. Please try again or select your LGA manually.';
          }

          setDetectBtnState('error', 'Try Again');
          showStatusMessage({
            type: 'error',
            title: title,
            message: message,
            showManualBtn: true
          });
        },
        geoOptions
      );
    }

    detectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDetectLocation();
    });

    popoverDetectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopover();
      handleDetectLocation();
    });

    // Helper: Render list items
    function renderList(items) {
      currentFilteredList = items;
      highlightedIndex = -1;
      listEl.innerHTML = '';

      if (items.length === 0) {
        listEl.innerHTML = `
          <li class="lga-empty" role="status">
            <span class="lga-empty-icon">📍</span>
            <p>No Lagos LGA found matching "<strong>${escapeHtml(searchInput.value)}</strong>"</p>
          </li>
        `;
        return;
      }

      items.forEach((lga) => {
        const isSelected = lga.id === currentLga.id;
        const areasText = lga.popularAreas && lga.popularAreas.length > 0 ? lga.popularAreas.join(', ') : '';

        const li = document.createElement('li');
        li.className = `lga-item ${isSelected ? 'is-selected' : ''}`;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        li.setAttribute('tabindex', '-1');
        li.dataset.lgaId = lga.id;

        li.innerHTML = `
          <div class="lga-item-left">
            <span class="lga-item-pin">${Icon.pin}</span>
            <div class="lga-item-info">
              <div class="lga-item-name">${lga.name} <span style="font-size:0.75rem;font-weight:500;color:var(--color-text-tertiary);">LGA</span></div>
              ${areasText ? `<div class="lga-item-areas" title="${escapeHtml(areasText)}">${escapeHtml(areasText)}</div>` : ''}
            </div>
          </div>
          <span class="lga-item-check">${Icon.check}</span>
        `;

        li.addEventListener('click', () => {
          selectLga(lga, 'manual');
        });

        listEl.appendChild(li);
      });
    }

    // Helper: Select an LGA (manual or GPS)
    function selectLga(lga, mode = 'manual', userCoords = null) {
      if (!lga) return;
      currentLga = lga;
      currentMode = mode;

      Storage.setActiveLocationId(lga.id, mode);
      updateTriggerLabel();
      triggerBtn.setAttribute('aria-label', `Selected location: ${lga.fullName}. Click to change Lagos LGA manually.`);

      closePopover();

      // Dispatch custom event for cross-component sync
      window.dispatchEvent(new CustomEvent('smartlaundry:lga-change', {
        detail: {
          ...lga,
          detectionMode: mode,
          userCoords: userCoords
        }
      }));

      // Call page callback
      onSelect(lga, mode);
    }

    // Open/Close Popover
    function openPopover() {
      popover.classList.add('is-open');
      triggerBtn.classList.add('is-active');
      triggerBtn.setAttribute('aria-expanded', 'true');
      renderList(LAGOS_LOCATIONS);
      searchInput.value = '';
      searchClear.style.display = 'none';
      setTimeout(() => searchInput.focus(), 50);
    }

    function closePopover() {
      popover.classList.remove('is-open');
      triggerBtn.classList.remove('is-active');
      triggerBtn.setAttribute('aria-expanded', 'false');
    }

    // Trigger button toggle
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popover.classList.contains('is-open')) {
        closePopover();
      } else {
        openPopover();
      }
    });

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePopover();
    });

    // Search input typing
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      searchClear.style.display = q ? 'flex' : 'none';
      const results = searchLocations(q);
      renderList(results);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      renderList(LAGOS_LOCATIONS);
      searchInput.focus();
    });

    // Popular area quick chips
    chipsSection.querySelectorAll('.lga-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const lgaId = chip.dataset.lga;
        const lga = getLocationById(lgaId);
        if (lga) selectLga(lga, 'manual');
      });
    });

    // Keyboard navigation
    wrapper.addEventListener('keydown', (e) => {
      if (!popover.classList.contains('is-open')) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          openPopover();
        }
        return;
      }

      const items = listEl.querySelectorAll('.lga-item');
      if (e.key === 'Escape') {
        e.preventDefault();
        closePopover();
        triggerBtn.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length === 0) return;
        highlightedIndex = (highlightedIndex + 1) % items.length;
        updateHighlight(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length === 0) return;
        highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
        updateHighlight(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < currentFilteredList.length) {
          selectLga(currentFilteredList[highlightedIndex], 'manual');
        } else if (currentFilteredList.length === 1) {
          selectLga(currentFilteredList[0], 'manual');
        }
      }
    });

    function updateHighlight(items) {
      items.forEach((it, i) => {
        if (i === highlightedIndex) {
          it.classList.add('is-highlighted');
          it.scrollIntoView({ block: 'nearest' });
        } else {
          it.classList.remove('is-highlighted');
        }
      });
    }

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        closePopover();
      }
    });

    // Listen to external LGA change events to keep in sync
    window.addEventListener('smartlaundry:lga-change', (e) => {
      if (e.detail && e.detail.id && (e.detail.id !== currentLga.id || e.detail.detectionMode !== currentMode)) {
        currentLga = e.detail;
        currentMode = e.detail.detectionMode || Storage.getLocationDetectionMode() || 'manual';
        updateTriggerLabel();
      }
    });

    // Initial render of list
    renderList(LAGOS_LOCATIONS);

    return {
      setLGA: (id, mode = 'manual') => {
        const lga = getLocationById(id);
        if (lga) selectLga(lga, mode);
      },
      detectLocation: () => handleDetectLocation(),
      getLGA: () => currentLga,
      getMode: () => currentMode
    };
  },

  /* ── Legacy Select Population Helper ──────────────────────── */
  populateLocationSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    
    // Add all 20 LGAs as options
    LAGOS_LOCATIONS.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.id;
      opt.textContent = `${loc.name} LGA`;
      select.appendChild(opt);
    });
    
    const saved = Storage.getActiveLocationId();
    if (select.querySelector(`option[value="${saved}"]`)) {
      select.value = saved;
    }
  },

  /* ── Loading skeletons ─────────────────────────────────────── */
  showLoading(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="card skeleton" style="height:220px;margin-bottom:var(--spacing-4);"></div>
      <div class="card skeleton" style="height:160px;margin-bottom:var(--spacing-4);"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--spacing-3);">
        <div class="card skeleton" style="height:100px;"></div>
        <div class="card skeleton" style="height:100px;"></div>
      </div>
    `;
  },

  /* ── Error state ───────────────────────────────────────────── */
  showError(containerId, message) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div class="card" style="border-left:3px solid var(--color-poor);">
        <div class="state-container" style="padding:var(--spacing-8);">
          <span class="state-icon">⚠️</span>
          <p class="state-title">Weather Data Unavailable</p>
          <p class="state-desc">${message}</p>
        </div>
      </div>
    `;
  },

  /* ── Score breakdown table ─────────────────────────────────── */
  renderScoreBreakdown(factors) {
    if (!factors || !factors.length) return '';
    const rows = factors.map(f => {
      const pct = Math.round((f.contribution / f.max) * 100);
      const color = pct >= 70 ? 'var(--color-excellent)' :
                    pct >= 40 ? 'var(--color-moderate)' :
                                'var(--color-poor)';
      return `
        <div class="factor-row">
          <div>
            <div class="factor-name">${f.name}</div>
            <div class="factor-reading">${f.reading}</div>
            <div class="factor-bar-track">
              <div class="factor-bar-fill" style="width:${pct}%;background:${color};"></div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div class="factor-effect" style="color:${color};">+${f.contribution}</div>
            <div style="font-size:0.7rem;color:var(--color-text-tertiary);">/ ${f.max}</div>
          </div>
        </div>`;
    }).join('');
    return `<div>${rows}</div>`;
  },

  /* ── Score ring SVG ────────────────────────────────────────── */
  renderScoreRing(score, cssClass) {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    return `
      <div class="score-ring-wrap" role="img" aria-label="Drying score: ${score} out of 100">
        <svg class="score-ring-svg" width="140" height="140" viewBox="0 0 140 140">
          <circle class="score-ring-track" cx="70" cy="70" r="${r}"/>
          <circle class="score-ring-fill ${cssClass}"
            cx="70" cy="70" r="${r}"
            stroke-dasharray="${circ.toFixed(1)}"
            stroke-dashoffset="${circ.toFixed(1)}"
            data-offset="${offset.toFixed(1)}"/>
        </svg>
        <div class="score-ring-center">
          <div class="score-ring-number">${score}</div>
          <div class="score-ring-label">/ 100</div>
        </div>
      </div>`;
  },

  /* ── Animate score rings on page ───────────────────────────── */
  animateScoreRings() {
    requestAnimationFrame(() => {
      document.querySelectorAll('.score-ring-fill[data-offset]').forEach(el => {
        el.style.strokeDashoffset = el.dataset.offset;
      });
    });
  },

  /* ── Weather condition text → WMO code mapping ─────────────── */
  getConditionText(weathercode) {
    if (weathercode === 0)  return 'Clear Sky';
    if (weathercode <= 2)   return 'Partly Cloudy';
    if (weathercode === 3)  return 'Overcast';
    if (weathercode <= 49)  return 'Foggy / Misty';
    if (weathercode <= 69)  return 'Drizzle';
    if (weathercode <= 79)  return 'Snow';
    if (weathercode <= 99)  return 'Thunderstorm';
    return 'Unknown';
  },

  getConditionIcon(weathercode) {
    if (weathercode === 0)  return '☀️';
    if (weathercode <= 2)   return '⛅';
    if (weathercode === 3)  return '☁️';
    if (weathercode <= 49)  return '🌫️';
    if (weathercode <= 69)  return '🌦️';
    if (weathercode <= 99)  return '⛈️';
    return '🌡️';
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
