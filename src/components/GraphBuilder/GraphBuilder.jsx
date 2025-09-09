import React, { useState } from 'react';
import MetricToggle from './MetricToggle';
import AxisSelector from './AxisSelector';
import TemplateChips from './TemplateChips';

export default function GraphBuilder({ availableFields, hasWindDir, selection, onChange }) {
    const [draft, setDraft] = useState(selection);

    const apply = () => onChange(draft);
    const reset = () => setDraft({
        xKey: 'time',
        yKey: 'temperature_c',
        charts: { temperature: true, rainfall: true, humidity: true, pressure: false, windspeed: false, visibility: false, winddir: false },
        types: { temperature: 'line', rainfall: 'bar', humidity: 'line', pressure: 'line', windspeed: 'line', visibility: 'line' }
    });

    const setChartEnabled = (key, enabled) => setDraft({ ...draft, charts: { ...draft.charts, [key]: enabled } });
    const setAxes = ({ xKey, yKey }) => setDraft({ ...draft, xKey, yKey });
    const setType = (key, type) => setDraft({ ...draft, types: { ...draft.types, [key]: type } });

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div>
                    <TemplateChips onSelect={onTemplate} />
                    <h3 style={{ margin: '0 0 8px 0' }}>Select graphs</h3>
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
                        <button onClick={apply} style={{ border: '1px solid var(--brand-600)', background: 'var(--brand-600)', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Apply</button>
                    </div>
                </div>
            </div>
        </div>
    );
}


