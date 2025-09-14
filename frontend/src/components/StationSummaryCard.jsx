import React from 'react';
import { FiThermometer, FiDroplet, FiCloudRain, FiWind } from 'react-icons/fi';

export default function StationSummaryCard({ stationName, stationData }) {
    const formatValue = (value) => {
        if (value === null || value === undefined || isNaN(value)) return '—';
        return typeof value === 'number' ? value.toFixed(1) : value;
    };

    const metrics = [
        {
            icon: FiThermometer,
            label: 'Temperature',
            value: formatValue(stationData?.temperature_c),
            unit: '°C',
            color: '#fbbf24' // warm orange/yellow
        },
        {
            icon: FiDroplet,
            label: 'Humidity',
            value: formatValue(stationData?.humidity_pct),
            unit: '%',
            color: '#3b82f6' // blue
        },
        {
            icon: FiCloudRain,
            label: 'Rainfall',
            value: formatValue(stationData?.rainfall_mm),
            unit: 'mm',
            color: '#10b981' // green
        },
        {
            icon: FiWind,
            label: 'Wind Speed',
            value: formatValue(stationData?.windspeed_ms),
            unit: 'm/s',
            color: '#8b5cf6' // violet/purple
        }
    ];

    return (
        <div className="station-summary-card">
            <div className="station-header">
                <h3 className="station-name">{stationName}</h3>
            </div>

            <div className="metrics-grid">
                {metrics.map((metric, index) => (
                    <div key={index} className="metric-item">
                        <div className="metric-icon" style={{ color: metric.color }}>
                            <metric.icon size={20} />
                        </div>
                        <div className="metric-content">
                            <div className="metric-value" style={{ color: metric.color }}>
                                {metric.value}
                                <span className="metric-unit">{metric.unit}</span>
                            </div>
                            <div className="metric-label">{metric.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .station-summary-card {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }

                .station-summary-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                    border-color: rgba(255, 255, 255, 0.3);
                }

                .station-header {
                    margin-bottom: 20px;
                }

                .station-name {
                    color: white;
                    font-size: 20px;
                    font-weight: 600;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .metrics-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    flex: 1;
                }

                .metric-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.2s ease;
                }

                .metric-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .metric-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1);
                }

                .metric-content {
                    flex: 1;
                    min-width: 0;
                }

                .metric-value {
                    font-size: 18px;
                    font-weight: 700;
                    line-height: 1.2;
                    margin-bottom: 2px;
                }

                .metric-unit {
                    font-size: 14px;
                    opacity: 0.8;
                    margin-left: 2px;
                }

                .metric-label {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 500;
                }

                @media (max-width: 768px) {
                    .metrics-grid {
                        grid-template-columns: 1fr;
                        gap: 12px;
                    }

                    .station-summary-card {
                        padding: 20px;
                    }
                }

                @media (max-width: 480px) {
                    .station-summary-card {
                        padding: 16px;
                    }

                    .metric-item {
                        padding: 10px;
                        gap: 10px;
                    }

                    .metric-icon {
                        width: 36px;
                        height: 36px;
                    }

                    .metric-value {
                        font-size: 16px;
                    }
                }
            `}</style>
        </div>
    );
}

