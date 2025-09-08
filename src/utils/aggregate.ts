import dayjs from 'dayjs';
import { formatLabel, Granularity } from './time';

export type Row = {
    dt: Date;
    temperature_c: number | null;
    humidity_pct: number | null;
    rainfall_mm: number | null;
    pressure_hpa: number | null;
    windspeed_ms: number | null;
    visibility_km: number | null;
};

export function filterRange(rows: Row[], range: { start: Date; end: Date }): Row[] {
    const start = dayjs(range.start).valueOf();
    const end = dayjs(range.end).valueOf();
    return rows.filter((r) => {
        const t = dayjs(r.dt).valueOf();
        return t >= start && t <= end;
    });
}

type BucketKey = string;

function average(values: Array<number | null>): number {
    const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function sum(values: Array<number | null>): number {
    const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    if (!nums.length) return 0;
    return nums.reduce((a, b) => a + b, 0);
}

export function groupByGranularity(rows: Row[], mode: 'daily' | 'weekly' | 'monthly' | 'raw') {
    if (mode === 'raw') {
        return rows.map((r) => ({ key: r.dt, rows: [r] }));
    }
    const buckets = new Map<BucketKey, Row[]>();
    for (const r of rows) {
        const d = dayjs(r.dt);
        let key: BucketKey;
        if (mode === 'daily') key = d.format('YYYY-MM-DD');
        else if (mode === 'weekly') {
            const week = Math.ceil(d.date() / 7);
            key = `${d.format('YYYY')}-W${String(week).padStart(2, '0')}`;
        } else key = d.format('YYYY-MM');
        const arr = buckets.get(key) || [];
        arr.push(r);
        buckets.set(key, arr);
    }
    // Convert to array with representative Date label
    return Array.from(buckets.entries()).map(([k, v]) => ({ key: k, rows: v }));
}

export function reduceMetric(rows: Row[], metric: keyof Row, reducer: 'avg' | 'sum') {
    const values = rows.map((r) => r[metric] as number | null);
    return reducer === 'sum' ? sum(values) : average(values);
}

export function buildSeries(
    rows: Row[],
    labelGranularity: Granularity,
    bucketMode: 'daily' | 'weekly' | 'monthly' | 'raw',
    metric: keyof Row,
    reducer: 'avg' | 'sum'
) {
    const buckets = groupByGranularity(rows, bucketMode).sort((a, b) =>
        dayjs(a.rows[0].dt).valueOf() - dayjs(b.rows[0].dt).valueOf()
    );
    const labels: string[] = [];
    const series: number[] = [];
    for (const b of buckets) {
        const representative = b.rows[Math.floor(b.rows.length / 2)].dt;
        labels.push(
            typeof b.key === 'string' ? (b.key as string) : formatLabel(representative, labelGranularity)
        );
        series.push(reduceMetric(b.rows, metric, reducer));
    }
    const avg = average(series);
    return { labels, series, avg };
}


