import React from 'react';
import { Link } from 'react-router-dom';
import AvailabilityButton from './availability/AvailabilityButton';
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

export default function StationCard({ id, name, metrics, imageSrc, onOpenAvailability }) {
    const [imageError, setImageError] = React.useState(false);

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
        <Link to={`/station/${id}`} className="card station-card" aria-label={`View ${name} station`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', border: '1px solid var(--panel-border)' }}>
            <div className="card-banner">
                {imageSrc && !imageError ? (
                    <img
                        src={imageSrc}
                        alt={`${name} skyline`}
                        onError={() => setImageError(true)}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '24px',
                        fontWeight: 'bold'
                    }}>
                        {name.charAt(0)}
                    </div>
                )}
                <div className="overlay">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <FiMapPin size={16} />
                        <span>{name}</span>
                    </span>
                </div>
                <div style={{ position: 'absolute', right: 10, top: 10 }}>
                    <AvailabilityButton onOpen={(e) => { e.preventDefault?.(); onOpenAvailability?.(id); }} />
                </div>
            </div>
            <div style={{ paddingTop: 10 }}>
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
            </div>
        </Link>
    );
}


