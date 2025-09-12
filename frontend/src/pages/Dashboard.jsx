import React, { useState, useEffect } from 'react';
import { FiThermometer, FiDroplet, FiCloudRain, FiTrendingDown, FiWind, FiEye } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import ErrorBanner from '../components/ErrorBanner';
import PlaceholderCharts from '../components/PlaceholderCharts';
import { fetchLatest, handleApiError } from '../services/api';

export default function Dashboard() {
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

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, process.env.REACT_APP_LIVE_INTERVAL_MS || 30000);
        return () => clearInterval(interval);
    }, []);

    // Calculate aggregated values from all stations
    const aggregated = React.useMemo(() => {
        if (!data || data.length === 0) {
            return {
                temperature: { value: '—', unit: '°C' },
                humidity: { value: '—', unit: '%' },
                rainfall: { value: '—', unit: 'mm' },
                pressure: { value: '—', unit: 'hPa' },
                windspeed: { value: '—', unit: 'm/s' },
                visibility: { value: '—', unit: 'km' }
            };
        }

        // Calculate averages for numeric values
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
            windspeed: { value: avgWindSpeed, unit: 'm/s' },
            visibility: { value: '—', unit: 'km' } // Not available in current data structure
        };
    }, [data]);

    return (
        <div>
            <Navbar lastUpdated={lastUpdated} />
            <main className="container">
                {error ? (
                    <ErrorBanner message={error} />
                ) : (
                    <>
                        {loading ? (
                            <div className="grid" aria-label="loading-cards">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="skeleton" aria-hidden="true" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid" aria-label="stats-grid">
                                <StatCard icon={FiThermometer} label="Temperature" value={aggregated.temperature.value} unit={aggregated.temperature.unit} />
                                <StatCard icon={FiDroplet} label="Relative Humidity" value={aggregated.humidity.value} unit={aggregated.humidity.unit} />
                                <StatCard icon={FiCloudRain} label="Rainfall" value={aggregated.rainfall.value} unit={aggregated.rainfall.unit} />
                                <StatCard icon={FiTrendingDown} label="Pressure" value={aggregated.pressure.value} unit={aggregated.pressure.unit} />
                                <StatCard icon={FiWind} label="Wind Speed" value={aggregated.windspeed.value} unit={aggregated.windspeed.unit} />
                                <StatCard icon={FiEye} label="Visibility" value={aggregated.visibility.value} unit={aggregated.visibility.unit} />
                            </div>
                        )}
                        <PlaceholderCharts />
                    </>
                )}
            </main>
        </div>
    );
}


