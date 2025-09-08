import dayjs from 'dayjs';
import { formatLabel } from './time';

export function filterRange(rows, range) {
    const start = dayjs(range.start).valueOf();
    const end = dayjs(range.end).valueOf();
    return rows.filter((r) => {
        const t = dayjs(r.dt).valueOf();
        return t >= start && t <= end;
    });
}

function average(values) {
    const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(values) {
    const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0);
}

export function groupByGranularity(rows, mode) {
    if (mode === 'raw') {
        return rows.map((r) => ({ key: r.dt, rows: [r] }));
    }
    const buckets = new Map();
    for (const r of rows) {
        const d = dayjs(r.dt);
        let key;
        if (mode === 'daily') key = d.format('YYYY-MM-DD');
        else if (mode === 'weekly') {
            const week = Math.ceil(d.date() / 7);
            key = `${d.format('YYYY')}-W${String(week).padStart(2, '0')}`;
        } else key = d.format('YYYY-MM');
        const arr = buckets.get(key) || [];
        arr.push(r);
        buckets.set(key, arr);
    }
    return Array.from(buckets.entries()).map(([k, v]) => ({ key: k, rows: v }));
}

export function reduceMetric(rows, metric, reducer) {
    const values = rows.map((r) => r[metric]);
    return reducer === 'sum' ? sum(values) : average(values);
}

export function buildSeries(rows, labelGranularity, bucketMode, metric, reducer) {
    const buckets = groupByGranularity(rows, bucketMode).sort((a, b) => dayjs(a.rows[0].dt).valueOf() - dayjs(b.rows[0].dt).valueOf());
    const labels = [];
    const series = [];
    for (const b of buckets) {
        const representative = b.rows[Math.floor(b.rows.length / 2)].dt;
        labels.push(typeof b.key === 'string' ? b.key : formatLabel(representative, labelGranularity));
        series.push(reduceMetric(b.rows, metric, reducer));
    }
    const avg = average(series);
    return { labels, series, avg };
}


