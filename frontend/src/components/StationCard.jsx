import React from 'react';
import { Link } from 'react-router-dom';
import { getWeatherIcon } from '../icons/weather';

export function StationCard({ id, name, tempC, condition, area, image, Icon, metrics }) {
  const WeatherIcon = Icon || getWeatherIcon(condition);

  return (
    <Link to={`/station/${id}`} className="station-card" aria-label={`View ${name} station`}>
      <div className="avatar" aria-hidden="true">
        {image ? (
          <img src={image} alt={`${name} location`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
        ) : (
          <WeatherIcon />
        )}
      </div>
      <div className="temp">{tempC}°C</div>
      <div className="name">{name}</div>
      <div className="meta">{condition}</div>

      {/* Weather Metrics */}
      {metrics && (
        <div className="weather-metrics">
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">Humidity</span>
              <span className="metric-value">{metrics.humidity_pct ?? '—'}%</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Rainfall</span>
              <span className="metric-value">{metrics.rainfall_mm ?? '—'}mm</span>
            </div>
          </div>
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">Pressure</span>
              <span className="metric-value">{metrics.pressure_hpa ?? '—'}hPa</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Wind</span>
              <span className="metric-value">{metrics.windspeed_ms ?? '—'}m/s</span>
            </div>
          </div>
        </div>
      )}

      <div className="loc">
        <span aria-hidden="true">📍</span>
        <span>{area}</span>
      </div>
    </Link>
  );
}
