// js/forecast.js
// Authoritative Lagos Forecast & Drying Window Engine
import { calculateDryingScore } from './drying-score.js';
import { getLagosNow, parseLagosDate, formatLagosDateStr, formatTime, formatDate } from './utils.js';

/**
 * Transforms raw Open-Meteo hourly data into a normalized, reliable array of forecast objects
 */
export function processHourlyForecast(hourlyData) {
  if (!hourlyData || !hourlyData.time || !Array.isArray(hourlyData.time)) {
    return [];
  }

  const {
    time,
    temperature_2m,
    relative_humidity_2m,
    precipitation_probability,
    precipitation,
    wind_speed_10m,
    weather_code,
    is_day
  } = hourlyData;

  const processed = [];

  for (let i = 0; i < time.length; i++) {
    const timeStr = time[i];
    const dateObj = parseLagosDate(timeStr);
    const lagosDateStr = formatLagosDateStr(dateObj);
    
    // Extract Lagos hour
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Lagos',
      hour: 'numeric',
      hour12: false
    });
    const lagosHour = parseInt(formatter.format(dateObj), 10) % 24;

    const conditions = {
      temperature: typeof temperature_2m?.[i] === 'number' ? temperature_2m[i] : (Number(temperature_2m?.[i]) || 26),
      humidity: typeof relative_humidity_2m?.[i] === 'number' ? relative_humidity_2m[i] : (Number(relative_humidity_2m?.[i]) || 75),
      wind: typeof wind_speed_10m?.[i] === 'number' ? wind_speed_10m[i] : (Number(wind_speed_10m?.[i]) || 10),
      rainProb: typeof precipitation_probability?.[i] === 'number' ? precipitation_probability[i] : (Number(precipitation_probability?.[i]) || 0),
      precipitation: typeof precipitation?.[i] === 'number' ? precipitation[i] : (Number(precipitation?.[i]) || 0),
      isDay: Number(is_day?.[i]) === 1,
      weatherCode: Number(weather_code?.[i]) || 0
    };

    const scoreData = calculateDryingScore(conditions);

    processed.push({
      time: timeStr,
      date: dateObj,
      timestamp: dateObj.getTime(),
      lagosDateStr,
      lagosHour,
      conditions,
      score: scoreData.score,
      category: scoreData.category,
      cssClass: scoreData.cssClass
    });
  }

  return processed;
}

/**
 * Finds and ranks the best practical drying window using actual meteorological telemetry
 * Supports Outcome A (Good Window), Outcome B (Marginal/Short Available Window), and Outcome C (Tomorrow Fallback / Indoor Advice)
 */
export function findBestDryingWindow(processedHourly, estimatedHours = 3.5, targetDate = null) {
  if (!processedHourly || processedHourly.length === 0) {
    return createFallbackWindow('No hourly forecast telemetry is available.');
  }

  const lagosNow = getLagosNow();
  
  // Determine target date string in Lagos timezone
  let targetDateStr;
  if (targetDate) {
    targetDateStr = formatLagosDateStr(targetDate);
  } else {
    targetDateStr = lagosNow.dateStr;
  }

  const isToday = (targetDateStr === lagosNow.dateStr);

  // Filter hours belonging to the target Lagos day
  const dayHours = processedHourly.filter(h => h.lagosDateStr === targetDateStr);

  if (dayHours.length === 0) {
    return createFallbackWindow(`No forecast data found for date ${targetDateStr}.`);
  }

  // Filter relevant future hours
  let candidateHours;
  if (isToday) {
    // If current time is past 25 minutes into the hour, consider from next hour
    const startHourThreshold = lagosNow.minute > 25 ? lagosNow.hour + 1 : lagosNow.hour;
    candidateHours = dayHours.filter(h => h.lagosHour >= startHourThreshold);
  } else {
    candidateHours = dayHours;
  }

  const requiredDuration = Math.max(1, Math.ceil(estimatedHours));

  // Search candidate windows for the target day
  const candidateResults = evaluateCandidateWindows(candidateHours, requiredDuration, isToday);

  // ── If a suitable window was found for today / target date ────────────────
  if (candidateResults.bestWindow) {
    const win = candidateResults.bestWindow;
    const isShort = win.duration < requiredDuration;

    // Check if rain is forecasted in 1-3 hours following the window
    const lastWindowHourIndex = dayHours.findIndex(h => h.lagosHour === win.endHour);
    let rainAfterWindow = false;
    let rainAfterHourStr = null;

    if (lastWindowHourIndex >= 0 && lastWindowHourIndex + 1 < dayHours.length) {
      const nextHours = dayHours.slice(lastWindowHourIndex + 1, lastWindowHourIndex + 4);
      const rainHour = nextHours.find(h => (h.conditions.rainProb >= 50 || h.conditions.precipitation >= 0.5));
      if (rainHour) {
        rainAfterWindow = true;
        rainAfterHourStr = formatTime(rainHour.date);
      }
    }

    // Outcome A: Good Window (Score >= 65, rainRisk <= Moderate)
    if (win.avgScore >= 65 && !isShort && !rainAfterWindow) {
      return {
        hasSafeWindow: true,
        isShortWindow: false,
        start: win.start,
        end: win.end,
        duration: win.duration,
        avgScore: win.avgScore,
        adjustedScore: win.candidateScore,
        rainRisk: win.maxRainProb <= 20 ? 'Low' : 'Moderate',
        isDay: win.isDaylight,
        rainAfterWindow: false,
        status: 'optimal',
        icon: '☀️',
        title: 'BEST DRYING WINDOW',
        headline: `${formatTime(win.start)} – ${formatTime(win.end)} (${win.duration}h)`,
        explanation: `Favorable drying conditions with low rain probability (~${win.avgRainProb}%) and warm temperatures (~${win.avgTemp}°C).`,
        recommendation: `✓ Favorable for outdoor drying. Bring clothes in by ${formatTime(win.end)}.`
      };
    }

    // Outcome A (Variant): Good Window with Approaching Rain
    if (win.avgScore >= 60 && !isShort && rainAfterWindow) {
      return {
        hasSafeWindow: true,
        isShortWindow: false,
        start: win.start,
        end: win.end,
        duration: win.duration,
        avgScore: win.avgScore,
        adjustedScore: win.candidateScore,
        rainRisk: 'Moderate',
        isDay: win.isDaylight,
        rainAfterWindow: true,
        rainAfterHourStr,
        status: 'caution',
        icon: '⚠️',
        title: 'BEST DRYING WINDOW',
        headline: `${formatTime(win.start)} – ${formatTime(win.end)} (${win.duration}h)`,
        explanation: `Good drying conditions during this ${win.duration}-hour window. However, rain risk increases significantly around ${rainAfterHourStr}.`,
        recommendation: `✓ Safe to dry outdoors now. Ensure clothes are collected before ${rainAfterHourStr}.`
      };
    }

    // Outcome B: Marginal or Short Available Window
    return {
      hasSafeWindow: true,
      isShortWindow: isShort,
      start: win.start,
      end: win.end,
      duration: win.duration,
      avgScore: win.avgScore,
      adjustedScore: win.candidateScore,
      rainRisk: win.maxRainProb > 40 ? 'Moderate' : 'Low',
      isDay: win.isDaylight,
      rainAfterWindow,
      rainAfterHourStr,
      status: 'short',
      icon: isShort ? '⏱️' : '🌤️',
      title: isShort ? 'BEST AVAILABLE WINDOW (SHORT)' : 'BEST AVAILABLE WINDOW',
      headline: `${formatTime(win.start)} – ${formatTime(win.end)} (${win.duration}h)`,
      explanation: isShort
        ? `A ${win.duration}-hour window is available. This is shorter than the estimated ${estimatedHours.toFixed(1)}h required for full drying of heavier fabrics.`
        : `Moderate drying conditions (~${win.avgHumidity}% humidity, ${win.avgTemp}°C). Drying may take slightly longer.`,
      recommendation: isShort
        ? `👕 Suitable for lightweight clothing (T-shirts, synthetics, silk) or small loads.`
        : `Monitor changing weather and use a high-spin cycle.`
    };
  }

  // ── Outcome C: No Suitable Window Today ──────────────────────
  // If no safe window remains today, diagnose the exact reason AND check Tomorrow Fallback
  let primaryReason = 'POOR_CONDITIONS';
  let title = 'NO SAFE OUTDOOR WINDOW TODAY';
  let headline = 'Unfavorable Outdoor Conditions';
  let explanation = 'No continuous safe drying period was identified in the remaining forecast today.';
  let icon = '⛅';

  const remainingDaylightHours = candidateHours.filter(h => h.conditions.isDay);

  if (isToday && (candidateHours.length === 0 || remainingDaylightHours.length === 0 || lagosNow.hour >= 18)) {
    primaryReason = 'PAST_DAYLIGHT';
    title = "TODAY'S BEST WINDOW HAS PASSED";
    headline = 'Sun Has Set for Today';
    explanation = 'There are no remaining daylight hours today for outdoor solar drying.';
    icon = '🌙';
  } else {
    const maxRainInRemaining = candidateHours.length > 0 ? Math.max(...candidateHours.map(h => h.conditions.rainProb)) : 0;
    const maxPrecipInRemaining = candidateHours.length > 0 ? Math.max(...candidateHours.map(h => h.conditions.precipitation)) : 0;
    const avgHumInRemaining = candidateHours.length > 0 ? Math.round(candidateHours.reduce((s, h) => s + h.conditions.humidity, 0) / candidateHours.length) : 0;

    if (maxRainInRemaining >= 60 || maxPrecipInRemaining >= 1.0) {
      primaryReason = 'RAIN_RISK';
      title = 'NO SAFE OUTDOOR WINDOW TODAY';
      headline = 'Elevated Rain Probability';
      explanation = `Rain probability remains elevated (~${maxRainInRemaining}%) with precipitation predicted during remaining hours.`;
      icon = '🌧️';
    } else if (avgHumInRemaining >= 88) {
      primaryReason = 'HIGH_HUMIDITY';
      title = 'NO IDEAL OUTDOOR WINDOW TODAY';
      headline = 'Excessive Humidity Stalling Evaporation';
      explanation = `Relative humidity is expected to remain near ${avgHumInRemaining}%, severely slowing moisture evaporation.`;
      icon = '💧';
    }
  }

  // STEP 16: TOMORROW FALLBACK CALCULATION
  let nextBestWindow = null;
  if (isToday) {
    const tomorrowDate = new Date(lagosNow.timestamp + 24 * 3600 * 1000);
    const tomorrowDateStr = formatLagosDateStr(tomorrowDate);
    const tomorrowHours = processedHourly.filter(h => h.lagosDateStr === tomorrowDateStr);

    if (tomorrowHours.length > 0) {
      const tomorrowResults = evaluateCandidateWindows(tomorrowHours, requiredDuration, false);
      if (tomorrowResults.bestWindow) {
        const tw = tomorrowResults.bestWindow;
        nextBestWindow = {
          dateStr: `Tomorrow (${formatDate(tw.start)})`,
          start: tw.start,
          end: tw.end,
          duration: tw.duration,
          score: tw.avgScore,
          headline: `Tomorrow ${formatTime(tw.start)} – ${formatTime(tw.end)} (${tw.duration}h)`,
          recommendation: `Plan your wash for tomorrow morning from ${formatTime(tw.start)}.`
        };
      }
    }
  }

  return {
    hasSafeWindow: false,
    isShortWindow: false,
    start: null,
    end: null,
    duration: 0,
    avgScore: 0,
    adjustedScore: 0,
    status: 'unsafe',
    primaryReason,
    icon,
    title,
    headline,
    explanation,
    recommendation: nextBestWindow 
      ? `🏠 Dry indoors today. Next best outdoor window: ${nextBestWindow.headline}.`
      : `🏠 Dry indoors today using a drying rack or well-ventilated room.`,
    nextBestWindow
  };
}

/**
 * Evaluates candidate windows across a slice of hours
 */
function evaluateCandidateWindows(hoursList, requiredDuration, isToday) {
  if (!hoursList || hoursList.length === 0) {
    return { bestWindow: null };
  }

  const daylightHours = hoursList.filter(h => h.conditions.isDay);
  // If daylight hours are available, prioritize daylight slices
  const searchPool = daylightHours.length >= 2 ? daylightHours : hoursList;

  // Try candidate durations from requiredDuration down to minimum viable duration (min 1.5h - 2h)
  const minViableDuration = Math.max(1, Math.min(2, Math.floor(requiredDuration * 0.5)));
  
  let bestCandidate = null;
  let highestCandidateScore = -1;

  for (let dur = requiredDuration; dur >= minViableDuration; dur--) {
    for (let i = 0; i <= searchPool.length - dur; i++) {
      const slice = searchPool.slice(i, i + dur);

      // Verify consecutive hour continuity (e.g. difference between first and last is exactly dur - 1 hours)
      const firstHour = slice[0].lagosHour;
      const lastHour = slice[slice.length - 1].lagosHour;
      const hourSpan = (lastHour >= firstHour) ? (lastHour - firstHour + 1) : (lastHour + 24 - firstHour + 1);
      
      if (hourSpan !== dur) {
        continue; // Non-consecutive hours
      }

      const avgScore = Math.round(slice.reduce((s, h) => s + h.score, 0) / dur);
      const avgRainProb = Math.round(slice.reduce((s, h) => s + h.conditions.rainProb, 0) / dur);
      const maxRainProb = Math.max(...slice.map(h => h.conditions.rainProb));
      const maxPrecip = Math.max(...slice.map(h => h.conditions.precipitation));
      const avgHumidity = Math.round(slice.reduce((s, h) => s + h.conditions.humidity, 0) / dur);
      const avgTemp = Math.round(slice.reduce((s, h) => s + h.conditions.temperature, 0) / dur);
      const allDaylight = slice.every(h => h.conditions.isDay);

      // ── Rejection Thresholds (Only reject genuinely unsafe weather) ──
      // 1. Active heavy rainfall in the window (> 1.2mm)
      if (maxPrecip > 1.2) continue;

      // 2. Continuous high rain probability (> 65% average)
      if (avgRainProb > 65) continue;

      // 3. Score below minimum viability (< 45)
      if (avgScore < 45) continue;

      // ── Continuous Candidate Scoring ──
      let candidateScore = avgScore;

      // Duration bonus: full requested duration preferred
      if (dur === requiredDuration) candidateScore += 5;

      // Daylight preference
      if (allDaylight) candidateScore += 5;
      else candidateScore -= 15;

      // Gentle rain risk penalty (do not discard reasonable 30-40% days)
      if (maxRainProb > 30) {
        candidateScore -= (maxRainProb - 30) * 0.35;
      }

      // Wind assistance bonus
      const avgWind = slice.reduce((s, h) => s + h.conditions.wind, 0) / dur;
      if (avgWind >= 12) candidateScore += 3;

      candidateScore = Math.round(Math.max(0, candidateScore));

      if (candidateScore > highestCandidateScore) {
        highestCandidateScore = candidateScore;

        // End time is end of the final hour
        const endDate = new Date(slice[slice.length - 1].date.getTime() + 3600 * 1000);

        bestCandidate = {
          start: slice[0].date,
          end: endDate,
          startHour: firstHour,
          endHour: lastHour,
          duration: dur,
          avgScore,
          candidateScore,
          avgRainProb,
          maxRainProb,
          maxPrecip,
          avgHumidity,
          avgTemp,
          isDaylight: allDaylight
        };
      }
    }

    // If we found a solid full-length window (score >= 60), we don't need to degrade to shorter slices
    if (bestCandidate && dur === requiredDuration && bestCandidate.candidateScore >= 60) {
      break;
    }
  }

  return { bestWindow: bestCandidate };
}

function createFallbackWindow(explanation) {
  return {
    hasSafeWindow: false,
    isShortWindow: false,
    start: null,
    end: null,
    duration: 0,
    avgScore: 0,
    adjustedScore: 0,
    status: 'unavailable',
    icon: '📡',
    title: 'NO SAFE OUTDOOR WINDOW',
    headline: 'Forecast Unavailable',
    explanation,
    recommendation: 'Check internet connection or retry in a moment.'
  };
}
