import { useEffect, useRef, useState } from 'react';
import { getLatest } from '../services/api';

export default function useLiveStations() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const timerRef = useRef(null);
  const pollMs = Number(process.env.REACT_APP_POLL_MS || 30000);

  const fetchOnce = async () => {
    try {
      const res = await getLatest();
      setData(Array.isArray(res.data) ? res.data : []);
      setLastUpdated(new Date());
      setError(null);
      setLoading(false);
    } catch (e) {
      setError(e.message || 'Failed to load latest readings');
      setLoading(false);
      // Keep last known data
    }
  };

  useEffect(() => {
    fetchOnce();
    timerRef.current = setInterval(fetchOnce, pollMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pollMs]);

  return { data, loading, error, lastUpdated };
}



