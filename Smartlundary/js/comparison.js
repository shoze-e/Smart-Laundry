// js/comparison.js — Compares all 20 official Lagos LGAs using Centralized Single Source of Truth
import { UI } from './ui.js';
import { fetchWeather } from './weather.js';
import { calculateLaundryRecommendation } from './laundry.js';
import { formatTime, formatDuration } from './utils.js';
import { LAGOS_LOCATIONS, getLocationById } from '../data/locations.js';
import { Storage } from './storage.js';

document.addEventListener('DOMContentLoaded', () => {
  UI.renderNavbar('compare');
  document.getElementById('refreshBtn').addEventListener('click', loadComparisons);
  loadComparisons();
});

async function loadComparisons() {
  UI.showLoading('comparisonContainer');
  document.getElementById('bestLocationContainer').innerHTML = '';

  const results = [];

  try {
    // Process all 20 LGAs with parallel batching of 5 to be fast yet gentle on API
    const batchSize = 5;
    for (let i = 0; i < LAGOS_LOCATIONS.length; i += batchSize) {
      const batch = LAGOS_LOCATIONS.slice(i, i + batchSize);
      const batchPromises = batch.map(async (loc) => {
        try {
          const data = await fetchWeather(loc.id);
          const defaultPrefs = { fabric: 'cotton', washingMethod: 'normal_spin', loadSize: 'medium', dryingPreference: 'outdoor' };
          
          // Use central recommendation engine (identical to Dashboard)
          const rec = calculateLaundryRecommendation(data, defaultPrefs);

          return {
            id: loc.id,
            name: loc.name,
            fullName: loc.fullName,
            popularAreas: loc.popularAreas,
            temp: rec.currentConditions.temperature,
            humidity: rec.currentConditions.humidity,
            wind: rec.currentConditions.wind,
            score: rec.score,
            category: rec.category,
            cssClass: rec.cssClass,
            recommendation: rec.recommendation,
            weatherCondition: rec.weatherCondition,
            weatherConditionIcon: rec.weatherConditionIcon,
            rainRisk: rec.rainRisk.label,
            rainProb: rec.currentConditions.rainProb,
            estimatedTimeHours: rec.estimatedTimeHours,
            window: rec.bestDryingWindow,
            hasSafeWindow: Boolean(rec.bestDryingWindow && rec.bestDryingWindow.hasSafeWindow),
            windowStatus: rec.windowStatus
          };
        } catch (err) {
          console.warn(`Could not fetch data for ${loc.name}`, err);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(res => {
        if (res) results.push(res);
      });
    }

    if (!results.length) {
      document.getElementById('comparisonContainer').innerHTML = `
        <div class="state-container">
          <span class="state-icon">📡</span>
          <p class="state-title">No data available</p>
          <p class="state-desc">Unable to load comparison data. Please check your connection.</p>
        </div>`;
      return;
    }

    // Sort LGAs by:
    // 1. Usable safe window availability (LGAs with open window rank above those with no window)
    // 2. Drying score (descending)
    // 3. Rain probability (ascending - lower is better)
    results.sort((a, b) => {
      if (a.hasSafeWindow && !b.hasSafeWindow) return -1;
      if (!a.hasSafeWindow && b.hasSafeWindow) return 1;
      if (b.score !== a.score) return b.score - a.score;
      if (a.rainProb !== b.rainProb) return a.rainProb - b.rainProb;
      return a.name.localeCompare(b.name);
    });

    const bestLoc = results[0];
    renderBestLocation(bestLoc);
    renderComparisonList(results);
  } catch (e) {
    console.error("Comparison load error:", e);
    UI.showError('comparisonContainer', 'Failed to load comparison data. Please check your connection.');
  }
}

function renderBestLocation(loc) {
  if (!loc) return;
  const container = document.getElementById('bestLocationContainer');
  
  const hasWindow = loc.hasSafeWindow && loc.window;
  
  // Format Window text cleanly
  let windowText = 'No Safe Window Today';
  let windowSub = 'Dry indoors recommended';
  if (hasWindow) {
    windowText = `${formatTime(loc.window.start)} – ${formatTime(loc.window.end)}`;
    windowSub = loc.window.isShortWindow ? `${loc.window.duration}h short window` : `${loc.window.duration}h continuous safe window`;
  } else if (loc.window && loc.window.primaryReason === 'HIGH_HUMIDITY') {
    windowText = 'No Ideal Window';
    windowSub = 'High humidity slows drying';
  } else if (loc.window && loc.window.primaryReason === 'PAST_DAYLIGHT') {
    windowText = 'Window Passed';
    windowSub = loc.window.nextBestWindow ? `Tomorrow: ${formatTime(loc.window.nextBestWindow.start)}` : 'Plan for tomorrow morning';
  }

  const areas = loc.popularAreas && loc.popularAreas.length > 0 ? `(${loc.popularAreas.slice(0, 3).join(', ')})` : '';

  // Banner title and styling based on whether clothes can actually be dried outside
  const badgeLabel = hasWindow ? '🏆 BEST LGA FOR OUTDOOR DRYING TODAY' : '📊 HIGHEST DRYING SCORE TODAY';
  const badgeClass = hasWindow ? 'status-excellent' : 'status-moderate';
  const cardBorder = hasWindow ? '2px solid var(--color-excellent)' : '1px solid var(--color-border)';
  const cardBg = hasWindow ? 'var(--color-excellent-soft)' : 'var(--color-surface)';

  container.innerHTML = `
    <div class="card" style="
      border: ${cardBorder};
      background: ${cardBg};
      padding: var(--spacing-5);
      margin-bottom: var(--spacing-4);
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--spacing-3);margin-bottom:var(--spacing-4);flex-wrap:wrap;">
        <div>
          <span class="status-badge ${badgeClass}" style="margin-bottom:6px;display:inline-block;">
            ${badgeLabel}
          </span>
          <div style="font-size:1.6rem;font-weight:800;letter-spacing:-0.04em;">
            ${loc.name} LGA <span style="font-size:0.9rem;font-weight:500;color:var(--color-text-secondary);">${areas}</span>
          </div>
          <div style="font-size:0.85rem;color:var(--color-text-secondary);margin-top:2px;">
            ${hasWindow ? `✓ Favorable continuous outdoor drying window available.` : `⚠️ Highest relative score (${loc.score}/100), but outdoor drying is currently not recommended.`}
          </div>
        </div>
        <button type="button" class="btn btn-primary" id="selectBestLgaBtn" style="padding:8px 16px;font-size:0.85rem;">
          View on Dashboard →
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:var(--spacing-3);">
        <div class="stat-tile" style="text-align:center;">
          <div class="stat-tile-label">Drying Score</div>
          <div style="font-size:1.6rem;font-weight:800;color:${hasWindow ? 'var(--color-excellent)' : 'var(--color-text-primary)'};">${loc.score}</div>
          <div class="stat-tile-sub">/ 100 (${loc.category})</div>
        </div>
        <div class="stat-tile" style="text-align:center;">
          <div class="stat-tile-label">Outdoor Window</div>
          <div style="font-size:0.92rem;font-weight:700;margin-top:2px;">${windowText}</div>
          <div class="stat-tile-sub">${windowSub}</div>
        </div>
        <div class="stat-tile" style="text-align:center;">
          <div class="stat-tile-label">Est. Drying Time</div>
          <div style="font-size:1.1rem;font-weight:700;">${formatDuration(loc.estimatedTimeHours)}</div>
          <div class="stat-tile-sub">Cotton load</div>
        </div>
        <div class="stat-tile" style="text-align:center;">
          <div class="stat-tile-label">Weather</div>
          <div style="font-size:1.1rem;font-weight:700;">${loc.weatherConditionIcon} ${loc.temp}°C</div>
          <div class="stat-tile-sub">${loc.weatherCondition} · ${loc.humidity}% hum</div>
        </div>
      </div>
    </div>`;

  const btn = document.getElementById('selectBestLgaBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      Storage.setActiveLocationId(loc.id);
      window.location.href = 'dashboard.html';
    });
  }
}

function renderComparisonList(results) {
  const container = document.getElementById('comparisonContainer');

  const items = results.map((r, idx) => {
    const rank = idx + 1;
    const barWidth = Math.max(5, r.score);
    const areas = r.popularAreas && r.popularAreas.length > 0 ? r.popularAreas.slice(0, 2).join(', ') : '';

    // Outdoor Window column: Real window duration or distinct "No Safe Window" status
    let windowText = 'No Safe Window';
    let windowSub = 'Dry indoors';
    if (r.hasSafeWindow && r.window) {
      windowText = `${formatTime(r.window.start)} – ${formatTime(r.window.end)}`;
      windowSub = `${r.window.duration}h window`;
    } else if (r.window && r.window.primaryReason === 'HIGH_HUMIDITY') {
      windowText = 'No Ideal Window';
      windowSub = 'High humidity';
    } else if (r.window && r.window.primaryReason === 'PAST_DAYLIGHT') {
      windowText = 'Window Passed';
      windowSub = 'Night hours';
    }

    return `
      <div class="card card-hover" style="
        padding: var(--spacing-4) var(--spacing-5);
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-2);
        flex-wrap: wrap;
        cursor: pointer;
      " data-lga-id="${r.id}" title="Click to set ${r.name} LGA as active location on Dashboard">
        <!-- Rank -->
        <div style="min-width:32px;text-align:center;">
          <span style="font-size:0.82rem;font-weight:800;color:${rank === 1 ? 'var(--color-primary)' : 'var(--color-text-tertiary)'};">#${rank}</span>
        </div>

        <!-- Name + bar -->
        <div style="flex:2;min-width:140px;">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:2px;">
            ${r.name} <span style="font-size:0.75rem;font-weight:500;color:var(--color-text-tertiary);">LGA</span>
          </div>
          ${areas ? `<div style="font-size:0.72rem;color:var(--color-text-tertiary);margin-bottom:4px;">${areas}</div>` : ''}
          <div style="height:5px;background:var(--color-surface-secondary);border-radius:3px;overflow:hidden;">
            <div style="width:${barWidth}%;height:100%;background:${r.score >= 70 ? 'var(--color-excellent)' : r.score >= 50 ? 'var(--color-moderate)' : 'var(--color-poor)'};border-radius:3px;"></div>
          </div>
        </div>

        <!-- Weather Condition (Separate from Window) -->
        <div style="min-width:110px;">
          <div style="font-size:0.67rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Weather</div>
          <div style="font-size:0.85rem;font-weight:600;">${r.weatherConditionIcon} ${r.weatherCondition}</div>
          <div style="font-size:0.72rem;color:var(--color-text-tertiary);">${r.temp}°C · ${r.humidity}% hum</div>
        </div>

        <!-- Outdoor Drying Window -->
        <div style="min-width:130px;">
          <div style="font-size:0.67rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Outdoor Window</div>
          <div style="font-size:0.85rem;font-weight:700;color:${r.hasSafeWindow ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'};">${windowText}</div>
          <div style="font-size:0.72rem;color:var(--color-text-tertiary);">${windowSub}</div>
        </div>

        <!-- Rain Risk -->
        <div style="min-width:75px;">
          <div style="font-size:0.67rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Rain Risk</div>
          <div style="font-size:0.85rem;font-weight:600;color:${r.rainProb > 50 ? 'var(--color-poor)' : 'inherit'};">${r.rainProb}%</div>
          <div style="font-size:0.72rem;color:var(--color-text-tertiary);">${r.rainRisk}</div>
        </div>

        <!-- Score + Status -->
        <div style="text-align:right;min-width:75px;">
          <div style="font-size:1.45rem;font-weight:800;letter-spacing:-0.04em;color:${r.score >= 70 ? 'var(--color-excellent)' : r.score >= 50 ? 'var(--color-moderate)' : 'var(--color-poor)'};">${r.score}</div>
          <span class="status-badge status-${r.cssClass}" style="font-size:0.65rem;">${r.category}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:var(--spacing-2);font-size:0.78rem;color:var(--color-text-tertiary);display:flex;justify-content:space-between;flex-wrap:wrap;gap:var(--spacing-2);">
      <span>Comparing all 20 official Lagos LGAs (Ranked by safe window availability &amp; score)</span>
      <span>Click any LGA to view on Dashboard</span>
    </div>
    <div>${items}</div>
  `;

  // Attach click events to switch active LGA
  container.querySelectorAll('[data-lga-id]').forEach(card => {
    card.addEventListener('click', () => {
      const lgaId = card.dataset.lgaId;
      Storage.setActiveLocationId(lgaId);
      window.location.href = 'dashboard.html';
    });
  });
}
