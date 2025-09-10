import { useCallback, useEffect, useMemo, useState } from 'react';

function resolveUrl(id) {
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

function parseLatestLine(text) {
    const last = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .pop();
    if (!last) return { error: 'No live data found' };
    const parts = last.split(',').map((p) => p.trim());
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

export function useStationLive(id) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [metrics, setMetrics] = useState(null);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const url = resolveUrl(id);
            if (!url) throw new Error('Unknown station id');
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
            const text = await res.text();
            const parsed = parseLatestLine(text);
            if (parsed.error) throw new Error(parsed.error);
            setMetrics(parsed.metrics);
            setLastUpdated(new Date());
        } catch (e) {
            setError(e.message || 'Unknown error');
            setMetrics(null);
        } finally {
            if (!silent) setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData(false);
        const idt = setInterval(() => fetchData(true), 30000);
        return () => clearInterval(idt);
    }, [fetchData]);

    const tableData = useMemo(() => {
        if (!metrics) return null;
        return [
            { label: 'Temperature', value: metrics.temperature_c, unit: '°C' },
            { label: 'Humidity', value: metrics.humidity_pct, unit: '%' },
            { label: 'Rainfall', value: metrics.rainfall_mm, unit: 'mm' },
            { label: 'Pressure', value: metrics.pressure_hpa, unit: 'hPa' },
            { label: 'Wind Speed', value: metrics.windspeed_ms, unit: 'm/s' },
            { label: 'Visibility', value: metrics.visibility_km, unit: 'km' },
        ];
    }, [metrics]);

    return { loading, error, lastUpdated, metrics, tableData, refresh: fetchData };
}

export function useStationTableData(id) {
    const { tableData, lastUpdated, loading, error, refresh } = useStationLive(id);
    return { tableData, lastUpdated, loading, error, refresh };
}


