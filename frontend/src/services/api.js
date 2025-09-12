/**
 * API service for communicating with FastAPI backend
 * Replaces file-based data fetching with HTTP endpoints
 */

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

/**
 * Fetch latest readings from all weather stations
 * @returns {Promise<Object>} Response with data array containing latest readings
 */
export async function fetchLatest() {
  const res = await fetch(`${API_BASE}/latest`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch historical data for a specific station within a date range
 * @param {string|number} stationId - Station identifier
 * @param {string} start - Start date in ISO format
 * @param {string} end - End date in ISO format
 * @returns {Promise<Object>} Response with historical data
 */
export async function fetchRange(stationId, start, end) {
  const params = new URLSearchParams({
    station_id: stationId,
    start: start,
    end: end
  });
  const res = await fetch(`${API_BASE}/range?${params}`);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
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
