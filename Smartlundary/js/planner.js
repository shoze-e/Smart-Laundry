// js/planner.js
import { UI } from './ui.js';
import { fetchWeather } from './weather.js';
import { calculateLaundryRecommendation } from './laundry.js';
import { Storage } from './storage.js';
import { formatTime, formatDuration } from './utils.js';
import { FABRICS, WASHING_METHODS, LOAD_SIZES } from '../data/fabrics.js';
import { getLocationById } from '../data/locations.js';

let plannerLocationSelector = null;

document.addEventListener('DOMContentLoaded', () => {
  UI.renderNavbar('planner');

  const activeId = Storage.getActiveLocationId() || 'ikeja';
  const planLocationInput = document.getElementById('planLocation');
  if (planLocationInput) {
    planLocationInput.value = activeId;
  }

  // Mount Searchable LGA selector in Planner
  const selectorMount = document.getElementById('plannerLgaSelectorMount');
  if (selectorMount) {
    plannerLocationSelector = UI.renderLocationSelector(selectorMount, {
      activeId: activeId,
      onSelect: (selectedLga) => {
        if (planLocationInput) planLocationInput.value = selectedLga.id;
        // If a plan was already calculated, re-run with new LGA
        const hasResult = document.getElementById('planResultContainer').querySelector('.laundry-decision');
        if (hasResult) {
          triggerPlanCalculation();
        }
      }
    });
  }

  populateSelect('planFabric', FABRICS, 'cotton');
  populateSelect('planWashing', WASHING_METHODS, 'normal_spin');
  populateSelect('planLoad', LOAD_SIZES, 'medium');

  // Show fabric hint on change
  const fabricSelect = document.getElementById('planFabric');
  const fabricHint = document.getElementById('fabricHint');
  if (fabricSelect && fabricHint) {
    const updateHint = () => {
      const fab = FABRICS[fabricSelect.value];
      fabricHint.textContent = fab ? `ℹ️ ${fab.description}` : '';
    };
    fabricSelect.addEventListener('change', updateHint);
    updateHint();
  }

  document.getElementById('plannerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    triggerPlanCalculation();
  });
});

function populateSelect(selectId, dataObj, defaultValue) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '';
  Object.keys(dataObj).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = dataObj[key].name;
    select.appendChild(opt);
  });
  select.value = defaultValue;
}

async function triggerPlanCalculation() {
  const resultContainer = document.getElementById('planResultContainer');
  resultContainer.innerHTML = '';
  UI.showLoading('planResultContainer');
  resultContainer.style.display = 'block';

  const locId = document.getElementById('planLocation').value || Storage.getActiveLocationId() || 'ikeja';
  const lga = getLocationById(locId);
  Storage.setActiveLocationId(lga.id);

  const preferences = {
    fabric: document.getElementById('planFabric').value,
    washingMethod: document.getElementById('planWashing').value,
    loadSize: document.getElementById('planLoad').value,
    dryingPreference: document.getElementById('planPreference').value
  };

  try {
    const weatherData = await fetchWeather(lga.id);
    const recommendation = calculateLaundryRecommendation(weatherData, preferences);

    // Save to history
    Storage.saveHistoryItem({
      locationId: lga.id,
      locationName: lga.name,
      locationFullName: lga.fullName,
      preferences,
      recommendation: {
        score: recommendation.score,
        category: recommendation.category,
        estimatedTimeHours: recommendation.estimatedTimeHours,
        bestWindow: recommendation.bestWindow
      }
    });

    renderResult(recommendation, lga, preferences, weatherData);
  } catch (err) {
    console.error("Planner calculation failed:", err);
    resultContainer.innerHTML = `
      <div class="card" style="text-align:center;padding:var(--spacing-8);">
        <span style="font-size:2.5rem;display:block;margin-bottom:var(--spacing-3);">📡</span>
        <h3>Weather Data Unavailable</h3>
        <p>Failed to fetch live weather forecast for <strong>${lga.fullName}</strong>.<br>Please check your connection and try again.</p>
        <button class="btn btn-outline" style="margin-top:var(--spacing-3);" id="plannerRetryBtn">Retry</button>
      </div>`;
    const retryBtn = document.getElementById('plannerRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', triggerPlanCalculation);
    }
  }
}

function renderResult(data, lga, prefs, weatherData) {
  const container = document.getElementById('planResultContainer');
  const cond = data.currentConditions;
  const fabricName = FABRICS[prefs.fabric]?.name || prefs.fabric;
  const washName = WASHING_METHODS[prefs.washingMethod]?.name || prefs.washingMethod;
  const loadName = LOAD_SIZES[prefs.loadSize]?.name || prefs.loadSize;

  let windowTileLabel = '🪟 Best Window';
  let windowTileValue = 'No Safe Window';
  let windowTileSub = 'Indoor drying advised';

  if (data.bestWindow && data.bestWindow.hasSafeWindow) {
    windowTileValue = `${formatTime(data.bestWindow.start)} – ${formatTime(data.bestWindow.end)}`;
    if (data.bestWindow.isShortWindow) {
      windowTileLabel = '🪟 Available Window';
      windowTileSub = `${data.bestWindow.duration}h short window (light fabrics)`;
    } else if (data.bestWindow.rainAfterWindow) {
      windowTileSub = `${data.bestWindow.duration}h window (rain later)`;
    } else {
      windowTileSub = `${data.bestWindow.duration}h safe window in ${lga.name}`;
    }
  } else if (data.bestWindow && data.bestWindow.primaryReason === 'HIGH_HUMIDITY') {
    windowTileValue = 'No Ideal Window';
    windowTileSub = 'High humidity slows drying';
  } else if (data.bestWindow && data.bestWindow.primaryReason === 'PAST_DAYLIGHT') {
    windowTileValue = 'Window Passed';
    windowTileSub = data.bestWindow.nextBestWindow ? `Tomorrow: ${formatTime(data.bestWindow.nextBestWindow.start)}` : 'Plan for tomorrow';
  } else if (data.bestWindow && data.bestWindow.primaryReason === 'RAIN_RISK') {
    windowTileValue = 'Rain Risk High';
    windowTileSub = data.bestWindow.nextBestWindow ? `Tomorrow: ${formatTime(data.bestWindow.nextBestWindow.start)}` : 'Rain risk elevated today';
  }

  let warningsHtml = '';
  if (data.warnings && data.warnings.length > 0) {
    warningsHtml = data.warnings.map(w => `
      <div class="rain-alert" role="alert">
        <span class="rain-alert-icon">⚠️</span>
        <div>
          <div class="rain-alert-title">Weather Warning — ${lga.name} LGA</div>
          <p class="rain-alert-body">${w}</p>
        </div>
      </div>`).join('');
  }

  // Generate window diagnostic card for planner
  const windowCardHtml = getPlannerWindowCardHTML(data.bestWindow, lga.name);

  container.innerHTML = `
    <!-- Decision -->
    <div class="laundry-decision" style="margin-bottom:var(--spacing-4);">
      <p class="laundry-decision-question">📍 ${lga.fullName} · ${fabricName}</p>
      <p class="laundry-decision-answer ${data.cssClass}">${data.recommendation}</p>
      ${UI.renderScoreRing(data.score, data.cssClass)}
      <p style="font-size:0.8rem;color:var(--color-text-tertiary);margin-bottom:var(--spacing-3);">Personalized Drying Score</p>
    </div>

    ${warningsHtml}

    <!-- Upgraded Window Diagnostic Card -->
    ${windowCardHtml}

    <!-- Stats -->
    <div class="stat-tiles" style="margin-bottom:var(--spacing-4);">
      <div class="stat-tile">
        <div class="stat-tile-label">⏱ Est. Drying Time</div>
        <div class="stat-tile-value">${formatDuration(data.estimatedTimeHours)}</div>
        <div class="stat-tile-sub">${fabricName} (${loadName} load)</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">${windowTileLabel}</div>
        <div class="stat-tile-value" style="font-size:0.9rem;">${windowTileValue}</div>
        <div class="stat-tile-sub">${windowTileSub}</div>
      </div>
    </div>

    <!-- Load Details Summary -->
    <div class="card card-sm" style="margin-bottom:var(--spacing-4);">
      <h4 style="margin-bottom:var(--spacing-3);">Plan Parameters</h4>
      <div style="display:flex;gap:var(--spacing-2);flex-wrap:wrap;margin-bottom:var(--spacing-2);">
        <span class="status-badge" style="background:var(--color-surface-secondary);color:var(--color-text-primary);">📍 ${lga.name} LGA</span>
        <span class="status-badge" style="background:var(--color-surface-secondary);color:var(--color-text-primary);">👕 ${fabricName}</span>
        <span class="status-badge" style="background:var(--color-surface-secondary);color:var(--color-text-primary);">⚙️ ${washName}</span>
        <span class="status-badge" style="background:var(--color-surface-secondary);color:var(--color-text-primary);">📦 ${loadName} Load</span>
      </div>
      <div style="display:flex;gap:var(--spacing-2);flex-wrap:wrap;">
        <span class="status-badge status-${cond.temperature >= 28 ? 'excellent' : 'moderate'}">${cond.temperature}°C Temp</span>
        <span class="status-badge status-${cond.humidity < 70 ? 'good' : 'poor'}">${cond.humidity}% Humidity</span>
        <span class="status-badge status-${cond.wind >= 10 ? 'good' : 'moderate'}">${cond.wind} km/h Wind</span>
        <span class="status-badge status-${cond.rainProb <= 20 ? 'excellent' : cond.rainProb <= 50 ? 'moderate' : 'poor'}">${cond.rainProb}% Rain Risk</span>
      </div>
      <p style="font-size:0.75rem;color:var(--color-text-tertiary);margin-top:var(--spacing-2);margin-bottom:0;">
        Drying estimate calculated dynamically from ${lga.name} meteorological telemetry and fabric water retention models.
      </p>
    </div>

    <!-- Score breakdown -->
    <div class="card card-sm">
      <h4 style="margin-bottom:var(--spacing-3);">Drying Factors Breakdown</h4>
      ${UI.renderScoreBreakdown(data.factors)}
    </div>
  `;

  UI.animateScoreRings();
}

function getPlannerWindowCardHTML(bestWindow, lgaName) {
  if (!bestWindow) return '';

  if (bestWindow.hasSafeWindow && !bestWindow.isShortWindow) {
    return `
      <div class="drying-window-card state-${bestWindow.rainAfterWindow ? 'caution' : 'optimal'}" style="margin-bottom:var(--spacing-4);">
        <div class="drying-window-header">
          <div>
            <div class="drying-window-title">${bestWindow.icon || '☀️'} ${bestWindow.title}</div>
            <div class="drying-window-time">${formatTime(bestWindow.start)} — ${formatTime(bestWindow.end)}</div>
          </div>
          <div>
            <span class="drying-window-badge ${bestWindow.rainAfterWindow ? 'window-badge-caution' : 'window-badge-optimal'}">
              ${bestWindow.rainAfterWindow ? '⚠️ Rain Later' : '✓ ' + bestWindow.duration + 'h Safe Window'}
            </span>
          </div>
        </div>
        <p class="window-explanation-text">${bestWindow.explanation}</p>
        ${bestWindow.rainAfterWindow ? `
          <div class="window-rain-warning">
            <span>⚠️ Rain forecasted after ${bestWindow.rainAfterHourStr || 'the window'}. Bring clothes inside on time.</span>
          </div>` : ''}
        <div class="window-rec-box rec-outdoor">
          <span>${bestWindow.recommendation}</span>
        </div>
      </div>`;
  }

  if (bestWindow.hasSafeWindow && bestWindow.isShortWindow) {
    return `
      <div class="drying-window-card state-short" style="margin-bottom:var(--spacing-4);">
        <div class="drying-window-header">
          <div>
            <div class="drying-window-title">⏱️ BEST AVAILABLE WINDOW (SHORT)</div>
            <div class="drying-window-time">${formatTime(bestWindow.start)} — ${formatTime(bestWindow.end)}</div>
          </div>
          <div>
            <span class="drying-window-badge window-badge-short">⏱ ${bestWindow.duration}h Window</span>
          </div>
        </div>
        <p class="window-explanation-text">${bestWindow.explanation}</p>
        <div class="window-rec-box rec-caution">
          <span>${bestWindow.recommendation}</span>
        </div>
      </div>`;
  }

  // Unsafe Window Card
  const icon = bestWindow.icon || '🌧️';
  return `
    <div class="drying-window-card state-unsafe" style="margin-bottom:var(--spacing-4);">
      <div class="drying-window-header">
        <div>
          <div class="drying-window-title">${icon} ${bestWindow.title || 'NO SAFE OUTDOOR WINDOW TODAY'}</div>
          <div class="drying-window-time" style="font-size:1.15rem;color:var(--color-poor);">${bestWindow.headline || 'Unfavorable Drying Conditions'}</div>
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
