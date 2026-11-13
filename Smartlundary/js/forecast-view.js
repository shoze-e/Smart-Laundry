// js/forecast-view.js
import { UI } from './ui.js';
import { fetchWeather } from './weather.js';
import { Storage } from './storage.js';
import { processHourlyForecast } from './forecast.js';
import { formatTime, getLagosNow } from './utils.js';
import { getLocationById } from '../data/locations.js';

let forecastLocationSelector = null;

document.addEventListener('DOMContentLoaded', () => {
  UI.renderNavbar('forecast');

  const activeId = Storage.getActiveLocationId() || 'ikeja';
  const selectorMount = document.getElementById('forecastLgaSelectorMount');
  if (selectorMount) {
    forecastLocationSelector = UI.renderLocationSelector(selectorMount, {
      activeId: activeId,
      onSelect: (selectedLga) => {
        loadForecast(selectedLga.id);
      }
    });
  }

  loadForecast(activeId);
});

async function loadForecast(locId) {
  const effectiveId = locId || Storage.getActiveLocationId() || 'ikeja';
  const lga = getLocationById(effectiveId);
  Storage.setActiveLocationId(lga.id);

  const heading = document.getElementById('forecastHeading');
  const subheading = document.getElementById('forecastSubheading');
  if (heading) heading.textContent = `Hourly Forecast — ${lga.name} LGA`;
  if (subheading) subheading.textContent = `Hourly weather conditions and laundry drying suitability in ${lga.fullName} for the next 24 hours.`;

  UI.showLoading('forecastContainer');
  try {
    const weatherData = await fetchWeather(lga.id);
    const hourly = processHourlyForecast(weatherData.hourly);
    
    // Filter from current Lagos hour onwards for 24 hours
    const lagosNow = getLagosNow();
    const currentAndFuture = hourly.filter(h => h.timestamp >= lagosNow.timestamp - 3600 * 1000);
    const displayList = currentAndFuture.length >= 24 ? currentAndFuture.slice(0, 24) : hourly.slice(0, 24);

    renderForecast(displayList, lga);
  } catch (e) {
    console.error("Failed to load forecast for", lga.name, e);
    UI.showError('forecastContainer', `Failed to fetch weather forecast for ${lga.fullName}. Please check your connection.`);
  }
}

function getDryingIcon(cssClass) {
  if (cssClass === 'excellent') return '☀️';
  if (cssClass === 'good')      return '🌤️';
  if (cssClass === 'moderate')  return '⛅';
  return '🌧️';
}

function renderForecast(hourlyData, lga) {
  const container = document.getElementById('forecastContainer');
  if (!hourlyData.length) {
    container.innerHTML = `<div class="state-container"><span class="state-icon">📭</span><p class="state-title">No forecast data available</p></div>`;
    return;
  }

  // Find best hours for highlight
  const bestScore = Math.max(...hourlyData.map(h => h.score));

  const cards = hourlyData.map(h => {
    const isDay = h.conditions && h.conditions.isDay;
    const isBest = h.score === bestScore && h.score >= 60;
    const bgOpacity = isDay ? '1' : '0.6';

    return `
      <div style="
        background: var(--color-surface);
        border: ${isBest ? '2px solid var(--color-excellent)' : '1px solid var(--color-border)'};
        border-radius: var(--radius-md);
        padding: var(--spacing-3) var(--spacing-4);
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
        opacity: ${bgOpacity};
        position: relative;
        ${isBest ? 'box-shadow: var(--shadow-md);' : ''}
      ">
        ${isBest ? `<span style="position:absolute;top:-10px;left:var(--spacing-4);background:var(--color-excellent);color:white;font-size:0.65rem;font-weight:700;letter-spacing:0.08em;padding:2px 8px;border-radius:100px;text-transform:uppercase;">Best Hour in ${lga.name}</span>` : ''}

        <!-- Time -->
        <div style="min-width:54px;flex-shrink:0;">
          <div style="font-size:1rem;font-weight:700;color:var(--color-text-primary);">${formatTime(h.date)}</div>
          <div style="font-size:0.7rem;color:var(--color-text-tertiary);">${isDay ? 'Daytime' : 'Night'}</div>
        </div>

        <!-- Icon + Drying -->
        <div style="min-width:80px;flex-shrink:0;text-align:center;">
          <div style="font-size:1.5rem;line-height:1;">${getDryingIcon(h.cssClass)}</div>
          <span class="status-badge status-${h.cssClass}" style="margin-top:4px;font-size:0.65rem;">${h.category}</span>
        </div>

        <!-- Stats row -->
        <div style="display:flex;gap:var(--spacing-4);flex-wrap:wrap;flex:1;">
          <div>
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Temp</div>
            <div style="font-size:1rem;font-weight:700;">${h.conditions.temperature}°C</div>
          </div>
          <div>
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Humidity</div>
            <div style="font-size:1rem;font-weight:700;color:${h.conditions.humidity >= 80 ? 'var(--color-poor)' : 'inherit'};">${h.conditions.humidity}%</div>
          </div>
          <div>
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Rain</div>
            <div style="font-size:1rem;font-weight:700;color:${h.conditions.rainProb > 40 ? 'var(--color-poor)' : 'inherit'};">${h.conditions.rainProb}%</div>
          </div>
          <div>
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Wind</div>
            <div style="font-size:1rem;font-weight:700;">${h.conditions.wind}<span style="font-size:0.7em;font-weight:500;"> km/h</span></div>
          </div>
        </div>

        <!-- Score bar -->
        <div style="min-width:60px;text-align:right;">
          <div style="font-size:1.4rem;font-weight:800;letter-spacing:-0.04em;color:${h.score >= 70 ? 'var(--color-excellent)' : h.score >= 50 ? 'var(--color-moderate)' : 'var(--color-poor)'};">${h.score}</div>
          <div style="font-size:0.65rem;color:var(--color-text-tertiary);">/ 100</div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--spacing-2);">${cards}</div>
    <p style="font-size:0.76rem;color:var(--color-text-tertiary);margin-top:var(--spacing-4);text-align:center;">
      Showing hourly predictions for <strong>${lga.fullName}</strong>. Night hours shown at reduced opacity.
    </p>`;
}
