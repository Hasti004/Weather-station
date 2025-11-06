import React, { useMemo, useState } from 'react';
import { PolarArea } from 'react-chartjs-2';
import { COMPASS_16, binWindDirections, calculateDatasetVectorAverageWindDirection, normalizeWindDirectionToDegrees } from '../../utils/wind';

export default function WindRoseChart({ rows, weightedDefault = false }) {
    const [weighted, setWeighted] = useState(weightedDefault);
    const adapted = useMemo(() => {
        console.log('[WindRoseChart] Raw rows received:', rows?.length || 0, 'rows');
        if (rows && rows.length > 0) {
            console.log('[WindRoseChart] Sample raw row:', rows[0]);
        }
        const mapped = (rows || []).map(r => {
            const windDirDeg = normalizeWindDirectionToDegrees(r.WindDir);
            const windSpeed = typeof r['WindSpeed(m/s)'] === 'number' ? r['WindSpeed(m/s)'] : parseFloat(r['WindSpeed(m/s)']) || null;
            return {
                wind_dir_deg: windDirDeg,
                windspeed_ms: windSpeed
            };
        });
        const validWindDirs = mapped.filter(r => typeof r.wind_dir_deg === 'number' && Number.isFinite(r.wind_dir_deg));
        console.log('[WindRoseChart] Mapped data:', mapped.slice(0, 5));
        console.log('[WindRoseChart] Valid wind directions:', validWindDirs.length, 'out of', mapped.length);
        if (validWindDirs.length === 0 && mapped.length > 0) {
            console.warn('[WindRoseChart] No valid wind directions found! Sample normalized values:', mapped.slice(0, 10).map(r => r.wind_dir_deg));
        }
        return mapped;
    }, [rows]);
    const counts = useMemo(() => binWindDirections(adapted, weighted), [adapted, weighted]);

    // Calculate vector-based average wind direction
    const vectorAverage = useMemo(() =>
        calculateDatasetVectorAverageWindDirection(adapted, weighted),
        [adapted, weighted]
    );

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#475569' }}>
                    {vectorAverage !== null && (
                        <span>
                            Vector Average: {vectorAverage.toFixed(1)}°
                            ({COMPASS_16[Math.round(vectorAverage / 22.5) % 16]})
                        </span>
                    )}
                </div>
                <label style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={weighted} onChange={(e) => setWeighted(e.target.checked)} />
                    Weight by wind speed
                </label>
            </div>
            <div style={{ height: 400, padding: '20px 0' }}>
                <PolarArea data={data} options={options} />
            </div>
        </div>
    );
}


