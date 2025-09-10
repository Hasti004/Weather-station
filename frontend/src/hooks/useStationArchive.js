import { useCallback, useEffect, useState } from 'react';
import Papa from 'papaparse';
import { buildSeries, filterRange } from '../utils/aggregate';

function resolveArchiveUrl(id) {
    switch (id) {
        case 'ahm':
            return new URL('../data/ahm_weather_6months.txt', import.meta.url);
        case 'udi':
            return new URL('../data/udi_weather_6months.txt', import.meta.url);
        case 'mtabu':
            return new URL('../data/mtabu_weather_6months.txt', import.meta.url);
        default:
            return null;
    }
}

export function useStationArchive(id, { range, granularity }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [charts, setCharts] = useState(null);
    const [rows, setRows] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = resolveArchiveUrl(id);
            if (!url) throw new Error('Unknown station id');

            const allRows = await new Promise((resolve, reject) => {
                const collected = [];
                Papa.parse(url.toString(), {
                    download: true,
                    header: true,
                    worker: true,
                    skipEmptyLines: true,
                    step: (result) => {
                        const r = result.data;
                        // Build dt from Timestamp (ISO-like string in local tz expected)
                        const dt = new Date(r.Timestamp);
                        collected.push({
                            dt,
                            // keep original keys for Graph Builder selection semantics
                            'Barometer(hPa)': toNum(r['Barometer(hPa)']),
                            BatteryStatus: r.BatteryStatus,
                            BatteryVolts: toNum(r.BatteryVolts),
                            HumIn: toNum(r.HumIn),
                            HumOut: toNum(r.HumOut),
                            'RainDay(mm)': toNum(r['RainDay(mm)']),
                            'RainRate(mm/hr)': toNum(r['RainRate(mm/hr)']),
                            SolarRad: toNum(r.SolarRad),
                            SunRise: r.SunRise,
                            SunSet: r.SunSet,
                            'TempIn(C)': toNum(r['TempIn(C)']),
                            'TempOut(C)': toNum(r['TempOut(C)']),
                            WindDir: toNum(r.WindDir),
                            'WindSpeed(m/s)': toNum(r['WindSpeed(m/s)']),
                        });
                    },
                    complete: () => resolve(collected),
                    error: (err) => reject(err),
                });
            });

            const inRange = range ? filterRange(allRows, range) : allRows;
            setRows(inRange);

            const temperature = buildSeries(inRange.map(r => ({ dt: r.dt, temperature_c: r['TempOut(C)'] })), granularityLabel(granularity), bucketMode(granularity), 'temperature_c', 'avg');
            const rainfall = buildSeries(inRange.map(r => ({ dt: r.dt, rainfall_mm: r['RainRate(mm/hr)'] })), granularityLabel(granularity), bucketMode(granularity), 'rainfall_mm', 'sum');
            const humidity = buildSeries(inRange.map(r => ({ dt: r.dt, humidity_pct: r.HumOut })), granularityLabel(granularity), bucketMode(granularity), 'humidity_pct', 'avg');

            setCharts({ temperature, rainfall, humidity });
        } catch (e) {
            setError(e.message || 'Archive load failed');
            setCharts(null);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [id, range, granularity]);

    useEffect(() => {
        load();
    }, [load]);

    return { loading, error, charts, rows };
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


