import React, { useState } from 'react';
import MetricToggle from './MetricToggle';
import AxisSelector from './AxisSelector';
import TemplateChips from './TemplateChips';

export default function GraphBuilder({ availableFields, hasWindDir, selection, onChange }) {
    const [draft, setDraft] = useState(selection);
    const [showPreview, setShowPreview] = useState(false);
    const [isApplying, setIsApplying] = useState(false);

    const apply = () => {
        setIsApplying(true);
        onChange(draft);
        // Reset visual feedback after 2 seconds
        setTimeout(() => {
            setIsApplying(false);
        }, 2000);
    };
    const reset = () => setDraft({
        xKey: 'time',
        yKey: 'temperature_c',
        charts: { temperature: true, rainfall: true, humidity: true, pressure: false, windspeed: false, visibility: false, winddir: false },
        types: { temperature: 'line', rainfall: 'bar', humidity: 'line', pressure: 'line', windspeed: 'line', visibility: 'line' }
    });

    const setChartEnabled = (key, enabled) => {
        setDraft({ ...draft, charts: { ...draft.charts, [key]: enabled } });
        setShowPreview(true);
        // Hide preview after 3 seconds
        setTimeout(() => setShowPreview(false), 3000);
    };
    const setAxes = ({ xKey, yKey }) => setDraft({ ...draft, xKey, yKey });
    const setType = (key, type) => setDraft({ ...draft, types: { ...draft.types, [key]: type } });

    // Count selected graphs
    const selectedCount = Object.values(draft.charts).filter(Boolean).length;
    const selectedGraphs = Object.entries(draft.charts)
        .filter(([key, selected]) => selected)
        .map(([key]) => {
            const labels = {
                temperature: 'Temp Out',
                rainfall: 'Rain Rate',
                humidity: 'Humidity Out',
                pressure: 'Barometer',
                windspeed: 'Wind Speed',
                visibility: 'Visibility',
                winddir: 'Wind Direction',
                tempin: 'Temp In',
                humin: 'Humidity In',
                rainday: 'Rain Day',
                solarrad: 'Solar Radiation'
            };
            return labels[key] || key;
        });

    const onTemplate = (key) => {
        if (key === 'essentials') {
            setDraft({ xKey: 'dt', yKey: 'TempOut(C)', charts: { temperature: true, rainfall: true, humidity: true, pressure: false, windspeed: false, visibility: false, winddir: false }, types: { temperature: 'line', rainfall: 'bar', humidity: 'line', pressure: 'line', windspeed: 'line', visibility: 'line' } });
        } else if (key === 'power') {
            setDraft({ xKey: 'dt', yKey: 'BatteryVolts', charts: { temperature: false, rainfall: false, humidity: false, pressure: false, windspeed: false, visibility: false, winddir: false }, types: { temperature: 'line', rainfall: 'bar', humidity: 'line', pressure: 'line', windspeed: 'line', visibility: 'line' } });
        } else if (key === 'wind') {
            setDraft({ xKey: 'dt', yKey: 'WindSpeed(m/s)', charts: { temperature: false, rainfall: false, humidity: false, pressure: false, windspeed: true, visibility: false, winddir: true }, types: { temperature: 'line', rainfall: 'bar', humidity: 'line', pressure: 'line', windspeed: 'line', visibility: 'line' } });
        } else if (key === 'atm') {
            setDraft({ xKey: 'dt', yKey: 'Barometer(hPa)', charts: { temperature: false, rainfall: false, humidity: false, pressure: true, windspeed: false, visibility: false, winddir: false }, types: { temperature: 'line', rainfall: 'bar', humidity: 'line', pressure: 'line', windspeed: 'line', visibility: 'line' } });
        }
    };

    return (
        <div className="placeholder-section" style={{ marginTop: 12 }}>
            <style>
                {`
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                    @keyframes fadeIn {
                        0% { opacity: 0; transform: translateY(-10px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                    <TemplateChips onSelect={onTemplate} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0 }}>Select graphs</h3>
                        {selectedCount > 0 && (
                            <div style={{
                                background: '#3b82f6',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                animation: showPreview ? 'pulse 0.5s ease-in-out' : 'none'
                            }}>
                                {selectedCount} graph{selectedCount !== 1 ? 's' : ''} selected
                            </div>
                        )}
                    </div>
                    {showPreview && selectedCount > 0 && (
                        <div style={{
                            background: '#f0f9ff',
                            border: '1px solid #3b82f6',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            marginBottom: '8px',
                            fontSize: '12px',
                            color: '#1e40af',
                            animation: 'fadeIn 0.3s ease-in-out'
                        }}>
                            📊 <strong>Preview:</strong> {selectedGraphs.join(', ')} will be displayed below
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(160px, 1fr))', gap: 8 }}>
                        <MetricToggle id="temperature" label="Temp Out" checked={draft.charts.temperature} onChange={setChartEnabled} />
                        <MetricToggle id="rainfall" label="Rain Rate" checked={draft.charts.rainfall} onChange={setChartEnabled} />
                        <MetricToggle id="humidity" label="Humidity Out" checked={draft.charts.humidity} onChange={setChartEnabled} />
                        <MetricToggle id="pressure" label="Barometer" checked={draft.charts.pressure} onChange={setChartEnabled} />
                        <MetricToggle id="windspeed" label="Wind Speed" checked={draft.charts.windspeed} onChange={setChartEnabled} />
                        <MetricToggle id="visibility" label="Visibility" checked={draft.charts.visibility} onChange={setChartEnabled} />
                        <MetricToggle id="winddir" label="Wind Direction" checked={draft.charts.winddir} onChange={setChartEnabled} disabled={!hasWindDir} />
                        <MetricToggle id="tempin" label="Temp In" checked={!!draft.charts.tempin} onChange={(k, v) => setDraft({ ...draft, charts: { ...draft.charts, tempin: v } })} />
                        <MetricToggle id="humin" label="Humidity In" checked={!!draft.charts.humin} onChange={(k, v) => setDraft({ ...draft, charts: { ...draft.charts, humin: v } })} />
                        <MetricToggle id="rainday" label="Rain Day" checked={!!draft.charts.rainday} onChange={(k, v) => setDraft({ ...draft, charts: { ...draft.charts, rainday: v } })} />
                        <MetricToggle id="solarrad" label="Solar Radiation" checked={!!draft.charts.solarrad} onChange={(k, v) => setDraft({ ...draft, charts: { ...draft.charts, solarrad: v } })} />
                    </div>
                </div>
                {!hasWindDir && (
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                        Wind direction not available in this dataset. Add 'wind_dir_deg' to enable wind-rose.
                    </div>
                )}
                <div>
                    <h3 style={{ margin: '0 0 8px 0' }}>Axes</h3>
                    <AxisSelector fields={availableFields} xKey={draft.xKey} yKey={draft.yKey} onChange={setAxes} />
                </div>
                {/* Chart type section removed as requested */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Charts use archival data; cards/table use live data (30s).</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={reset} style={{ border: '1px solid var(--panel-border)', background: 'white', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}>Reset</button>
                        <button
                            onClick={apply}
                            disabled={isApplying}
                            style={{
                                border: '1px solid var(--brand-600)',
                                background: isApplying ? '#10b981' : 'var(--brand-600)',
                                color: 'white',
                                borderRadius: 8,
                                padding: '8px 12px',
                                cursor: isApplying ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                transform: isApplying ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: isApplying ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                                fontWeight: isApplying ? '600' : '400'
                            }}
                        >
                            {isApplying ? '✓ Applied!' : 'Apply'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


