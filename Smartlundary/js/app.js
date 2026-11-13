// js/app.js
import { fetchWeather } from './weather.js';
import { calculateLaundryRecommendation } from './laundry.js';
import { Storage } from './storage.js';
import { UI } from './ui.js';
import { formatTime, formatDuration, getLagosNow } from './utils.js';
import { Notifications } from './notifications.js';
import { getLocationById } from '../data/locations.js';

let currentLocationSelector = null;

async function initDashboard() {
  UI.renderNavbar('dashboard');

  // Notification toggle
  const notifToggle = document.getElementById('notifToggle');
  if (notifToggle) {
    notifToggle.checked = Storage.get('notifications_enabled', false);
    notifToggle.addEventListener('change', async (e) => {
      if (e.target.checked) {
        const granted = await Notifications.requestPermission();
        if (granted) {
          Storage.set('notifications_enabled', true);
          Notifications.send('Notifications enabled', { body: 'You will be notified about drying windows and rain risks.' });
        } else {
          e.target.checked = false;
          Storage.set('notifications_enabled', false);
          alert('Notification permission denied by browser.');
        }
      } else {
        Storage.set('notifications_enabled', false);
      }
    });
  }

  const activeId = Storage.getActiveLocationId();
  await loadDashboardData(activeId);
}

async function loadDashboardData(locId, mode = null) {
  const containerId = 'dashboardContent';
  const effectiveId = locId || Storage.getActiveLocationId() || 'ikeja';
  const lga = getLocationById(effectiveId);

  // Set active LGA in storage
  Storage.setActiveLocationId(lga.id, mode);

  // Show loading skeleton while fetching
  UI.showLoading(containerId);

  try {
    const weatherData = await fetchWeather(lga.id);
    const defaultPreferences = { fabric: 'cotton', washingMethod: 'normal_spin', loadSize: 'medium', dryingPreference: 'outdoor' };
    const recommendation = calculateLaundryRecommendation(weatherData, defaultPreferences);
    
    renderDashboardContent(containerId, recommendation, lga, weatherData, false);
    
    // Save for offline/cache usage
    Storage.set(`weather_${lga.id}`, { timestamp: Date.now(), data: weatherData });
    Storage.set('last_weather', { timestamp: Date.now(), lgaId: lga.id, data: weatherData });
  } catch (error) {
    console.warn(`Live weather failed for ${lga.name}, checking offline cache...`, error);
    const cached = Storage.get(`weather_${lga.id}`) || Storage.get('last_weather');
    
    if (cached && cached.data) {
      const timeAgo = Math.round((Date.now() - cached.timestamp) / 60000);
      const defaultPreferences = { fabric: 'cotton', washingMethod: 'normal_spin', loadSize: 'medium', dryingPreference: 'outdoor' };
      const recommendation = calculateLaundryRecommendation(cached.data, defaultPreferences);
      renderDashboardContent(containerId, recommendation, lga, cached.data, true, timeAgo);
    } else {
      const el = document.getElementById(containerId);
      el.innerHTML = `
        <div class="card" style="text-align:center;padding:var(--spacing-10);">
          <span style="font-size:3rem;display:block;margin-bottom:var(--spacing-4);">📡</span>
          <h3>Weather Data Unavailable</h3>
          <p>We couldn't retrieve the latest forecast for <strong>${lga.fullName}</strong>.<br>Please check your connection and try again.</p>
          <button class="btn btn-primary" style="margin-top:var(--spacing-4);" id="retryWeatherBtn">Try Again</button>
        </div>`;
      
      const retryBtn = document.getElementById('retryWeatherBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => loadDashboardData(lga.id));
      }
    }
  }
}

function renderDashboardContent(containerId, data, lga, weatherData, isOffline, cacheMinutes) {
  const container = document.getElementById(containerId);
  container.innerHTML = getDashboardHTML(data, lga, weatherData, isOffline, cacheMinutes);
  UI.animateScoreRings();

  // Mount the interactive Searchable LGA Location Selector
  const selectorMount = document.getElementById('dashboardLgaSelectorMount');
  if (selectorMount) {
    currentLocationSelector = UI.renderLocationSelector(selectorMount, {
      activeId: lga.id,
      onSelect: (selectedLga, selectedMode) => {
        loadDashboardData(selectedLga.id, selectedMode);
      }
    });
  }

  // Score breakdown toggle
  const toggleBtn = document.getElementById('toggleBreakdown');
  const breakdownEl = document.getElementById('scoreBreakdown');
  if (toggleBtn && breakdownEl) {
    toggleBtn.addEventListener('click', () => {
      const open = breakdownEl.style.display === 'none' || !breakdownEl.style.display;
      breakdownEl.style.display = open ? 'block' : 'none';
      toggleBtn.textContent = open ? 'Hide Details' : 'Why this score?';
      toggleBtn.setAttribute('aria-expanded', open);
    });
  }
}

function getGreeting() {
  const lagosNow = getLagosNow();
  const h = lagosNow.hour;
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getActionChip(data) {
  const { cssClass, rainRisk, bestWindow } = data;
  const lagosNow = getLagosNow();
  const currentHour = lagosNow.hour;

  if (rainRisk && rainRisk.risk >= 4) {
    return `<span class="action-chip bring-inside">⚠ Bring Clothes Inside — Rain Risk</span>`;
  }
  if (bestWindow && !bestWindow.hasSafeWindow) {
    return `<span class="action-chip dry-indoors">🏠 Dry Indoors Recommended</span>`;
  }
  if (cssClass === 'poor') {
    return `<span class="action-chip dry-indoors">🏠 Dry Indoors Recommended</span>`;
  }
  if (bestWindow && bestWindow.hasSafeWindow) {
    const startH = new Date(bestWindow.start).getHours();
    if (startH <= currentHour && cssClass !== 'poor') {
      return `<span class="action-chip dry-now">✓ Dry Now — Window Active</span>`;
    }
    return `<span class="action-chip wash-now">☀ Wash Now — Dry from ${formatTime(bestWindow.start)}</span>`;
  }
  if (cssClass === 'moderate') {
    return `<span class="action-chip wait">⏱ Drying May Take Longer</span>`;
  }
  return `<span class="action-chip dry-now">✓ Good to Dry Outdoors</span>`;
}

function getTimelineHTML(bestWindow) {
  if (!bestWindow) {
    return `
      <div class="drying-window-card state-unsafe">
        <div class="drying-window-header">
          <div>
            <div class="drying-window-title">📡 NO FORECAST WINDOW</div>
            <div class="drying-window-time" style="font-size:1.1rem;">Forecast Data Unavailable</div>
          </div>
        </div>
        <p class="window-explanation-text">We could not determine drying windows due to missing hourly forecast telemetry.</p>
        <div class="window-rec-box rec-caution">
          <span>⚠️ Check your internet connection or retry in a few moments.</span>
        </div>
      </div>`;
  }

  // 1. Safe Full Window
  if (bestWindow.hasSafeWindow && !bestWindow.isShortWindow) {
    const start = new Date(bestWindow.start);
    const end   = new Date(bestWindow.end);
    const startH = start.getHours();
    const endH   = end.getHours();

    const dayStart = 6, dayEnd = 20;
    const leftPct  = Math.max(0, Math.min(100, ((startH - dayStart) / (dayEnd - dayStart)) * 100));
    const widthPct = Math.max(8, Math.min(100 - leftPct, ((endH - startH) / (dayEnd - dayStart)) * 100));
    const hours = ['6AM', '9AM', '12PM', '3PM', '6PM', '8PM'];

    return `
      <div class="drying-window-card state-${bestWindow.rainAfterWindow ? 'caution' : 'optimal'}">
        <div class="drying-window-header">
          <div>
            <div class="drying-window-title">${bestWindow.icon || '☀️'} ${bestWindow.title || 'BEST DRYING WINDOW'}</div>
            <div class="drying-window-time">${formatTime(bestWindow.start)} — ${formatTime(bestWindow.end)}</div>
          </div>
          <div>
            <span class="drying-window-badge ${bestWindow.rainAfterWindow ? 'window-badge-caution' : 'window-badge-optimal'}">
              ${bestWindow.rainAfterWindow ? '⚠️ Rain Later' : '✓ ' + bestWindow.duration + 'h Safe Window'}
            </span>
          </div>
        </div>
        <div class="timeline-bar" role="img" aria-label="Drying window from ${formatTime(bestWindow.start)} to ${formatTime(bestWindow.end)}">
          <div class="timeline-bar-fill ${bestWindow.rainAfterWindow ? 'caution' : ''}" style="left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%;"></div>
        </div>
        <div class="timeline-hours">
          ${hours.map(h => `<span>${h}</span>`).join('')}
        </div>
        
        <p class="window-explanation-text">${bestWindow.explanation}</p>
        
        ${bestWindow.rainAfterWindow ? `
          <div class="window-rain-warning">
            <span>⚠️ Rain is forecasted after ${bestWindow.rainAfterHourStr || 'this window'}. Collect laundry promptly.</span>
          </div>
        ` : ''}

        <div class="window-rec-box rec-outdoor">
          <span>${bestWindow.recommendation}</span>
        </div>
      </div>`;
  }

  // 2. Short Window
  if (bestWindow.hasSafeWindow && bestWindow.isShortWindow) {
    const start = new Date(bestWindow.start);
    const end   = new Date(bestWindow.end);
    const startH = start.getHours();
    const endH   = end.getHours();

    const dayStart = 6, dayEnd = 20;
    const leftPct  = Math.max(0, Math.min(100, ((startH - dayStart) / (dayEnd - dayStart)) * 100));
    const widthPct = Math.max(8, Math.min(100 - leftPct, ((endH - startH) / (dayEnd - dayStart)) * 100));
    const hours = ['6AM', '9AM', '12PM', '3PM', '6PM', '8PM'];

    return `
      <div class="drying-window-card state-short">
        <div class="drying-window-header">
          <div>
            <div class="drying-window-title">⏱️ BEST AVAILABLE WINDOW (SHORT)</div>
            <div class="drying-window-time">${formatTime(bestWindow.start)} — ${formatTime(bestWindow.end)}</div>
          </div>
          <div>
            <span class="drying-window-badge window-badge-short">⏱ ${bestWindow.duration}h Window</span>
          </div>
        </div>
        <div class="timeline-bar" role="img" aria-label="Short drying window from ${formatTime(bestWindow.start)} to ${formatTime(bestWindow.end)}">
          <div class="timeline-bar-fill caution" style="left:${leftPct.toFixed(1)}%;width:${widthPct.toFixed(1)}%;"></div>
        </div>
        <div class="timeline-hours">
          ${hours.map(h => `<span>${h}</span>`).join('')}
        </div>
        
        <p class="window-explanation-text">${bestWindow.explanation}</p>

        <div class="window-rec-box rec-caution">
          <span>${bestWindow.recommendation}</span>
        </div>
      </div>`;
  }

  // 3. No Safe Window (Detailed Meteorological Diagnosis with Tomorrow Fallback)
  const isRain = bestWindow.primaryReason === 'RAIN_RISK';
  const isHumidity = bestWindow.primaryReason === 'HIGH_HUMIDITY';
  const isNight = bestWindow.primaryReason === 'PAST_DAYLIGHT';
  const icon = bestWindow.icon || (isRain ? '🌧️' : isHumidity ? '💧' : isNight ? '🌙' : '⛅');

  return `
    <div class="drying-window-card state-unsafe">
      <div class="drying-window-header">
        <div>
          <div class="drying-window-title">${icon} ${bestWindow.title || 'NO SAFE OUTDOOR WINDOW TODAY'}</div>
          <div class="drying-window-time" style="font-size:1.2rem;color:var(--color-poor);">${bestWindow.headline || 'Unfavorable Conditions'}</div>
        </div>
        <div>
          <span class="drying-window-badge window-badge-unsafe">✗ No Safe Window Today</span>
        </div>
      </div>

      <p class="window-explanation-text">${bestWindow.explanation}</p>

      <div class="window-rec-box rec-indoor">
        <span>${bestWindow.recommendation}</span>
      </div>

      ${bestWindow.nextBestWindow ? `
        <div style="margin-top:var(--spacing-3);padding:var(--spacing-3) var(--spacing-4);background:var(--color-surface-secondary);border-radius:var(--radius-md);border:1px solid var(--color-border);">
          <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-primary);margin-bottom:2px;">
            ☀️ Next Best Window (${bestWindow.nextBestWindow.dateStr})
          </div>
          <div style="font-weight:700;font-size:0.95rem;color:var(--color-text-primary);">
            ${bestWindow.nextBestWindow.headline}
          </div>
          <div style="font-size:0.78rem;color:var(--color-text-secondary);margin-top:2px;">
            ${bestWindow.nextBestWindow.recommendation}
          </div>
        </div>
      ` : ''}
    </div>`;
}

function getRainAlertHTML(data, lgaName) {
  if (!data.warnings || data.warnings.length === 0) return '';
  return data.warnings.map(w => `
    <div class="rain-alert" role="alert">
      <span class="rain-alert-icon">🌧</span>
      <div>
        <div class="rain-alert-title">Weather Warning — ${lgaName} LGA</div>
        <p class="rain-alert-body">${w}</p>
      </div>
    </div>`).join('');
}

function getDashboardHTML(data, lga, weatherData, isOffline, cacheMinutes) {
  const cond = data.currentConditions;
  const weatherCode = weatherData?.current?.weather_code ?? 0;
  const condText = UI.getConditionText(weatherCode);
  const condIcon = UI.getConditionIcon(weatherCode);

  const tempHelps    = cond.temperature >= 25;
  const humSlows     = cond.humidity >= 70;
  const windHelps    = cond.wind >= 10;
  const rainLow      = cond.rainProb <= 20;

  // Window stat tile logic
  let windowTileLabel = '🪟 Best Window';
  let windowTileValue = 'No Safe Window';
  let windowTileSub = 'Dry indoors recommended';

  if (data.bestWindow && data.bestWindow.hasSafeWindow) {
    windowTileValue = `${formatTime(data.bestWindow.start)} – ${formatTime(data.bestWindow.end)}`;
    if (data.bestWindow.isShortWindow) {
      windowTileLabel = '🪟 Available Window';
      windowTileSub = `${data.bestWindow.duration}h short window (light fabrics)`;
    } else if (data.bestWindow.rainAfterWindow) {
      windowTileSub = `${data.bestWindow.duration}h window (rain expected later)`;
    } else {
      windowTileSub = `${data.bestWindow.duration}h continuous safe window`;
    }
  } else if (data.bestWindow && data.bestWindow.primaryReason === 'HIGH_HUMIDITY') {
    windowTileValue = 'No Ideal Window';
    windowTileSub = 'High humidity slows drying';
  } else if (data.bestWindow && data.bestWindow.primaryReason === 'PAST_DAYLIGHT') {
    windowTileValue = 'Window Passed';
    windowTileSub = data.bestWindow.nextBestWindow ? `Tomorrow: ${formatTime(data.bestWindow.nextBestWindow.start)}` : 'Plan for tomorrow morning';
  } else if (data.bestWindow && data.bestWindow.primaryReason === 'RAIN_RISK') {
    windowTileValue = 'Rain Risk High';
    windowTileSub = data.bestWindow.nextBestWindow ? `Tomorrow: ${formatTime(data.bestWindow.nextBestWindow.start)}` : 'Showers expected today';
  }

  const areasSummary = lga.popularAreas && lga.popularAreas.length > 0
    ? `(${lga.popularAreas.slice(0, 3).join(', ')})`
    : '';

  const lagosNow = getLagosNow();
  const lagosDateFormatted = new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(lagosNow.lagosDate);

  const locMode = Storage.getLocationDetectionMode();
  const isGpsMode = locMode === 'gps';
  const modeBadgeText = isGpsMode ? '📍 Detected automatically' : '📍 Selected manually';
  const modeBadgeClass = isGpsMode ? 'mode-badge-gps' : 'mode-badge-manual';

  return `
    <!-- ── Offline banner ───────────────────────────────────── -->
    ${isOffline ? `
    <div style="margin-bottom:var(--spacing-4);">
      <span class="offline-badge">📡 Offline Mode — Cached ${cacheMinutes}m ago for ${lga.name} LGA</span>
    </div>` : ''}

    <!-- ── Location Selector Header Row ─────────────────────── -->
    <div class="location-select-row">
      <div>
        <label style="font-size:0.75rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-text-tertiary);display:block;margin-bottom:4px;">
          Lagos Local Government Area:
        </label>
        <div id="dashboardLgaSelectorMount"></div>
      </div>
      <div style="font-size:0.8rem;color:var(--color-text-tertiary);text-align:right;">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:2px;">
          <span style="font-weight:600;color:var(--color-text-primary);">${lga.name} LGA</span>
          <span class="location-source-pill ${modeBadgeClass}">${modeBadgeText}</span>
        </div>
        ${areasSummary ? `<div style="font-size:0.75rem;color:var(--color-text-secondary);">${areasSummary}</div>` : ''}
        <small style="font-size:0.72rem;display:block;margin-top:2px;">LGA Reference: Lat ${lga.lat.toFixed(4)}°, Lon ${lga.lon.toFixed(4)}°</small>
      </div>
    </div>

    <!-- ── Weather Hero ──────────────────────────────────────── -->
    <div class="weather-hero state-${data.cssClass}" role="region" aria-label="Current weather conditions in ${lga.fullName}">
      <div class="weather-hero-top">
        <div>
          <div class="weather-location">📍 ${lga.name} LGA · Lagos State ${isGpsMode ? '<span class="weather-auto-badge">Auto Detected</span>' : ''}</div>
          <div class="weather-temp">${cond.temperature}<sup>°C</sup></div>
          <div class="weather-condition">${condIcon} ${condText}</div>
          <span class="weather-laundry-tag ${data.cssClass}" aria-label="Laundry suitability: ${data.category}">
            ${data.category === 'Excellent' ? '✓' : data.category === 'Poor' ? '✗' : '◎'} ${data.category} for Laundry
          </span>
        </div>
        <div class="weather-stats">
          <div class="weather-stat">
            <div class="weather-stat-label">Rain Risk</div>
            <div class="weather-stat-value">${cond.rainProb}%</div>
            <div class="weather-stat-effect ${rainLow ? 'effect-positive' : 'effect-negative'}">${rainLow ? '↓ Low' : '↑ High'}</div>
          </div>
          <div class="weather-stat">
            <div class="weather-stat-label">Humidity</div>
            <div class="weather-stat-value">${cond.humidity}%</div>
            <div class="weather-stat-effect ${humSlows ? 'effect-negative' : 'effect-positive'}">${humSlows ? '↓ Slows drying' : '↑ Good'}</div>
          </div>
          <div class="weather-stat">
            <div class="weather-stat-label">Wind</div>
            <div class="weather-stat-value">${cond.wind}<span style="font-size:0.55em;font-weight:600;"> km/h</span></div>
            <div class="weather-stat-effect ${windHelps ? 'effect-positive' : 'effect-neutral'}">${windHelps ? '↑ Helps drying' : '→ Light'}</div>
          </div>
        </div>
      </div>
      <div style="font-size:0.8rem;color:var(--color-text-tertiary);">
        ${getGreeting()} · ${lagosDateFormatted} · Africa/Lagos Timezone
      </div>
    </div>

    <!-- ── Rain alerts ──────────────────────────────────────── -->
    ${getRainAlertHTML(data, lga.name)}

    <!-- ── Laundry Decision ──────────────────────────────────── -->
    <div class="laundry-decision" role="region" aria-label="Laundry decision for ${lga.fullName}">
      <p class="laundry-decision-question">Can my clothes dry today in ${lga.name} LGA?</p>
      <p class="laundry-decision-answer ${data.cssClass}" aria-live="polite">${data.recommendation}</p>

      ${UI.renderScoreRing(data.score, data.cssClass)}

      <p style="font-size:0.8rem;color:var(--color-text-tertiary);margin-bottom:var(--spacing-4);">Drying Suitability Score</p>

      <div style="margin-bottom:var(--spacing-2);">${getActionChip(data)}</div>
    </div>

    <!-- ── Upgraded Best Drying Window Component ─────────────── -->
    ${getTimelineHTML(data.bestWindow)}

    <!-- ── 4 Stat Tiles ─────────────────────────────────────── -->
    <div class="stat-tiles">
      <div class="stat-tile">
        <div class="stat-tile-label">⏱ Est. Drying Time</div>
        <div class="stat-tile-value">${formatDuration(data.estimatedTimeHours)}</div>
        <div class="stat-tile-sub">Standard cotton load in ${lga.name}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">${windowTileLabel}</div>
        <div class="stat-tile-value" style="font-size:0.95rem;">${windowTileValue}</div>
        <div class="stat-tile-sub">${windowTileSub}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">🌡 Temperature</div>
        <div class="stat-tile-value">${cond.temperature}°C</div>
        <div class="stat-tile-sub">${tempHelps ? 'Favorable warmth' : 'Moderate temperature'}</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">🌧 Rain Probability</div>
        <div class="stat-tile-value" style="color:${cond.rainProb >= 60 ? 'var(--color-poor)' : cond.rainProb >= 30 ? 'var(--color-moderate)' : 'var(--color-excellent)'};">${data.rainRisk.label}</div>
        <div class="stat-tile-sub">${cond.rainProb}% chance of rain</div>
      </div>
    </div>

    <!-- ── Score Breakdown ──────────────────────────────────── -->
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--spacing-2);">
        <h3 style="margin:0;">Why is ${lga.name}'s Score ${data.score}?</h3>
        <button id="toggleBreakdown" class="btn btn-outline" style="padding:6px 14px;font-size:0.8rem;" aria-expanded="false">Why this score?</button>
      </div>
      <p style="margin-bottom:0;font-size:0.83rem;">
        Contributing weather factors in <strong>${lga.fullName}</strong>:
        <strong>${cond.temperature}°C</strong> temp ·
        <strong>${cond.humidity}%</strong> humidity ·
        <strong>${cond.wind} km/h</strong> wind ·
        <strong>${cond.rainProb}%</strong> rain risk
      </p>
      <div id="scoreBreakdown" style="display:none;margin-top:var(--spacing-4);">
        ${UI.renderScoreBreakdown(data.factors)}
        <p style="margin-top:var(--spacing-3);font-size:0.76rem;color:var(--color-text-tertiary);">
          Score calculated from live meteorological data: temperature (20pts) + humidity (25pts) + wind (20pts) + rain risk (30pts) + precipitation (5pts). If rain ≥70% or precipitation >1mm, score is capped at 40.
        </p>
      </div>
    </div>

    <!-- ── CTA ──────────────────────────────────────────────── -->
    <div class="card" style="text-align:center;padding:var(--spacing-6);">
      <h3 style="margin-bottom:var(--spacing-1);">Personalise Your Plan</h3>
      <p style="margin-bottom:var(--spacing-4);">Get drying times tailored to your fabric, washing method and load size in ${lga.name} LGA.</p>
      <a href="planner.html" class="btn btn-primary" style="width:100%;">
        Open Laundry Planner →
      </a>
    </div>
  `;
}

if (window.location.pathname.endsWith('dashboard.html') ||
    window.location.pathname === '/' ||
    window.location.pathname.endsWith('/Smartlundary/')) {
  document.addEventListener('DOMContentLoaded', initDashboard);
}
