import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import dayjs from 'dayjs';

const cache = new Map();

function urlFor(id) {
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

export function useArchiveAvailability(id) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                if (cache.has(id)) {
                    setData(cache.get(id));
                    return;
                }
                const url = urlFor(id);
                if (!url) throw new Error('Unknown station id');
                const available = new Set();
                let min = null;
                let max = null;

                await new Promise((resolve, reject) => {
                    Papa.parse(url.toString(), {
                        download: true,
                        header: true,
                        worker: true,
                        skipEmptyLines: true,
                        step: (res) => {
                            const r = res.data;
                            const d = r.date;
                            if (!d) return;
                            const key = dayjs(d).format('YYYY-MM-DD');
                            available.add(key);
                            const dt = dayjs(d).toDate();
                            if (!min || dt < min) min = dt;
                            if (!max || dt > max) max = dt;
                        },
                        complete: () => resolve(),
                        error: (err) => reject(err),
                    });
                });

                const payload = { availableDates: available, minDate: min, maxDate: max };
                cache.set(id, payload);
                if (!cancelled) setData(payload);
            } catch (e) {
                if (!cancelled) setError(e.message || 'Failed to load availability');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    return useMemo(() => ({
        loading,
        error,
        availableDates: data?.availableDates || new Set(),
        minDate: data?.minDate || null,
        maxDate: data?.maxDate || null,
    }), [loading, error, data]);
}


