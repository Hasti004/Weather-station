/**
 * API service for communicating with FastAPI backend
 * Replaces file-based data fetching with HTTP endpoints
 */

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";
console.log('[API] API_BASE set to:', API_BASE);

/**
 * Fetch latest readings from all weather stations with no-cache headers
 * @returns {Promise<Object>} Response with data array containing latest readings
 */
export async function fetchLatest() {
  console.log('[API] Fetching from:', `${API_BASE}/latest`);
  const res = await fetch(`${API_BASE}/latest`, {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    },
    cache: 'no-store'
  });
  console.log('[API] Response status:', res.status);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  const data = await res.json();
  console.log('[API] Response data:', data);
  return data;
}

// Station mapping constants
export const STATIONS = {
  ahm: 'Ahmedabad',
  udi: 'Udaipur',
  mtabu: 'Mount Abu'
};

// Map numeric station_id to alias and name used in UI
function mapStationMeta(id) {
  const n = Number(id);
  if (n === 1) return { alias: 'udi', name: 'Udaipur' };
  if (n === 2) return { alias: 'ahm', name: 'Ahmedabad' };
  if (n === 3) return { alias: 'mtabu', name: 'Mount Abu' };
  return { alias: String(id), name: `Station ${id}` };
}

/**
 * Fetch and normalize latest readings for home dashboard
 * @returns {Promise<{data:Array, lastUpdated:string}>}
 */
export async function getLatest() {
  const raw = await fetchLatest();
  const rows = Array.isArray(raw?.data) ? raw.data : [];
  const normalized = rows.map(r => {
    // Use slug if available, otherwise map from station_id
    const slug = r.slug || mapStationMeta(r.station_id).alias;
    const name = r.station_name || mapStationMeta(r.station_id).name;


    return {
      slug,
      station_id: r.station_id,
      name,
      location: r.location,
      temperature_c: r.temperature_c ?? null,
      humidity_pct: r.humidity_pct ?? null,
      pressure_hpa: r.pressure_hpa ?? null,
      rainfall_mm: r.rainfall_mm ?? null,
      windspeed_ms: r.windspeed_ms ?? null,
      reading_ts: r.reading_ts || r.timestamp || null,
    };
  });

  return {
    data: normalized,
    lastUpdated: raw.last_updated || null
  };
}

/**
 * Fetch latest row for a single station
 * @param {string|number} stationIdOrAlias - 1/2/3 or udi/ahm/mtabu/udaipur/ahmedabad/mountabu
 */
export async function fetchLatestOne(stationIdOrAlias) {
  const params = new URLSearchParams({ station_id: String(stationIdOrAlias) });
  const res = await fetch(`${API_BASE}/latest_one?${params}`);
  if (!res.ok) {
    let msg = `HTTP error! status: ${res.status}`;
    try {
      const j = await res.json();
      if (j.detail) msg = j.detail;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Fetch historical data for a specific station within a date range
 * @param {string|number} stationId - Station identifier
 * @param {string} start - Start date in YYYY-MM-DD format
 * @param {string} end - End date in YYYY-MM-DD format
 * @returns {Promise<Object>} Response with historical data
 */
export async function fetchRange(stationId, start, end) {
  // Convert dates to proper ISO format with time
  const startISO = `${start}T00:00:00`;
  const endISO = `${end}T23:59:59`;

  const params = new URLSearchParams({
    station_id: stationId,
    start: startISO,
    end: endISO
  });

  console.log(`Fetching range data: ${API_BASE}/range?${params}`);

  try {
    const res = await fetch(`${API_BASE}/range?${params}`);
    if (!res.ok) {
      console.error(`API request failed: ${res.status} ${res.statusText}`);
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    console.log(`Range data received: ${data.data?.length || 0} records`);
    return data;
  } catch (error) {
    console.error('Error fetching range data:', error);
    throw error;
  }
}

/**
 * Fetch rolling time series data for a specific station
 * @param {string|number} stationId - Station identifier
 * @param {number} minutes - Number of minutes to look back (default: 60)
 * @returns {Promise<Object>} Response with time series data
 */
export async function fetchSeries(stationId, minutes = 60) {
  const params = new URLSearchParams({
    station_id: stationId,
    minutes: minutes.toString()
  });
  const res = await fetch(`${API_BASE}/series?${params}`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch list of available weather observatories/stations
 * @returns {Promise<Object>} Response with observatories metadata
 */
export async function fetchObservatories() {
  const res = await fetch(`${API_BASE}/observatories`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

/**
 * Connect to real-time data stream using Server-Sent Events
 * @param {string|number} stationId - Station identifier (optional, for specific station)
 * @param {Function} onMessage - Callback function to handle incoming messages
 * @returns {EventSource} EventSource instance for managing the connection
 */
export function connectStream(stationId, onMessage) {
  const url = stationId
    ? `${API_BASE}/stream?station_id=${stationId}`
    : `${API_BASE}/stream`;

  const evtSource = new EventSource(url);

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch (error) {
      console.error('Error parsing stream data:', error);
    }
  };

  evtSource.onerror = (error) => {
    console.error('EventSource failed:', error);
  };

  return evtSource;
}

/**
 * Fetch daily availability for a station in a specific month
 * @param {number} stationId - Station ID (1, 2, 3)
 * @param {number} year - Year (e.g., 2025)
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Response with daily availability data
 */
export async function fetchAvailability(stationId, year, month) {
  const params = new URLSearchParams({
    station_id: stationId.toString(),
    year: year.toString(),
    month: month.toString()
  });

  const res = await fetch(`${API_BASE}/availability?${params}`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

/**
 * Export CSV data for a date range
 * @param {number} stationId - Station ID (1, 2, 3)
 * @param {string} start - Start date in YYYY-MM-DD format
 * @param {string} end - End date in YYYY-MM-DD format
 * @returns {Promise<Blob>} CSV file blob
 */
export async function exportCSV(stationId, start, end) {
  const params = new URLSearchParams({
    station_id: stationId.toString(),
    start: start,
    end: end
  });

  const res = await fetch(`${API_BASE}/export/csv?${params}`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.blob();
}

/**
 * New CSV export via /download/csv
 * @param {string|number} stationIdOrAlias - 1/2/3 or udaipur/ahmedabad/mountabu
 * @param {string} startYMD - YYYY-MM-DD
 * @param {string} endYMD - YYYY-MM-DD
 * @returns {Promise<Blob>} CSV file blob
 */
export async function exportCsv2(stationIdOrAlias, startYMD, endYMD) {
  const params = new URLSearchParams({
    station_id: String(stationIdOrAlias),
    start: startYMD,
    end: endYMD
  });

  const res = await fetch(`${API_BASE}/download/csv?${params}`);
  if (!res.ok) {
    try {
      const err = await res.json();
      throw new Error(err.detail || `HTTP error! status: ${res.status}`);
    } catch (_) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
  }
  return res.blob();
}

/**
 * Utility function to handle API errors consistently
 * @param {Error} error - Error object
 * @returns {string} User-friendly error message
 */
export function handleApiError(error) {
  if (error.name === 'AbortError') {
    return 'Request was cancelled';
  }
  if (error.message.includes('Failed to fetch')) {
    return 'Unable to connect to server. Please check your connection.';
  }
  if (error.message.includes('HTTP error')) {
    return `Server error: ${error.message}`;
  }
  return error.message || 'An unexpected error occurred';
}
