import { useEffect, useRef, useState } from 'react';
import { getLatest } from '../services/api';

const POLL_MS = Number(process.env.REACT_APP_POLL_MS || 30000);

export function useHomeStations() {
  const [stations, setStations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const timerRef = useRef(null);

  const upsertStations = (rows) => {
    setStations(prev => {
      const next = { ...prev };
      rows.forEach(r => {
        const prevStation = prev[r.alias];
        // Keep previous values if missing in this cycle
        next[r.alias] = {
          temp: r.temperature_c ?? prevStation?.temp ?? null,
          humidity: r.humidity_pct ?? prevStation?.humidity ?? null,
          pressure: r.pressure_hpa ?? prevStation?.pressure ?? null,
          rain: r.rainfall_mm ?? prevStation?.rain ?? null,
          wind: r.windspeed_ms ?? prevStation?.wind ?? null,
          time: r.reading_ts ?? prevStation?.time ?? null,
          name: r.name,
        };
      });
      return next;
    });
  };

  const fetchOnce = async () => {
    try {
      const res = await getLatest();
      const rows = Array.isArray(res.data) ? res.data : [];
      upsertStations(rows);
      setLastUpdated(new Date());
      setError(null);
      setLoading(false);
    } catch (e) {
      setError(e.message || 'Failed to load latest readings');
      setLoading(false);
      // keep last good stations on screen
    }
  };

  useEffect(() => {
    fetchOnce();
    timerRef.current = setInterval(fetchOnce, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { loading, error, stations, lastUpdated };
}


