import { useCallback, useEffect, useState } from 'react';

function resolveStationUrl(id) {
    // Use webpack's asset URL resolution to serve files under src/data at runtime
    // e.g. new URL('../data/ahm.txt', import.meta.url)
    switch (id) {
        case 'ahm':
            return new URL('../data/ahm.txt', import.meta.url);
        case 'udi':
            return new URL('../data/udi.txt', import.meta.url);
        case 'mtabu':
            return new URL('../data/mtabu.txt', import.meta.url);
        default:
            return null;
    }
}

function parseLatestNonEmptyLine(text) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
    if (!lines.length) return { error: 'No data lines found in file.' };
    const latest = lines[lines.length - 1];
    const parts = latest.split(',').map((p) => p.trim());
    if (parts.length !== 6) return { error: `Expected 6 values, found ${parts.length}.` };
    const n = parts.map((p) => {
        const v = Number(p);
        return Number.isFinite(v) ? v : null;
    });
    return {
        metrics: {
            temperature_c: n[0],
            humidity_pct: n[1],
            rainfall_mm: n[2],
            pressure_hpa: n[3],
            windspeed_ms: n[4],
            visibility_km: n[5],
        },
    };
}

export function useStationData(id) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metrics, setMetrics] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = resolveStationUrl(id);
            if (!url) throw new Error('Unknown station id');
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
            const text = await res.text();
            const result = parseLatestNonEmptyLine(text);
            if (result.error) throw new Error(result.error);
            setMetrics(result.metrics);
        } catch (e) {
            setError(e.message || 'Unknown error');
            setMetrics(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { loading, error, metrics, refresh: fetchData };
}


