// js/history-view.js — Preserves specific Lagos LGA for saved plans
import { UI } from './ui.js';
import { Storage } from './storage.js';
import { formatDuration } from './utils.js';
import { FABRICS } from '../data/fabrics.js';
import { getLocationById } from '../data/locations.js';

document.addEventListener('DOMContentLoaded', () => {
  UI.renderNavbar('history');

  document.getElementById('clearHistoryBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your laundry history? This cannot be undone.')) {
      Storage.clearHistory();
      renderHistory();
    }
  });

  renderHistory();
});

function renderHistory() {
  const history = Storage.getHistory();
  const container = document.getElementById('historyContainer');
  const statsContainer = document.getElementById('statsContainer');

  if (!history || history.length === 0) {
    statsContainer.innerHTML = '';
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:var(--spacing-10);">
        <span style="font-size:3rem;display:block;margin-bottom:var(--spacing-4);">📋</span>
        <h3>No Laundry Plans Saved Yet</h3>
        <p>Your saved laundry plans across all Lagos LGAs will appear here.<br>Use the Planner to generate and save your customized recommendations.</p>
        <a href="planner.html" class="btn btn-primary" style="margin-top:var(--spacing-4);">Plan Your Laundry</a>
      </div>`;
    return;
  }

  // Stats
  let totalScore = 0, totalTime = 0;
  const locations = {};
  history.forEach(item => {
    totalScore += item.recommendation.score;
    totalTime += item.recommendation.estimatedTimeHours;
    const lgaKey = item.locationId || 'ikeja';
    locations[lgaKey] = (locations[lgaKey] || 0) + 1;
  });

  const avgScore = Math.round(totalScore / history.length);
  const avgTime = totalTime / history.length;
  const mostUsedLocKey = Object.keys(locations).reduce((a, b) => locations[a] > locations[b] ? a : b);
  const mostUsedLga = getLocationById(mostUsedLocKey);

  statsContainer.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--spacing-3);margin-bottom:var(--spacing-4);">
      <div class="stat-tile" style="text-align:center;">
        <div class="stat-tile-label">Plans Saved</div>
        <div class="stat-tile-value">${history.length}</div>
      </div>
      <div class="stat-tile" style="text-align:center;">
        <div class="stat-tile-label">Avg Score</div>
        <div class="stat-tile-value" style="color:${avgScore >= 70 ? 'var(--color-excellent)' : avgScore >= 50 ? 'var(--color-moderate)' : 'var(--color-poor)'};">${avgScore}</div>
        <div class="stat-tile-sub">/ 100</div>
      </div>
      <div class="stat-tile" style="text-align:center;">
        <div class="stat-tile-label">Favourite LGA</div>
        <div class="stat-tile-value" style="font-size:0.95rem;">${mostUsedLga.name} LGA</div>
      </div>
    </div>`;

  // History list
  const items = history.map((item) => {
    const date = new Date(item.timestamp);
    const isToday = date.toDateString() === new Date().toDateString();
    const dateLabel = isToday ? 'Today' : date.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'short' });
    const timeLabel = date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    const cat = item.recommendation.category || 'moderate';
    const catClass = cat.toLowerCase();
    const fabricName = FABRICS[item.preferences?.fabric]?.name || (item.preferences?.fabric || 'Cotton');
    const lga = getLocationById(item.locationId);

    return `
      <div style="
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: var(--spacing-4) var(--spacing-5);
        display: flex;
        align-items: center;
        gap: var(--spacing-4);
        margin-bottom: var(--spacing-3);
        flex-wrap: wrap;
      ">
        <!-- Date pill -->
        <div style="min-width:90px;">
          <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-text-tertiary);">${dateLabel}</div>
          <div style="font-size:0.78rem;color:var(--color-text-secondary);">${timeLabel}</div>
        </div>

        <!-- Details -->
        <div style="flex:1;">
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:3px;">
            📍 ${lga.fullName || lga.name + ' LGA'}
          </div>
          <div style="display:flex;gap:var(--spacing-2);flex-wrap:wrap;">
            <span class="status-badge" style="background:var(--color-surface-secondary);color:var(--color-text-secondary);font-size:0.68rem;">${fabricName}</span>
            <span class="status-badge" style="background:var(--color-surface-secondary);color:var(--color-text-secondary);font-size:0.68rem;">${item.preferences?.loadSize || 'medium'} load</span>
            <span class="status-badge" style="background:var(--color-surface-secondary);color:var(--color-text-secondary);font-size:0.68rem;">${formatDuration(item.recommendation.estimatedTimeHours)}</span>
          </div>
        </div>

        <!-- Score -->
        <div style="text-align:right;min-width:70px;">
          <div style="font-size:1.5rem;font-weight:800;letter-spacing:-0.05em;color:${item.recommendation.score >= 70 ? 'var(--color-excellent)' : item.recommendation.score >= 50 ? 'var(--color-moderate)' : 'var(--color-poor)'};">${item.recommendation.score}</div>
          <span class="status-badge status-${catClass}">${cat}</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = items;
}
