import React, { useState, useEffect } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import StationSummaryCard from '../components/StationSummaryCard';
import ErrorBanner from '../components/ErrorBanner';
import { fetchLatest, handleApiError } from '../services/api';

export default function RefactoredDashboard() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const loadData = async () => {
        try {
            setError(null);
            const result = await fetchLatest();
            setData(result.data || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(handleApiError(err));
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => {
        setLoading(true);
        loadData();
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, process.env.REACT_APP_LIVE_INTERVAL_MS || 30000);
        return () => clearInterval(interval);
    }, []);

    // Group data by station
    const stationData = React.useMemo(() => {
        const stations = {};
        data.forEach(item => {
            const stationId = item.station_id;
            const stationName = item.station_name ||
                (stationId === 1 ? 'Udaipur' :
                 stationId === 2 ? 'Ahmedabad' :
                 stationId === 3 ? 'Mount Abu' : `Station ${stationId}`);

            if (!stations[stationId]) {
                stations[stationId] = {
                    name: stationName,
                    data: item
                };
            }
        });
        return stations;
    }, [data]);

    // Calculate aggregated values for the overall summary
    const aggregated = React.useMemo(() => {
        if (!data || data.length === 0) {
            return {
                temperature: { value: '—', unit: '°C' },
                humidity: { value: '—', unit: '%' },
                rainfall: { value: '—', unit: 'mm' },
                pressure: { value: '—', unit: 'hPa' },
                windspeed: { value: '—', unit: 'm/s' }
            };
        }

        const validTemps = data.filter(d => d.temperature_c !== null && !isNaN(d.temperature_c));
        const validHumidity = data.filter(d => d.humidity_pct !== null && !isNaN(d.humidity_pct));
        const validPressure = data.filter(d => d.pressure_hpa !== null && !isNaN(d.pressure_hpa));
        const validWindSpeed = data.filter(d => d.windspeed_ms !== null && !isNaN(d.windspeed_ms));
        const validRainfall = data.filter(d => d.rainfall_mm !== null && !isNaN(d.rainfall_mm));

        const avgTemp = validTemps.length > 0
            ? (validTemps.reduce((sum, d) => sum + d.temperature_c, 0) / validTemps.length).toFixed(1)
            : '—';

        const avgHumidity = validHumidity.length > 0
            ? (validHumidity.reduce((sum, d) => sum + d.humidity_pct, 0) / validHumidity.length).toFixed(1)
            : '—';

        const avgPressure = validPressure.length > 0
            ? (validPressure.reduce((sum, d) => sum + d.pressure_hpa, 0) / validPressure.length).toFixed(1)
            : '—';

        const avgWindSpeed = validWindSpeed.length > 0
            ? (validWindSpeed.reduce((sum, d) => sum + d.windspeed_ms, 0) / validWindSpeed.length).toFixed(1)
            : '—';

        const totalRainfall = validRainfall.length > 0
            ? validRainfall.reduce((sum, d) => sum + d.rainfall_mm, 0).toFixed(1)
            : '—';

        return {
            temperature: { value: avgTemp, unit: '°C' },
            humidity: { value: avgHumidity, unit: '%' },
            rainfall: { value: totalRainfall, unit: 'mm' },
            pressure: { value: avgPressure, unit: 'hPa' },
            windspeed: { value: avgWindSpeed, unit: 'm/s' }
        };
    }, [data]);

    return (
        <div className="refactored-dashboard">
            <Navbar lastUpdated={lastUpdated} />

            <main className="dashboard-main">
                {/* Header Section */}
                <div className="dashboard-header">
                    <div className="header-content">
                        <h1 className="dashboard-title">Weather Dashboard</h1>
                        <p className="dashboard-subtitle">
                            Real-time weather data from all stations • Auto-refreshes every 30 seconds
                        </p>
                        {lastUpdated && (
                            <p className="last-updated">
                                Last updated: {lastUpdated.toLocaleString()}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="refresh-button"
                    >
                        {loading ? (
                            <>
                                <FiRefreshCw className="spinning" size={18} />
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <FiRefreshCw size={18} />
                                Refresh Now
                            </>
                        )}
                    </button>
                </div>

                {/* Content */}
                {error ? (
                    <ErrorBanner message={error} />
                ) : (
                    <>
                        {/* Overall Summary */}
                        <div className="overall-summary">
                            <h2 className="section-title">Overall Summary</h2>
                            <div className="summary-grid">
                                <div className="summary-item">
                                    <div className="summary-value" style={{ color: '#fbbf24' }}>
                                        {aggregated.temperature.value}°C
                                    </div>
                                    <div className="summary-label">Average Temperature</div>
                                </div>
                                <div className="summary-item">
                                    <div className="summary-value" style={{ color: '#3b82f6' }}>
                                        {aggregated.humidity.value}%
                                    </div>
                                    <div className="summary-label">Average Humidity</div>
                                </div>
                                <div className="summary-item">
                                    <div className="summary-value" style={{ color: '#10b981' }}>
                                        {aggregated.rainfall.value}mm
                                    </div>
                                    <div className="summary-label">Total Rainfall</div>
                                </div>
                                <div className="summary-item">
                                    <div className="summary-value" style={{ color: '#8b5cf6' }}>
                                        {aggregated.windspeed.value} m/s
                                    </div>
                                    <div className="summary-label">Average Wind Speed</div>
                                </div>
                            </div>
                        </div>

                        {/* Station Summaries */}
                        <div className="station-summaries">
                            <h2 className="section-title">Station Summaries</h2>
                            {loading ? (
                                <div className="loading-grid">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="loading-card" aria-hidden="true" />
                                    ))}
                                </div>
                            ) : (
                                <div className="station-grid">
                                    {Object.values(stationData).map((station) => (
                                        <StationSummaryCard
                                            key={station.data.station_id}
                                            stationName={station.name}
                                            stationData={station.data}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            <style jsx>{`
                .refactored-dashboard {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 25%, #334155 50%, #7c3aed 75%, #a855f7 100%);
                    background-attachment: fixed;
                }

                .dashboard-main {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 24px;
                }

                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 32px;
                    gap: 24px;
                }

                .header-content {
                    flex: 1;
                }

                .dashboard-title {
                    color: white;
                    font-size: 48px;
                    font-weight: 700;
                    margin: 0 0 8px 0;
                    text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
                }

                .dashboard-subtitle {
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 18px;
                    margin: 0 0 8px 0;
                    font-weight: 400;
                }

                .last-updated {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 14px;
                    margin: 0;
                }

                .refresh-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                }

                .refresh-button:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.2);
                    border-color: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                }

                .refresh-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .overall-summary {
                    margin-bottom: 40px;
                }

                .section-title {
                    color: white;
                    font-size: 28px;
                    font-weight: 600;
                    margin: 0 0 24px 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                }

                .summary-item {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    text-align: center;
                    transition: all 0.3s ease;
                }

                .summary-item:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                    border-color: rgba(255, 255, 255, 0.3);
                }

                .summary-value {
                    font-size: 36px;
                    font-weight: 700;
                    margin-bottom: 8px;
                    line-height: 1;
                }

                .summary-label {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 14px;
                    font-weight: 500;
                }

                .station-summaries {
                    margin-bottom: 40px;
                }

                .station-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 24px;
                }

                .loading-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 24px;
                }

                .loading-card {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    height: 200px;
                    animation: pulse 2s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }

                /* Responsive Design */
                @media (max-width: 1024px) {
                    .station-grid {
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    }

                    .summary-grid {
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    }
                }

                @media (max-width: 768px) {
                    .dashboard-main {
                        padding: 16px;
                    }

                    .dashboard-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 16px;
                    }

                    .dashboard-title {
                        font-size: 36px;
                    }

                    .dashboard-subtitle {
                        font-size: 16px;
                    }

                    .station-grid {
                        grid-template-columns: 1fr;
                    }

                    .summary-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 480px) {
                    .dashboard-title {
                        font-size: 28px;
                    }

                    .summary-grid {
                        grid-template-columns: 1fr;
                    }

                    .summary-item {
                        padding: 20px;
                    }

                    .summary-value {
                        font-size: 28px;
                    }
                }
            `}</style>
        </div>
    );
}

