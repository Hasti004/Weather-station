/**
 * Custom hook for polling live weather data from FastAPI (CRA + JS version)
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
const INTERVAL = Number(process.env.REACT_APP_LIVE_INTERVAL_MS || 30000);

export function useLiveLatest() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const abortControllerRef = useRef(null);
  const intervalRef = useRef(null);
  const fetchDataRef = useRef(null);

  const fetchData = useCallback(async (signal) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/latest`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal });
      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        setError(errorMsg);
        setData(null);
        return;
      }
      const result = await response.json();
      setData(result.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      setError(`Could not fetch: ${err && err.message ? err.message : 'Unknown error'}`);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  fetchDataRef.current = fetchData;

  const refresh = useCallback(() => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    if (fetchDataRef.current) fetchDataRef.current(abortControllerRef.current.signal);
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(() => {
      if (fetchDataRef.current) {
        if (abortControllerRef.current) abortControllerRef.current.abort();
        abortControllerRef.current = new AbortController();
        setIsLoading(true);
        fetchDataRef.current(abortControllerRef.current.signal);
      }
    }, INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [refresh]);

  return { data, isLoading, error, refresh, lastUpdated };
}


