import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import ErrorBanner from '../components/ErrorBanner';
import { fetchLatest, fetchRange, handleApiError } from '../services/api';
import { useObservatories } from '../hooks/useObservatories';
import TimeFilterToolbar from '../components/TimeFilterToolbar';
import ChartPanel from '../components/ChartPanel';
import TemperatureChart from '../components/TemperatureChart';
import RainfallChart from '../components/RainfallChart';
import HumidityChart from '../components/HumidityChart';
import PressureChart from '../components/charts/PressureChart';
import WindSpeedChart from '../components/charts/WindSpeedChart';
import VisibilityChart from '../components/charts/VisibilityChart';
import WindRoseChart from '../components/charts/WindRoseChart';
import GraphBuilder from '../components/GraphBuilder/GraphBuilder';
import { FIELD_META, DEFAULT_X } from '../utils/fields';
import { buildSeries } from '../utils/aggregate';
import AvailabilityButton from '../components/availability/AvailabilityButton';
import AvailabilityModal from '../components/availability/AvailabilityModal';
import { FiThermometer, FiDroplet, FiCloudRain, FiTrendingDown, FiWind, FiEye } from 'react-icons/fi';

// Station names will be fetched from observatories API

// Map station IDs to numeric IDs for API
const STATION_ID_MAP = {
    ahm: 2,
    udi: 1,
    mtabu: 3,
};

export default function StationPage() {
    const { id } = useParams();
    const [liveData, setLiveData] = useState(null);
    const [archiveData, setArchiveData] = useState(null);
    const [liveLoading, setLiveLoading] = useState(true);
    const [archiveLoading, setArchiveLoading] = useState(false);
    const [liveError, setLiveError] = useState(null);
    const [archiveError, setArchiveError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [filter, setFilter] = useState({ mode: 'monthly', start: null, end: null, granularity: 'daily' });
    const [showAvail, setShowAvail] = useState(false);
    const { getStationName, getStationLocation } = useObservatories();

    const resolvedRange = useMemo(() => {
        const now = new Date();
        if (filter.mode === 'daily') {
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return { start, end: now };
        }
        if (filter.mode === 'weekly') {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            return { start, end: now };
        }
        if (filter.mode === 'monthly') {
            const start = new Date(now);
            start.setMonth(start.getMonth() - 1);
            return { start, end: now };
        }
        if (filter.start && filter.end) return { start: filter.start, end: filter.end };
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { start, end: now };
    }, [filter]);

    // Load live data
    const loadLiveData = async () => {
        try {
            setLiveError(null);
            const result = await fetchLatest();
            const stationData = result.data?.find(d => d.station_id === STATION_ID_MAP[id]);
            setLiveData(stationData);
            setLastUpdated(new Date());
        } catch (err) {
            setLiveError(handleApiError(err));
        } finally {
            setLiveLoading(false);
        }
    };

    // Load archive data
    const loadArchiveData = async () => {
        try {
            setArchiveError(null);
            setArchiveLoading(true);
            const stationId = STATION_ID_MAP[id];
            const start = resolvedRange.start.toISOString();
            const end = resolvedRange.end.toISOString();
            const result = await fetchRange(stationId, start, end);
            setArchiveData(result.data || []);
        } catch (err) {
            setArchiveError(handleApiError(err));
        } finally {
            setArchiveLoading(false);
        }
    };

    // Load live data on mount and set up refresh interval
    useEffect(() => {
        loadLiveData();
        const interval = setInterval(loadLiveData, Number(process.env.REACT_APP_LIVE_INTERVAL_MS || 30000));
        return () => clearInterval(interval);
    }, [id]);

    // Load archive data when range changes
    useEffect(() => {
        if (resolvedRange.start && resolvedRange.end) {
            loadArchiveData();
        }
    }, [id, resolvedRange]);
    const [graphSel, setGraphSel] = useState({
        xKey: DEFAULT_X,
        yKey: 'TempOut(C)',
        charts: { temperature: true, rainfall: true, humidity: true, pressure: false, windspeed: false, visibility: false, winddir: true },
        types: { temperature: 'line', rainfall: 'bar', humidity: 'line', pressure: 'line', windspeed: 'line', visibility: 'line' }
    });

    const mapped = liveData
        ? {
            temperature: { value: liveData.temperature_c ?? '—', unit: '°C' },
            humidity: { value: liveData.humidity_pct ?? '—', unit: '%' },
            rainfall: { value: liveData.rainfall_mm ?? '—', unit: 'mm' },
            pressure: { value: liveData.pressure_hpa ?? '—', unit: 'hPa' },
            windspeed: { value: liveData.windspeed_ms ?? '—', unit: 'm/s' },
            visibility: { value: '—', unit: 'km' }, // Not available in current API response
        }
        : null;

    return (
        <div>
            <Navbar lastUpdated={lastUpdated} />
            <main className="container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {getStationName(STATION_ID_MAP[id]) || 'Station'}
                        <AvailabilityButton onOpen={() => setShowAvail(true)} />
                    </h2>
                    <Link to="/" style={{ color: 'var(--brand-600)', textDecoration: 'none' }}>&larr; All Stations</Link>
                </div>
                {liveError ? (
                    <ErrorBanner message={liveError} />
                ) : liveLoading ? (
                    <div className="grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid">
                            <StatCard icon={FiThermometer} label="Temperature" value={mapped?.temperature.value || '—'} unit={mapped?.temperature.unit || '°C'} />
                            <StatCard icon={FiDroplet} label="Relative Humidity" value={mapped?.humidity.value || '—'} unit={mapped?.humidity.unit || '%'} />
                            <StatCard icon={FiCloudRain} label="Rainfall" value={mapped?.rainfall.value || '—'} unit={mapped?.rainfall.unit || 'mm'} />
                            <StatCard icon={FiTrendingDown} label="Pressure" value={mapped?.pressure.value || '—'} unit={mapped?.pressure.unit || 'hPa'} />
                            <StatCard icon={FiWind} label="Wind Speed" value={mapped?.windspeed.value || '—'} unit={mapped?.windspeed.unit || 'm/s'} />
                            <StatCard icon={FiEye} label="Visibility" value={mapped?.visibility.value || '—'} unit={mapped?.visibility.unit || 'km'} />
                        </div>
                        {liveData && (
                        <div style={{ marginTop: 12 }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <tbody>
                                    {[
                                            ['Temperature', `${liveData.temperature_c ?? '—'} °C`],
                                            ['Humidity', `${liveData.humidity_pct ?? '—'} %`],
                                            ['Rainfall', `${liveData.rainfall_mm ?? '—'} mm`],
                                            ['Pressure', `${liveData.pressure_hpa ?? '—'} hPa`],
                                            ['Wind Speed', `${liveData.windspeed_ms ?? '—'} m/s`],
                                            ['Wind Direction', `${liveData.wind_dir ?? '—'}`],
                                    ].map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ padding: '8px 8px', color: '#334155' }}>{row[0]}</td>
                                            <td style={{ padding: '8px 8px', fontWeight: 600 }}>{row[1]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                                <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '—'}</div>
                        </div>
                        )}
                        <div style={{ marginTop: 12 }}>
                            <GraphBuilder availableFields={FIELD_META} hasWindDir={Array.isArray(archiveData) && archiveData.some(r => Number.isFinite(r.wind_dir))} selection={graphSel} onChange={setGraphSel} />
                        </div>
                        {archiveError ? (
                            <ErrorBanner message={archiveError} />
                        ) : archiveLoading || !archiveData ? (
                            <div className="skeleton" style={{ height: 220, marginTop: 16 }} />
                        ) : (
                            <>
                                <div style={{ marginTop: 12, marginBottom: 8 }}>
                                    <TimeFilterToolbar value={filter} onChange={setFilter} />
                                </div>
                                {graphSel.charts.temperature && (
                                    <ChartPanel title="Temperature" avgLabel="Avg" avgValue={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), temperature_c: r.temperature_c })), 'day', 'daily', 'temperature_c', 'avg').avg}>
                                        <TemperatureChart data={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), temperature_c: r.temperature_c })), 'day', 'daily', 'temperature_c', 'avg')} unit="°C" />
                                    </ChartPanel>
                                )}
                                {graphSel.charts.rainfall && (
                                    <ChartPanel title="Rainfall" avgLabel="Avg" avgValue={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), rainfall_mm: r.rainfall_mm })), 'day', 'daily', 'rainfall_mm', 'sum').avg}>
                                        <RainfallChart data={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), rainfall_mm: r.rainfall_mm })), 'day', 'daily', 'rainfall_mm', 'sum')} unit="mm" />
                                    </ChartPanel>
                                )}
                                {graphSel.charts.humidity && (
                                    <ChartPanel title="Humidity" avgLabel="Avg" avgValue={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), humidity_pct: r.humidity_pct })), 'day', 'daily', 'humidity_pct', 'avg').avg}>
                                        <HumidityChart data={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), humidity_pct: r.humidity_pct })), 'day', 'daily', 'humidity_pct', 'avg')} unit="%" />
                                    </ChartPanel>
                                )}
                                {graphSel.charts.pressure && (
                                    <ChartPanel title="Pressure" avgLabel="Avg" avgValue={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), pressure_hpa: r.pressure_hpa })), 'day', 'daily', 'pressure_hpa', 'avg').avg}>
                                        <PressureChart data={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), pressure_hpa: r.pressure_hpa })), 'day', 'daily', 'pressure_hpa', 'avg')} unit="hPa" />
                                    </ChartPanel>
                                )}
                                {graphSel.charts.windspeed && (
                                    <ChartPanel title="Wind Speed" avgLabel="Avg" avgValue={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), windspeed_ms: r.windspeed_ms })), 'day', 'daily', 'windspeed_ms', 'avg').avg}>
                                        <WindSpeedChart data={buildSeries((archiveData || []).map(r => ({ dt: new Date(r.reading_ts), windspeed_ms: r.windspeed_ms })), 'day', 'daily', 'windspeed_ms', 'avg')} unit="m/s" />
                                    </ChartPanel>
                                )}
                                {graphSel.charts.winddir && (Array.isArray(archiveData) && archiveData.some(r => Number.isFinite(r.wind_dir))) && (
                                    <ChartPanel title="Wind Rose">
                                        <WindRoseChart rows={archiveData.map(r => ({ WindDir: r.wind_dir, WindSpeed: r.windspeed_ms }))} />
                                    </ChartPanel>
                                )}
                            </>
                        )}
                    </>
                )}
            </main>
            {showAvail && (
                <AvailabilityModal id={id} isOpen={showAvail} onClose={() => setShowAvail(false)} onApplyRange={(start, end) => {
                    // Apply to charts only
                    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                    setFilter({ mode: 'custom', start, end, granularity: days >= 2 ? 'daily' : 'raw' });
                }} />
            )}
        </div>
    );
}


