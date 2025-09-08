import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import ErrorBanner from '../components/ErrorBanner';
import { useStationLive } from '../hooks/useStationLive';
import { useStationArchive } from '../hooks/useStationArchive';
import TimeFilterToolbar from '../components/TimeFilterToolbar';
import ChartPanel from '../components/ChartPanel';
import TemperatureChart from '../components/TemperatureChart';
import RainfallChart from '../components/RainfallChart';
import HumidityChart from '../components/HumidityChart';
import AvailabilityButton from '../components/availability/AvailabilityButton';
import AvailabilityModal from '../components/availability/AvailabilityModal';
import { FiThermometer, FiDroplet, FiCloudRain, FiTrendingDown, FiWind, FiEye } from 'react-icons/fi';

const STATION_NAMES = {
    ahm: 'Ahmedabad',
    udi: 'Udaipur',
    mtabu: 'Mt Abu',
};

export default function StationPage() {
    const { id } = useParams();
    const live = useStationLive(id);
    const [filter, setFilter] = useState({ mode: 'monthly', start: null, end: null, granularity: 'daily' });
    const [showAvail, setShowAvail] = useState(false);

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

    const archive = useStationArchive(id, { range: resolvedRange, granularity: filter.granularity });

    const mapped = live.metrics
        ? {
            temperature: { value: live.metrics.temperature_c ?? '—', unit: '°C' },
            humidity: { value: live.metrics.humidity_pct ?? '—', unit: '%' },
            rainfall: { value: live.metrics.rainfall_mm ?? '—', unit: 'mm' },
            pressure: { value: live.metrics.pressure_hpa ?? '—', unit: 'hPa' },
            windspeed: { value: live.metrics.windspeed_ms ?? '—', unit: 'm/s' },
            visibility: { value: live.metrics.visibility_km ?? '—', unit: 'km' },
        }
        : null;

    return (
        <div>
            <Navbar lastUpdated={live.lastUpdated} />
            <main className="container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {STATION_NAMES[id] || 'Station'}
                        <AvailabilityButton onOpen={() => setShowAvail(true)} />
                    </h2>
                    <Link to="/" style={{ color: 'var(--brand-600)', textDecoration: 'none' }}>&larr; All Stations</Link>
                </div>
                <TimeFilterToolbar value={filter} onChange={setFilter} />
                {live.error ? (
                    <ErrorBanner message={live.error} />
                ) : live.loading ? (
                    <div className="grid">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton" />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid">
                            <StatCard icon={FiThermometer} label="Temperature" value={mapped.temperature.value} unit={mapped.temperature.unit} />
                            <StatCard icon={FiDroplet} label="Relative Humidity" value={mapped.humidity.value} unit={mapped.humidity.unit} />
                            <StatCard icon={FiCloudRain} label="Rainfall" value={mapped.rainfall.value} unit={mapped.rainfall.unit} />
                            <StatCard icon={FiTrendingDown} label="Pressure" value={mapped.pressure.value} unit={mapped.pressure.unit} />
                            <StatCard icon={FiWind} label="Wind Speed" value={mapped.windspeed.value} unit={mapped.windspeed.unit} />
                            <StatCard icon={FiEye} label="Visibility" value={mapped.visibility.value} unit={mapped.visibility.unit} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                <tbody>
                                    {[
                                        ['Temperature', `${live.metrics.temperature_c} °C`],
                                        ['Humidity', `${live.metrics.humidity_pct} %`],
                                        ['Rainfall', `${live.metrics.rainfall_mm} mm`],
                                        ['Pressure', `${live.metrics.pressure_hpa} hPa`],
                                        ['Wind Speed', `${live.metrics.windspeed_ms} m/s`],
                                        ['Visibility', `${live.metrics.visibility_km} km`],
                                    ].map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ padding: '8px 8px', color: '#334155' }}>{row[0]}</td>
                                            <td style={{ padding: '8px 8px', fontWeight: 600 }}>{row[1]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>Last updated: {live.lastUpdated ? new Date(live.lastUpdated).toLocaleString() : '—'}</div>
                        </div>
                        {archive.error ? (
                            <ErrorBanner message={archive.error} />
                        ) : archive.loading || !archive.charts ? (
                            <div className="skeleton" style={{ height: 220, marginTop: 16 }} />
                        ) : (
                            <>
                                <ChartPanel title="Temperature" avgLabel="Avg" avgValue={archive.charts.temperature.avg}>
                                    <TemperatureChart data={archive.charts.temperature} unit="°C" />
                                </ChartPanel>
                                <ChartPanel title="Rainfall" avgLabel="Avg" avgValue={archive.charts.rainfall.avg}>
                                    <RainfallChart data={archive.charts.rainfall} unit="mm" />
                                </ChartPanel>
                                <ChartPanel title="Humidity" avgLabel="Avg" avgValue={archive.charts.humidity.avg}>
                                    <HumidityChart data={archive.charts.humidity} unit="%" />
                                </ChartPanel>
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


