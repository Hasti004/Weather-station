import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMapPin, FiThermometer, FiDroplet, FiCloudRain, FiTrendingDown, FiWind, FiEye } from 'react-icons/fi';

function Metric({ icon: Icon, label, value, unit }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} aria-label={`metric-${label}`}>
            <span style={{ color: 'var(--brand-700)' }}>{Icon ? <Icon size={14} aria-hidden="true" /> : null}</span>
            <span style={{ fontSize: 12, color: '#334155' }}>{label}:</span>
            <span style={{ fontWeight: 600 }}>{value}</span>
            <span style={{ color: '#64748B' }}>{unit}</span>
        </div>
    );
}

export default function StationCard({ id, name, metrics }) {
    const navigate = useNavigate();
    const mapped = metrics
        ? {
            temperature: { value: metrics.temperature_c ?? '—', unit: '°C' },
            humidity: { value: metrics.humidity_pct ?? '—', unit: '%' },
            rainfall: { value: metrics.rainfall_mm ?? '—', unit: 'mm' },
            pressure: { value: metrics.pressure_hpa ?? '—', unit: 'hPa' },
            windspeed: { value: metrics.windspeed_ms ?? '—', unit: 'm/s' },
            visibility: { value: metrics.visibility_km ?? '—', unit: 'km' },
        }
        : null;

    return (
        <button
            className="card"
            onClick={() => navigate(`/station/${id}`)}
            style={{ textAlign: 'left', width: '100%', cursor: 'pointer', border: '1px solid transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 12px 28px rgba(37, 99, 235, 0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)')}
            aria-label={`${name} station card`}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <FiMapPin size={16} color="var(--brand-600)" aria-hidden="true" />
                <strong>{name}</strong>
            </div>
            {mapped ? (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <Metric icon={FiThermometer} label="Temperature" value={mapped.temperature.value} unit={mapped.temperature.unit} />
                    <Metric icon={FiDroplet} label="Humidity" value={mapped.humidity.value} unit={mapped.humidity.unit} />
                    <Metric icon={FiCloudRain} label="Rainfall" value={mapped.rainfall.value} unit={mapped.rainfall.unit} />
                    <Metric icon={FiTrendingDown} label="Pressure" value={mapped.pressure.value} unit={mapped.pressure.unit} />
                    <Metric icon={FiWind} label="Wind" value={mapped.windspeed.value} unit={mapped.windspeed.unit} />
                    <Metric icon={FiEye} label="Visibility" value={mapped.visibility.value} unit={mapped.visibility.unit} />
                </div>
            ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="skeleton" style={{ height: 32 }} aria-hidden="true" />
                    ))}
                </div>
            )}
        </button>
    );
}


