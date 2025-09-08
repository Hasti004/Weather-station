import { useCallback, useEffect, useMemo, useState } from 'react';

// Single-line CSV format:
// [temperature_c, relative_humidity_pct, rainfall_mm, pressure_hpa, windspeed_ms, visibility_km]
// Example: 30,65,12,1012,8,6
// If multiple lines are present, we use the last non-empty line.

const METRIC_KEYS = [
    'temperature_c',
    'humidity_pct',
    'rainfall_mm',
    'pressure_hpa',
    'windspeed_ms',
    'visibility_km',
];

function parseLatestLine(text) {
    // Use the last non-empty line
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    if (!lines.length) return { error: 'No data lines found in file.' };
    const latest = lines[lines.length - 1];
    const parts = latest.split(',').map((p) => p.trim());
    if (parts.length !== 6) {
        return { error: `Expected 6 values, found ${parts.length}.` };
    }

    const numbers = parts.map((p) => {
        const n = Number(p);
        return Number.isFinite(n) ? n : null; // null represents invalid/NaN
    });

    const metrics = {
        temperature_c: numbers[0],
        humidity_pct: numbers[1],
        rainfall_mm: numbers[2],
        pressure_hpa: numbers[3],
        windspeed_ms: numbers[4],
        visibility_km: numbers[5],
    };

    return { metrics };
}

export function useWeatherData() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [metrics, setMetrics] = useState(null);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const res = await fetch('/data.txt', { cache: 'no-store' });
            if (!res.ok) {
                throw new Error(`Failed to fetch data.txt: ${res.status}`);
            }
            const text = await res.text();
            const result = parseLatestLine(text);
            if (result.error) {
                throw new Error(result.error);
            }
            setMetrics(result.metrics);
            setLastUpdated(new Date());
        } catch (e) {
            setError(e.message || 'Unknown error');
            setMetrics(null);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(false);
        const id = setInterval(() => {
            fetchData(true);
        }, 30000);
        return () => clearInterval(id);
    }, [fetchData]);

    const presentational = useMemo(() => {
        if (!metrics) return null;
        const safe = (n) => (n === null || Number.isNaN(n) ? '—' : n);
        return {
            temperature: { value: safe(metrics.temperature_c), unit: '°C' },
            humidity: { value: safe(metrics.humidity_pct), unit: '%' },
            rainfall: { value: safe(metrics.rainfall_mm), unit: 'mm' },
            pressure: { value: safe(metrics.pressure_hpa), unit: 'hPa' },
            windspeed: { value: safe(metrics.windspeed_ms), unit: 'm/s' },
            visibility: { value: safe(metrics.visibility_km), unit: 'km' },
        };
    }, [metrics]);

    return {
        loading,
        error,
        lastUpdated,
        metrics, // raw shape
        mapped: presentational, // ui-friendly values with units
        refresh: fetchData,
    };
}

// NOTE: For future historical time-series:
// Replace parseLatestLine with a parser that reads multiple lines,
// splits each by ",", validates, and accumulates an array of entries
// with timestamps. Then expose arrays for charts.


