import React from 'react';
import { FiThermometer, FiDroplet, FiCloudRain, FiTrendingDown, FiWind, FiEye } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import ErrorBanner from '../components/ErrorBanner';
import PlaceholderCharts from '../components/PlaceholderCharts';
import { useWeatherData } from '../hooks/useWeatherData';

export default function Dashboard() {
    const { loading, error, lastUpdated, mapped } = useWeatherData();

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
                                <StatCard icon={FiThermometer} label="Temperature" value={mapped.temperature.value} unit={mapped.temperature.unit} />
                                <StatCard icon={FiDroplet} label="Relative Humidity" value={mapped.humidity.value} unit={mapped.humidity.unit} />
                                <StatCard icon={FiCloudRain} label="Rainfall" value={mapped.rainfall.value} unit={mapped.rainfall.unit} />
                                <StatCard icon={FiTrendingDown} label="Pressure" value={mapped.pressure.value} unit={mapped.pressure.unit} />
                                <StatCard icon={FiWind} label="Wind Speed" value={mapped.windspeed.value} unit={mapped.windspeed.unit} />
                                <StatCard icon={FiEye} label="Visibility" value={mapped.visibility.value} unit={mapped.visibility.unit} />
                            </div>
                        )}
                        <PlaceholderCharts />
                    </>
                )}
            </main>
        </div>
    );
}


