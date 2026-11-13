// js/calendar-view.js
import { UI } from './ui.js';
import { fetchWeather } from './weather.js';
import { Storage } from './storage.js';
import { processHourlyForecast, findBestDryingWindow } from './forecast.js';
import { formatDate, formatTime, parseLagosDate } from './utils.js';
import { getLocationById } from '../data/locations.js';

let calendarLocationSelector = null;

document.addEventListener('DOMContentLoaded', () => {
  UI.renderNavbar('calendar');

  const activeId = Storage.getActiveLocationId() || 'ikeja';
  const selectorMount = document.getElementById('calendarLgaSelectorMount');
  if (selectorMount) {
    calendarLocationSelector = UI.renderLocationSelector(selectorMount, {
      activeId: activeId,
      onSelect: (selectedLga) => {
        loadCalendar(selectedLga.id);
      }
    });
  }

  loadCalendar(activeId);
});

async function loadCalendar(locId) {
  const effectiveId = locId || Storage.getActiveLocationId() || 'ikeja';
  const lga = getLocationById(effectiveId);
  Storage.setActiveLocationId(lga.id);

  const heading = document.getElementById('calendarHeading');
  const subheading = document.getElementById('calendarSubheading');
  if (heading) heading.textContent = `Forecast Calendar — ${lga.name} LGA`;
  if (subheading) subheading.textContent = `16-day laundry suitability calendar for ${lga.fullName}. Find the highest scoring day for outdoor drying.`;

  UI.showLoading('calendarContainer');
  document.getElementById('bestDayContainer').innerHTML = '';

  try {
    const weatherData = await fetchWeather(lga.id);
    const dailyData = [];
    const hourlyProcessed = processHourlyForecast(weatherData.hourly);
    let bestDay = null;
    let highestScore = -1;

    for (let i = 0; i < weatherData.daily.time.length; i++) {
      const dateStr = weatherData.daily.time[i];
      const targetDate = parseLagosDate(dateStr);
      const bestWindow = findBestDryingWindow(hourlyProcessed, 3.5, targetDate);

      let dayScore = 0;
      let catName = 'Poor', catClass = 'poor';

      if (bestWindow && bestWindow.hasSafeWindow) {
        dayScore = bestWindow.adjustedScore || bestWindow.avgScore || 0;
        if (dayScore >= 90) { catName = 'Excellent'; catClass = 'excellent'; }
        else if (dayScore >= 70) { catName = 'Good'; catClass = 'good'; }
        else if (dayScore >= 50) { catName = 'Moderate'; catClass = 'moderate'; }
      }

      const dayObj = {
        date: targetDate,
        dateStr: formatDate(dateStr),
        maxTemp: weatherData.daily.temperature_2m_max[i],
        rainProb: weatherData.daily.precipitation_probability_max[i],
        wind: weatherData.daily.wind_speed_10m_max[i],
        score: dayScore,
        category: catName,
        cssClass: catClass,
        bestWindow
      };

      dailyData.push(dayObj);
      if (dayScore > highestScore) { highestScore = dayScore; bestDay = dayObj; }
    }

    renderBestDay(bestDay, lga);
    renderCalendar(dailyData, bestDay, lga);
  } catch (e) {
    console.error("Failed to load calendar for", lga.name, e);
    UI.showError('calendarContainer', `Failed to fetch calendar forecast for ${lga.fullName}. Please check your connection.`);
  }
}

function renderBestDay(day, lga) {
  if (!day || day.score === 0) return;
  const container = document.getElementById('bestDayContainer');
  const windowText = (day.bestWindow && day.bestWindow.hasSafeWindow)
    ? `${formatTime(day.bestWindow.start)} – ${formatTime(day.bestWindow.end)} (${day.bestWindow.duration}h)`
    : (day.bestWindow?.headline || 'Indoor Drying Recommended');

  container.innerHTML = `
    <div class="card" style="
      border: 2px solid var(--color-excellent);
      background: var(--color-excellent-soft);
      padding: var(--spacing-5);
      margin-bottom: var(--spacing-4);
    ">
      <div style="display:flex;align-items:center;gap:var(--spacing-3);margin-bottom:var(--spacing-4);">
        <span style="font-size:1.8rem;">🏆</span>
        <div>
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-excellent);">Best Upcoming Laundry Day in ${lga.name} LGA</div>
          <div style="font-size:1.4rem;font-weight:800;letter-spacing:-0.03em;color:var(--color-text-primary);">${day.dateStr}</div>
        </div>
      </div>
      <div style="display:flex;gap:var(--spacing-3);flex-wrap:wrap;">
        <div class="stat-tile" style="flex:1;min-width:90px;text-align:center;">
          <div class="stat-tile-label">Score</div>
          <div style="font-size:1.6rem;font-weight:800;color:var(--color-excellent);">${day.score}</div>
          <div class="stat-tile-sub">/ 100</div>
        </div>
        <div class="stat-tile" style="flex:1;min-width:90px;text-align:center;">
          <div class="stat-tile-label">Category</div>
          <span class="status-badge status-${day.cssClass}">${day.category}</span>
        </div>
        <div class="stat-tile" style="flex:2;min-width:140px;">
          <div class="stat-tile-label">Best Window</div>
          <div class="stat-tile-value" style="font-size:1rem;">${windowText}</div>
          <div class="stat-tile-sub">Rain: ${day.rainProb}% max · ${day.maxTemp}°C high in ${lga.name}</div>
        </div>
      </div>
    </div>`;
}

function renderCalendar(dailyData, bestDay, lga) {
  const container = document.getElementById('calendarContainer');

  const cards = dailyData.map((d, idx) => {
    const isToday = idx === 0;
    const isBest = bestDay && d.dateStr === bestDay.dateStr;
    
    let windowText = 'Indoor Drying Recommended';
    let windowSub = 'Rain risk or high humidity';
    if (d.bestWindow && d.bestWindow.hasSafeWindow) {
      windowText = `${formatTime(d.bestWindow.start)} – ${formatTime(d.bestWindow.end)}`;
      windowSub = `${d.bestWindow.duration}h window`;
    } else if (d.bestWindow && d.bestWindow.primaryReason === 'HIGH_HUMIDITY') {
      windowText = 'No Ideal Window';
      windowSub = 'High humidity slows drying';
    } else if (d.bestWindow && d.bestWindow.primaryReason === 'RAIN_RISK') {
      windowText = 'Rain Showers Expected';
      windowSub = 'Dry indoors today';
    }

    return `
      <div style="
        background: var(--color-surface);
        border: ${isBest ? '2px solid var(--color-excellent)' : '1px solid var(--color-border)'};
        border-radius: var(--radius-lg);
        padding: var(--spacing-4) var(--spacing-5);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-3);
        flex-wrap: wrap;
      ">
        <!-- Date -->
        <div style="min-width:100px;">
          <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--color-text-tertiary);">${isToday ? 'Today' : formatDate(d.date)}</div>
          <div style="font-size:1rem;font-weight:700;color:var(--color-text-primary);">${d.dateStr}</div>
        </div>

        <!-- Stats -->
        <div style="display:flex;gap:var(--spacing-4);flex:1;flex-wrap:wrap;">
          <div>
            <div style="font-size:0.67rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Max Temp</div>
            <div style="font-weight:700;">${d.maxTemp}°C</div>
          </div>
          <div>
            <div style="font-size:0.67rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Rain Risk</div>
            <div style="font-weight:700;color:${d.rainProb > 50 ? 'var(--color-poor)' : 'inherit'};">${d.rainProb}%</div>
          </div>
          <div>
            <div style="font-size:0.67rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-tertiary);">Outdoor Window</div>
            <div style="font-weight:700;font-size:0.88rem;">${windowText}</div>
            <div style="font-size:0.7rem;color:var(--color-text-tertiary);">${windowSub}</div>
          </div>
        </div>

        <!-- Score + Status -->
        <div style="text-align:right;min-width:80px;">
          <div style="font-size:1.6rem;font-weight:800;letter-spacing:-0.05em;color:${d.score >= 70 ? 'var(--color-excellent)' : d.score >= 50 ? 'var(--color-moderate)' : 'var(--color-poor)'};">${d.score > 0 ? d.score : '—'}</div>
          <span class="status-badge status-${d.cssClass}">${d.category}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = cards || `<div class="state-container"><span class="state-icon">📭</span><p class="state-title">No forecast data available</p></div>`;
}
