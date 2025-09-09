import React, { useMemo, useState } from 'react';
import { PolarArea } from 'react-chartjs-2';
import { COMPASS_16, binWindDirections } from '../../utils/wind';

export default function WindRoseChart({ rows, weightedDefault = false }) {
    const [weighted, setWeighted] = useState(weightedDefault);
    const adapted = useMemo(() => (rows || []).map(r => ({ wind_dir_deg: r.WindDir, windspeed_ms: r['WindSpeed(m/s)'] })), [rows]);
    const counts = useMemo(() => binWindDirections(adapted, weighted), [adapted, weighted]);

    const hasDir = adapted?.some(r => typeof r.wind_dir_deg === 'number' && Number.isFinite(r.wind_dir_deg));
    if (!hasDir) {
        return (
            <div style={{ padding: 12, color: '#64748B' }}>
                Wind direction not available in this dataset. Add 'wind_dir_deg' to enable wind-rose.
            </div>
        );
    }

    const palette = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf', '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948'];
    const data = {
        labels: COMPASS_16,
        datasets: [{
            label: weighted ? 'Weighted by wind speed' : 'Counts',
            data: counts,
            backgroundColor: COMPASS_16.map((_, i) => palette[i % palette.length] + '55'),
            borderColor: COMPASS_16.map((_, i) => palette[i % palette.length]),
            borderWidth: 1,
        }]
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { ticks: { color: 'var(--axis)' }, grid: { color: 'var(--grid)' }, pointLabels: { display: true, centerPointLabels: true, color: 'var(--ink-700)' } } },
        plugins: { legend: { display: false } }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={weighted} onChange={(e) => setWeighted(e.target.checked)} />
                    Weight by wind speed
                </label>
            </div>
            <div style={{ height: 340 }}>
                <PolarArea data={data} options={options} />
            </div>
        </div>
    );
}


