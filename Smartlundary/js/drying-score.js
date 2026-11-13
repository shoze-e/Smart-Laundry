// js/drying-score.js

/**
 * Calculates a drying score (0-100) based on weather parameters.
 * @param {Object} conditions - { temperature, humidity, wind, rainProb, precipitation }
 */
export function calculateDryingScore(conditions) {
  const { temperature, humidity, wind, rainProb, precipitation } = conditions;

  // Max points for each factor
  const WEIGHTS = {
    temp: 20,
    humidity: 25,
    wind: 20,
    rain: 30,
    precip: 5
  };

  const factors = [];
  
  // 1. Temperature (Ideal: 30C+)
  let tempScore = 0;
  if (temperature >= 30) tempScore = WEIGHTS.temp;
  else if (temperature >= 25) tempScore = WEIGHTS.temp * 0.8;
  else if (temperature >= 20) tempScore = WEIGHTS.temp * 0.6;
  else if (temperature >= 15) tempScore = WEIGHTS.temp * 0.4;
  else tempScore = WEIGHTS.temp * 0.2;
  
  factors.push({ name: "Temperature", reading: `${temperature}°C`, contribution: Math.round(tempScore), max: WEIGHTS.temp, desc: getTempDesc(temperature) });

  // 2. Humidity (Ideal: < 50%)
  let humScore = 0;
  if (humidity < 50) humScore = WEIGHTS.humidity;
  else if (humidity < 60) humScore = WEIGHTS.humidity * 0.8;
  else if (humidity < 75) humScore = WEIGHTS.humidity * 0.5;
  else if (humidity < 85) humScore = WEIGHTS.humidity * 0.2;
  else humScore = 0;

  factors.push({ name: "Humidity", reading: `${humidity}%`, contribution: Math.round(humScore), max: WEIGHTS.humidity, desc: getHumDesc(humidity) });

  // 3. Wind (Ideal: 15-25 km/h)
  let windScore = 0;
  if (wind >= 15 && wind <= 30) windScore = WEIGHTS.wind;
  else if (wind > 30) windScore = WEIGHTS.wind * 0.8; // Too windy might blow clothes away, but great for drying
  else if (wind >= 10) windScore = WEIGHTS.wind * 0.7;
  else if (wind >= 5) windScore = WEIGHTS.wind * 0.4;
  else windScore = WEIGHTS.wind * 0.1;

  factors.push({ name: "Wind", reading: `${wind} km/h`, contribution: Math.round(windScore), max: WEIGHTS.wind, desc: getWindDesc(wind) });

  // 4. Rain Probability (Ideal: 0%)
  let rainScore = 0;
  if (rainProb <= 5) rainScore = WEIGHTS.rain;
  else if (rainProb <= 20) rainScore = WEIGHTS.rain * 0.8;
  else if (rainProb <= 40) rainScore = WEIGHTS.rain * 0.4;
  else if (rainProb <= 60) rainScore = WEIGHTS.rain * 0.1;
  else rainScore = 0;

  factors.push({ name: "Rain Prob.", reading: `${rainProb}%`, contribution: Math.round(rainScore), max: WEIGHTS.rain, desc: getRainDesc(rainProb) });

  // 5. Precipitation (Ideal: 0mm)
  let precipScore = 0;
  if (precipitation === 0) precipScore = WEIGHTS.precip;
  else if (precipitation < 0.5) precipScore = WEIGHTS.precip * 0.5;
  else precipScore = 0;

  factors.push({ name: "Precipitation", reading: `${precipitation}mm`, contribution: Math.round(precipScore), max: WEIGHTS.precip, desc: precipitation === 0 ? "No active precipitation." : "Active precipitation slows drying." });

  // Calculate Total Score
  let totalScore = tempScore + humScore + windScore + rainScore + precipScore;
  totalScore = Math.min(100, Math.max(0, Math.round(totalScore)));

  // Forced penalties for terrible weather
  if (precipitation > 1.0 || rainProb >= 70) {
    totalScore = Math.min(totalScore, 40); // Cap at 40 if it's actually raining heavily
  }

  const category = getCategory(totalScore);

  return {
    score: totalScore,
    category: category.name,
    cssClass: category.cssClass,
    icon: category.icon,
    recommendation: category.recommendation,
    factors: factors
  };
}

function getCategory(score) {
  if (score >= 90) return { name: "Excellent", cssClass: "excellent", icon: "✅", recommendation: "GREAT DAY FOR LAUNDRY" };
  if (score >= 70) return { name: "Good", cssClass: "good", icon: "🌤️", recommendation: "GOOD CONDITIONS FOR LAUNDRY" };
  if (score >= 50) return { name: "Moderate", cssClass: "moderate", icon: "⚠️", recommendation: "MODERATE DRYING CONDITIONS" };
  return { name: "Poor", cssClass: "poor", icon: "❌", recommendation: "POOR DRYING CONDITIONS" };
}

function getTempDesc(t) {
  if (t >= 30) return "Very warm temperature is highly favorable for evaporation.";
  if (t >= 25) return "Warm temperature helps evaporation.";
  if (t >= 20) return "Moderate temperature is acceptable.";
  return "Cool temperature slows down evaporation.";
}

function getHumDesc(h) {
  if (h < 50) return "Low humidity allows moisture to escape clothes quickly.";
  if (h < 60) return "Moderate humidity is fine for drying.";
  if (h < 75) return "Slightly high humidity will moderately slow drying.";
  return "High humidity makes it very hard for clothes to dry.";
}

function getWindDesc(w) {
  if (w >= 15 && w <= 30) return "Excellent breeze to carry moisture away.";
  if (w >= 10) return "Good wind conditions help evaporation.";
  if (w >= 5) return "Light breeze provides minor help.";
  return "Stagnant air slows the drying process.";
}

function getRainDesc(r) {
  if (r <= 5) return "Negligible rain risk.";
  if (r <= 20) return "Low risk of rain.";
  if (r <= 40) return "Moderate rain risk, monitor weather.";
  return "High risk of rain, outdoor drying is risky.";
}
