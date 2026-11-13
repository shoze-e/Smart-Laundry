// js/weather.js
import { getLocationById, isValidLocation } from '../data/locations.js';

// Open-Meteo endpoint
const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export async function fetchWeather(locationId) {
  const location = getLocationById(locationId);

  // Validate location and coordinates before sending request
  if (!isValidLocation(location)) {
    throw new Error(`Invalid location data for ID: "${locationId}". Coordinates are out of range or missing.`);
  }

  const lat = typeof location.latitude === 'number' ? location.latitude : location.lat;
  const lon = typeof location.longitude === 'number' ? location.longitude : location.lon;

  // Open-Meteo parameters
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
    hourly: "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max",
    timezone: "Africa/Lagos",
    forecast_days: 16
  });

  try {
    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Weather API returned status: ${response.status} (${response.statusText})`);
    }
    const data = await response.json();
    
    // Attach location metadata for reference
    data._location = {
      id: location.id,
      name: location.name,
      fullName: location.fullName,
      lat: lat,
      lon: lon,
      fetchedAt: new Date().toISOString()
    };
    
    return data;
  } catch (error) {
    console.error(`Failed to fetch weather data for ${location.name} (${lat}, ${lon}):`, error);
    throw error;
  }
}
