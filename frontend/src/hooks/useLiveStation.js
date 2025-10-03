import { useEffect, useRef, useState } from 'react';
import { fetchLatestOne } from '../services/api';

export function useLiveStation(stationIdOrAlias, { intervalMs = 30000 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdatedIso, setLastUpdatedIso] = useState(null);

  const timerRef = useRef(null);
  const backoffRef = useRef(1);
  const lastTsRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const schedule = (delay) => {
    clearTimer();
    timerRef.current = setInterval(poll, delay);
  };

  const poll = async () => {
    if (document.hidden) return; // pause when hidden
    try {
      const res = await fetchLatestOne(stationIdOrAlias);
      const newTs = res?.data?.["reading_ts"] || res?.data?.["timestamp"];
      if (!lastTsRef.current || newTs !== lastTsRef.current) {
        setData(res?.data || null);
        setLastUpdatedIso(new Date().toISOString());
        lastTsRef.current = newTs || null;
      }
      setError(null);
      setLoading(false);
      backoffRef.current = 1; // reset backoff on success
    } catch (e) {
      setError(e.message || 'Live feed unavailable — retrying…');
      setLoading(false);
      // exponential backoff up to 3x
      const factor = Math.min(3, backoffRef.current + 1);
      backoffRef.current = factor;
      schedule(intervalMs * factor);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    lastTsRef.current = null;
    backoffRef.current = 1;
    // immediate fetch
    poll();
    schedule(intervalMs);

    const onVis = () => {
      if (!document.hidden) poll();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationIdOrAlias, intervalMs]);

  return { data, loading, error, lastUpdatedIso };
}


