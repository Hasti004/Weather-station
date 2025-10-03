import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { getLatest } from '../services/api';

const LiveDataContext = createContext();

// Global flag to prevent duplicate polling loops in React StrictMode
if (typeof window !== 'undefined') {
  window.__LIVE_LOOP__ = window.__LIVE_LOOP__ || false;
}

export function LiveDataProvider({ children }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Memoize bySlug map to prevent unnecessary re-renders
  const bySlug = useMemo(() => {
    const map = {};
    list.forEach(station => {
      if (station.slug) {
        map[station.slug] = station;
      }
    });
    console.log(`[LiveDataProvider] bySlug map updated with ${Object.keys(map).length} stations:`, Object.keys(map));
    return map;
  }, [list]);

  const fetchData = async () => {
    if (!mountedRef.current) return;

    try {
      console.log('[LiveDataProvider] Fetching latest data...');
      const result = await getLatest();
      if (!mountedRef.current) return;

      console.log('[LiveDataProvider] Raw result:', result);
      setList(result.data || []);
      setLastUpdated(result.lastUpdated);
      setError(null);
      setLoading(false);

      // Debug logging for each refresh
      console.log(`[live refresh] ${new Date().toLocaleTimeString()}: ${result.data?.length || 0} stations updated`);
      if (result.data?.length > 0) {
        const sample = result.data[0];
        console.log(`[live refresh] Sample data - ${sample.slug}: temp=${sample.temperature_c}°C, humidity=${sample.humidity_pct}%`);
      } else {
        console.warn('[live refresh] No data received from API');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('[live] fetch failed:', err);

      // Only show error if we don't have any existing data
      if (list.length === 0) {
        setError(err.message || 'Failed to fetch live data');
      } else {
        console.warn('[live] Keeping existing data despite fetch error');
      }
      setLoading(false);
      // Keep previous data on screen, don't clear it
    }
  };

  const startPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const intervalMs = Number(process.env.REACT_APP_POLL_MS) || 30000;
    console.log('[LiveDataProvider] Starting polling with interval:', intervalMs, 'ms');
    intervalRef.current = setInterval(fetchData, intervalMs);
  };

  useEffect(() => {
    console.log('[LiveDataProvider] Initializing...');
    mountedRef.current = true;

    // Prevent duplicate polling loops
    if (window.__LIVE_LOOP__) {
      console.warn('[live] Polling loop already active, skipping initialization');
      return;
    }

    window.__LIVE_LOOP__ = true;

    // Initial fetch
    console.log('[LiveDataProvider] Starting initial fetch...');
    fetchData();
    startPolling();

    return () => {
      console.log('[LiveDataProvider] Cleaning up...');
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.__LIVE_LOOP__ = false;
    };
  }, []);

  const contextValue = {
    list,
    bySlug,
    lastUpdated,
    loading,
    error
  };

  return (
    <LiveDataContext.Provider value={contextValue}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveAll() {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error('useLiveAll must be used within a LiveDataProvider');
  }
  return context;
}

export function useLiveStation(slug) {
  const { bySlug, lastUpdated, loading, error } = useLiveAll();

  return {
    data: bySlug[slug] || null,
    lastUpdated,
    loading,
    error
  };
}
