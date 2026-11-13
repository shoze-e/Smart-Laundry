// js/drying-time.js
import { FABRICS, WASHING_METHODS, LOAD_SIZES } from '../data/fabrics.js';

/**
 * Estimates drying time in hours based on physics heuristics.
 */
export function estimateDryingTime(fabricKey, washKey, loadKey, weatherConditions) {
  const fabric = FABRICS[fabricKey] || FABRICS["cotton"];
  const wash = WASHING_METHODS[washKey] || WASHING_METHODS["normal_spin"];
  const load = LOAD_SIZES[loadKey] || LOAD_SIZES["medium"];
  
  const { temperature, humidity, wind } = weatherConditions;

  // Baseline time in hours for cotton, normal spin, medium load at 25C, 60% hum, 10km/h wind
  const BASE_TIME = 3.5; 

  // Temperature effect (Higher = faster, lower = slower)
  // Baseline is 25C. 
  let tempFactor = 25 / Math.max(1, temperature); 

  // Humidity effect (Higher = slower)
  // Baseline is 60%. As it approaches 100%, drying time goes to infinity conceptually.
  let humFactor = 1.0;
  if (humidity < 60) humFactor = 0.8 + (humidity / 60) * 0.2; // 0.8x to 1.0x
  else if (humidity < 90) humFactor = 1.0 + ((humidity - 60) / 30) * 1.5; // 1.0x to 2.5x
  else humFactor = 3.0; // Very slow at 90%+

  // Wind effect (Higher = faster)
  // Baseline is 10km/h. 
  let windFactor = 1.0;
  if (wind >= 10) windFactor = Math.max(0.6, 10 / wind);
  else windFactor = 1.0 + ((10 - wind) / 10) * 0.5; // Up to 1.5x slower

  // Calculate total adjustment
  let estimatedHours = BASE_TIME 
    * fabric.baseDryingFactor 
    * wash.timeMultiplier 
    * load.timeMultiplier 
    * tempFactor 
    * humFactor 
    * windFactor;

  // Cap minimum and maximum times for realism
  estimatedHours = Math.max(0.5, Math.min(estimatedHours, 24)); // 30 mins to 24 hours

  return estimatedHours;
}
