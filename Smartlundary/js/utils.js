// js/utils.js
// Authoritative Timezone: Africa/Lagos (UTC+1)

export const LAGOS_TIMEZONE = "Africa/Lagos";

/**
 * Returns current date and time components in Africa/Lagos timezone
 */
export function getLagosNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: LAGOS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // Lagos timestamp Date object anchored to UTC+1
  const lagosDate = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}+01:00`);

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    lagosDate,
    timestamp: lagosDate.getTime()
  };
}

/**
 * Parses an Open-Meteo timestamp string (e.g. "2026-08-22T10:00") into a Date object representing Lagos time (UTC+1)
 */
export function parseLagosDate(timeStr) {
  if (!timeStr) return new Date();
  if (timeStr instanceof Date) return timeStr;

  // If timeStr does not have timezone offset, attach Lagos WAT (+01:00)
  if (typeof timeStr === 'string') {
    if (timeStr.length === 16 && timeStr.includes('T')) {
      return new Date(`${timeStr}:00+01:00`);
    } else if (timeStr.length === 10 && !timeStr.includes('T')) {
      return new Date(`${timeStr}T00:00:00+01:00`);
    } else if (!timeStr.includes('+') && !timeStr.includes('Z')) {
      return new Date(`${timeStr}+01:00`);
    }
  }

  return new Date(timeStr);
}

/**
 * Formats a timestamp into Lagos local time (e.g. "10:00 AM")
 */
export function formatTime(isoOrDate) {
  if (!isoOrDate) return "N/A";
  const date = parseLagosDate(isoOrDate);
  if (isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat('en-US', {
    timeZone: LAGOS_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

/**
 * Formats a timestamp into Lagos local date (e.g. "Sat, Aug 22")
 */
export function formatDate(isoOrDate) {
  if (!isoOrDate) return "N/A";
  const date = parseLagosDate(isoOrDate);
  if (isNaN(date.getTime())) return "N/A";

  return new Intl.DateTimeFormat('en-US', {
    timeZone: LAGOS_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

/**
 * Formats a full date string (e.g. "2026-08-22")
 */
export function formatLagosDateStr(date) {
  const d = parseLagosDate(date);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LAGOS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  
  const map = {};
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

export function getHoursDifference(date1, date2) {
  const d1 = parseLagosDate(date1);
  const d2 = parseLagosDate(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return diffTime / (1000 * 60 * 60);
}

// Convert hours (e.g., 3.5) into "3h 30m" format
export function formatDuration(hoursDecimal) {
  if (hoursDecimal === null || hoursDecimal === undefined || isNaN(hoursDecimal) || hoursDecimal <= 0) return "N/A";
  const h = Math.floor(hoursDecimal);
  const m = Math.round((hoursDecimal - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Calculate the rain risk category based on probability and amount
export function getRainRisk(probability, precipitation) {
  const p = Number(probability) || 0;
  const mm = Number(precipitation) || 0;

  if (p > 70 || mm > 2.0) return { category: "Very High", risk: 5, label: "Very High" };
  if (p > 50 || mm > 0.5) return { category: "High", risk: 4, label: "High" };
  if (p > 30 || mm > 0.1) return { category: "Moderate", risk: 3, label: "Moderate" };
  if (p > 10) return { category: "Low", risk: 2, label: "Low" };
  return { category: "Very Low", risk: 1, label: "Very Low" };
}

/**
 * Calculates the great-circle distance between two geographic coordinates
 * using the Haversine formula.
 * @param {number} lat1 Latitude of point 1 in decimal degrees
 * @param {number} lon1 Longitude of point 1 in decimal degrees
 * @param {number} lat2 Latitude of point 2 in decimal degrees
 * @param {number} lon2 Longitude of point 2 in decimal degrees
 * @returns {number} Distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const numLat1 = Number(lat1);
  const numLon1 = Number(lon1);
  const numLat2 = Number(lat2);
  const numLon2 = Number(lon2);

  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) {
    return Infinity;
  }

  const R = 6371; // Earth's mean radius in kilometers
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(numLat2 - numLat1);
  const dLon = toRad(numLon2 - numLon1);

  const lat1Rad = toRad(numLat1);
  const lat2Rad = toRad(numLat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
