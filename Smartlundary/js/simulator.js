// js/simulator.js — Weather laboratory tied to Lagos LGA live baselines
import { UI } from './ui.js';
import { calculateDryingScore } from './drying-score.js';
import { estimateDryingTime } from './drying-time.js';
import { formatDuration, getRainRisk } from './utils.js';
import { FABRICS, WASHING_METHODS, LOAD_SIZES } from '../data/fabrics.js';
import { Storage } from './storage.js';
import { getLocationById } from '../data/locations.js';
import { fetchWeather } from './weather.js';

let simLocationSelector = null;
let currentLga = null;

document.addEventListener('DOMContentLoaded', async () => {
  UI.renderNavbar('simulator');

  const activeId = Storage.getActiveLocationId() || 'ikeja';
  currentLga = getLocationById(activeId);

  populateSelect('simFabric', FABRICS, 'cotton');
  populateSelect('simWash', WASHING_METHODS, 'normal_spin');
  populateSelect('simLoad', LOAD_SIZES, 'medium');

  const rangeIds = ['simTemp', 'simHum', 'simWind', 'simRainProb', 'simPrecip'];
  const allIds = [...rangeIds, 'simFabric', 'simWash', 'simLoad'];

  allIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      if (e.target.type === 'range') {
        const valEl = document.getElementById(`${id}Val`);
        if (valEl) valEl.textContent = parseFloat(e.target.value).toFixed(e.target.step === '0.1' ? 1 : 0);
      }
      runSimulation();
    });
  });

  // Mount Searchable LGA selector in Simulator
  const selectorMount = document.getElementById('simLgaSelectorMount');
  if (selectorMount) {
    simLocationSelector = UI.renderLocationSelector(selectorMount, {
      activeId: activeId,
      onSelect: async (selectedLga) => {
        currentLga = selectedLga;
        await loadLgaBaseline(selectedLga.id);
      }
    });
  }

  const resetBtn = document.getElementById('loadLgaBaselineBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (currentLga) loadLgaBaseline(currentLga.id);
    });
  }

  // Load live weather baseline for active LGA
  await loadLgaBaseline(currentLga.id);
});

async function loadLgaBaseline(lgaId) {
  const lga = getLocationById(lgaId);
  currentLga = lga;
  Storage.setActiveLocationId(lga.id);

  try {
    const weatherData = await fetchWeather(lga.id);
    if (weatherData && weatherData.current) {
      const cur = weatherData.current;
      setSliderValue('simTemp', Math.round(cur.temperature_2m));
      setSliderValue('simHum', Math.round(cur.relative_humidity_2m));
      setSliderValue('simWind', Math.round(cur.wind_speed_10m));
      setSliderValue('simPrecip', (cur.precipitation || 0).toFixed(1));
      
      // Hourly rain prob
      const rainProb = (weatherData.hourly && weatherData.hourly.precipitation_probability && weatherData.hourly.precipitation_probability[0]) || 10;
      setSliderValue('simRainProb', Math.round(rainProb));
    }
  } catch (err) {
    console.warn("Could not load live weather baseline for simulator:", err);
  }

  runSimulation();
}

function setSliderValue(id, val) {
  const el = document.getElementById(id);
  const valEl = document.getElementById(`${id}Val`);
  if (el) el.value = val;
  if (valEl) valEl.textContent = val;
}

function populateSelect(id, data, def) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = '';
  Object.keys(data).forEach(k => {
    const o = document.createElement('option');
    o.value = k; o.textContent = data[k].name;
    sel.appendChild(o);
  });
  sel.value = def;
}

function runSimulation() {
  const conditions = {
    temperature:   parseFloat(document.getElementById('simTemp').value),
    humidity:      parseFloat(document.getElementById('simHum').value),
    wind:          parseFloat(document.getElementById('simWind').value),
    rainProb:      parseFloat(document.getElementById('simRainProb').value),
    precipitation: parseFloat(document.getElementById('simPrecip').value)
  };

  const fabric = document.getElementById('simFabric').value;
  const wash   = document.getElementById('simWash').value;
  const load   = document.getElementById('simLoad').value;

  const scoreData = calculateDryingScore(conditions);
  const estimatedTime = estimateDryingTime(fabric, wash, load, conditions);
  const rainRisk = getRainRisk(conditions.rainProb, conditions.precipitation);

  let finalRec = scoreData.recommendation;
  let finalCss = scoreData.cssClass;
  if (rainRisk.risk >= 4) { finalRec = 'RAIN LIKELY — AVOID OUTDOOR DRYING'; finalCss = 'poor'; }

  renderResult(scoreData, estimatedTime, finalRec, finalCss, rainRisk, conditions);
}

function renderResult(scoreData, estimatedTime, finalRec, finalCss, rainRisk, conditions) {
  const container = document.getElementById('simResultContainer');
  const lgaName = currentLga ? currentLga.name + ' LGA' : 'Lagos LGA';

  // Insight text
  const humInsight = conditions.humidity >= 80 ? '— High humidity significantly reduces drying efficiency.' :
                     conditions.humidity >= 60 ? '— Moderate humidity slows drying.' : '';
  const rainInsight = conditions.rainProb >= 70 ? '— Rain very likely. Score capped at 40.' :
                      conditions.rainProb >= 40 ? '— Significant rain risk reduces score.' : '';

  container.innerHTML = `
    <!-- Score ring -->
    <div class="laundry-decision" style="margin-bottom:var(--spacing-4);">
      <p class="laundry-decision-question">📍 Baseline: ${lgaName}</p>
      <p class="laundry-decision-answer ${finalCss}">${finalRec}</p>
      ${UI.renderScoreRing(scoreData.score, finalCss)}
      <p style="font-size:0.8rem;color:var(--color-text-tertiary);margin-bottom:0;">Simulated Drying Score</p>
    </div>

    <!-- Stats -->
    <div class="stat-tiles" style="margin-bottom:var(--spacing-4);">
      <div class="stat-tile">
        <div class="stat-tile-label">⏱ Est. Drying Time</div>
        <div class="stat-tile-value">${formatDuration(estimatedTime)}</div>
        <div class="stat-tile-sub">With these conditions</div>
      </div>
      <div class="stat-tile">
        <div class="stat-tile-label">🌧 Rain Risk</div>
        <div class="stat-tile-value" style="color:${rainRisk.risk >= 4 ? 'var(--color-poor)' : rainRisk.risk >= 2 ? 'var(--color-moderate)' : 'var(--color-excellent)'};">${rainRisk.label}</div>
        <div class="stat-tile-sub">${conditions.rainProb}% probability</div>
      </div>
    </div>

    <!-- Insights -->
    ${humInsight || rainInsight ? `
    <div class="card card-sm" style="margin-bottom:var(--spacing-4);">
      <h4 style="margin-bottom:var(--spacing-2);">Algorithm Insights</h4>
      ${humInsight ? `<p style="font-size:0.85rem;margin-bottom:var(--spacing-1);">💧 Humidity at ${conditions.humidity}% ${humInsight}</p>` : ''}
      ${rainInsight ? `<p style="font-size:0.85rem;margin-bottom:0;">🌧 Rain probability at ${conditions.rainProb}% ${rainInsight}</p>` : ''}
    </div>` : ''}

    <!-- Factor breakdown -->
    <div class="card card-sm">
      <h4 style="margin-bottom:var(--spacing-3);">Factors Contribution Breakdown</h4>
      ${UI.renderScoreBreakdown(scoreData.factors)}
    </div>
  `;

  UI.animateScoreRings();
}
