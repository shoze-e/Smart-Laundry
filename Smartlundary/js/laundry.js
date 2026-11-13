// js/laundry.js
// Centralized Single Source of Truth for Laundry Decision & Window Evaluation
import { calculateDryingScore } from './drying-score.js';
import { estimateDryingTime } from './drying-time.js';
import { processHourlyForecast, findBestDryingWindow } from './forecast.js';
import { getRainRisk } from './utils.js';
import { UI } from './ui.js';

export function calculateLaundryRecommendation(weatherData, preferences = {}) {
  const fabric = preferences.fabric || 'cotton';
  const washingMethod = preferences.washingMethod || 'normal_spin';
  const loadSize = preferences.loadSize || 'medium';
  const dryingPreference = preferences.dryingPreference || 'outdoor';

  const weatherCode = Number(weatherData?.current?.weather_code) || 0;
  const weatherCondition = UI.getConditionText(weatherCode);
  const weatherConditionIcon = UI.getConditionIcon(weatherCode);

  // Use current hour conditions for base score
  const currentConditions = {
    temperature: typeof weatherData.current?.temperature_2m === 'number' ? weatherData.current.temperature_2m : (Number(weatherData.current?.temperature_2m) || 26),
    humidity: typeof weatherData.current?.relative_humidity_2m === 'number' ? weatherData.current.relative_humidity_2m : (Number(weatherData.current?.relative_humidity_2m) || 75),
    wind: typeof weatherData.current?.wind_speed_10m === 'number' ? weatherData.current.wind_speed_10m : (Number(weatherData.current?.wind_speed_10m) || 10),
    rainProb: (weatherData.hourly && weatherData.hourly.precipitation_probability && typeof weatherData.hourly.precipitation_probability[0] === 'number') 
      ? weatherData.hourly.precipitation_probability[0] 
      : (Number(weatherData.hourly?.precipitation_probability?.[0]) || 0),
    precipitation: typeof weatherData.current?.precipitation === 'number' ? weatherData.current.precipitation : (Number(weatherData.current?.precipitation) || 0)
  };

  const scoreData = calculateDryingScore(currentConditions);
  const estimatedTimeHours = estimateDryingTime(fabric, washingMethod, loadSize, currentConditions);
  
  const processedHourly = processHourlyForecast(weatherData.hourly);
  const bestWindow = findBestDryingWindow(processedHourly, estimatedTimeHours);
  
  const rainRiskData = getRainRisk(currentConditions.rainProb, currentConditions.precipitation);

  // Window status definition (AVAILABLE | SHORT_WINDOW | NO_SAFE_WINDOW)
  let windowStatus = "NO_SAFE_WINDOW";
  if (bestWindow && bestWindow.hasSafeWindow) {
    windowStatus = bestWindow.isShortWindow ? "SHORT_WINDOW" : "AVAILABLE";
  }

  // Generate warnings
  const warnings = [];
  if (rainRiskData.risk >= 4) {
    warnings.push("High risk of rain. Avoid outdoor drying.");
  }
  if (dryingPreference === "indoor") {
    warnings.push("Indoor drying selected. Actual drying time will depend on room ventilation.");
  }
  if (bestWindow && bestWindow.hasSafeWindow && bestWindow.rainAfterWindow) {
    warnings.push(`Rain is forecasted shortly after your drying window (${bestWindow.rainAfterHourStr || 'later today'}). Collect laundry promptly.`);
  }
  if (bestWindow && bestWindow.hasSafeWindow && !bestWindow.isDay) {
    warnings.push("Best drying window extends into the night.");
  }

  // Adjust recommendation text based on risk/preference
  let finalRecommendation = scoreData.recommendation;
  let finalCssClass = scoreData.cssClass;

  if (rainRiskData.risk >= 4 && dryingPreference !== "indoor") {
    finalRecommendation = "RAIN LIKELY — AVOID OUTDOOR DRYING";
    finalCssClass = "poor";
  } else if (bestWindow && !bestWindow.hasSafeWindow && dryingPreference !== "indoor") {
    finalRecommendation = bestWindow.title || "NO SAFE OUTDOOR WINDOW TODAY";
    finalCssClass = "poor";
  } else if (bestWindow && bestWindow.isShortWindow && dryingPreference !== "indoor") {
    finalRecommendation = "SHORT DRYING WINDOW AVAILABLE";
    finalCssClass = "moderate";
  }

  return {
    ...scoreData,
    recommendation: finalRecommendation,
    cssClass: finalCssClass,
    estimatedTimeHours,
    bestWindow,
    bestDryingWindow: bestWindow,
    windowStatus,
    weatherCondition,
    weatherConditionIcon,
    weatherCode,
    rainRisk: rainRiskData,
    warnings,
    currentConditions
  };
}
