import { useCallback, useEffect, useState } from 'react';
import Papa from 'papaparse';
import { parseDT } from '../utils/time';
import { buildSeries, filterRange } from '../utils/aggregate';

function resolveArchiveUrl(id) {
    switch (id) {
        case 'ahm':
            return new URL('../data/ahm_weather_Jul-Sep2025.txt', import.meta.url);
        case 'udi':
            return new URL('../data/udi_weather_Jul-Sep2025.txt', import.meta.url);
        case 'mtabu':
            return new URL('../data/mtabu_weather_Jul-Sep2025.txt', import.meta.url);
        default:
            return null;
    }
}

export function useStationArchive(id, { range, granularity }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [charts, setCharts] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = resolveArchiveUrl(id);
            if (!url) throw new Error('Unknown station id');

            const rows = await new Promise((resolve, reject) => {
                const collected = [];
                Papa.parse(url.toString(), {
                    download: true,
                    header: true,
                    worker: true,
                    skipEmptyLines: true,
                    step: (result) => {
                        const r = result.data;
                        const dt = parseDT(r.date, r.time);
                        collected.push({
                            dt,
                            temperature_c: toNum(r.temperature_c),
                            humidity_pct: toNum(r.humidity_pct),
                            rainfall_mm: toNum(r.rainfall_mm),
                            pressure_hpa: toNum(r.pressure_hpa),
                            windspeed_ms: toNum(r.windspeed_ms),
                            visibility_km: toNum(r.visibility_km),
                        });
                    },
                    complete: () => resolve(collected),
                    error: (err) => reject(err),
                });
            });

            const inRange = range ? filterRange(rows, range) : rows;

            const temperature = buildSeries(inRange, granularityLabel(granularity), bucketMode(granularity), 'temperature_c', 'avg');
            const rainfall = buildSeries(inRange, granularityLabel(granularity), bucketMode(granularity), 'rainfall_mm', 'sum');
            const humidity = buildSeries(inRange, granularityLabel(granularity), bucketMode(granularity), 'humidity_pct', 'avg');

            setCharts({ temperature, rainfall, humidity });
        } catch (e) {
            setError(e.message || 'Archive load failed');
            setCharts(null);
        } finally {
            setLoading(false);
        }
    }, [id, range, granularity]);

    useEffect(() => {
        load();
    }, [load]);

    return { loading, error, charts };
}

function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function bucketMode(granularity) {
    if (granularity === 'daily') return 'daily';
    if (granularity === 'weekly') return 'weekly';
    if (granularity === 'monthly') return 'monthly';
    return 'raw';
}

function granularityLabel(granularity) {
    if (granularity === 'daily') return 'day';
    if (granularity === 'weekly') return 'week';
    if (granularity === 'monthly') return 'month';
    return '5min';
}


