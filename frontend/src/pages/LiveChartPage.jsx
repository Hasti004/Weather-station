/**
 * Live Chart Page - Shows rolling time series data for weather stations
 * Uses fetchSeries API to get recent data and displays it in charts
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ErrorBanner from '../components/ErrorBanner';
import ChartPanel from '../components/ChartPanel';
import TemperatureChart from '../components/TemperatureChart';
import RainfallChart from '../components/RainfallChart';
import HumidityChart from '../components/HumidityChart';
import PressureChart from '../components/charts/PressureChart';
import WindSpeedChart from '../components/charts/WindSpeedChart';
import { fetchSeries, handleApiError } from '../services/api';
import { useObservatories } from '../hooks/useObservatories';
import { buildSeries } from '../utils/aggregate';

// Station names will be fetched from observatories API

// Map station IDs to numeric IDs for API
const STATION_ID_MAP = {
    ahm: 2,
    udi: 1,
    mtabu: 3,
};

export default function LiveChartPage() {
    const { id } = useParams();
    const [seriesData, setSeriesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [selectedMinutes, setSelectedMinutes] = useState(60);
    const [selectedStation, setSelectedStation] = useState(id);
    const { getStationName, getStationOptions } = useObservatories();

    const timeOptions = [
        { value: 15, label: 'Last 15 minutes' },
        { value: 30, label: 'Last 30 minutes' },
        { value: 60, label: 'Last hour' },
        { value: 180, label: 'Last 3 hours' },
        { value: 360, label: 'Last 6 hours' },
        { value: 720, label: 'Last 12 hours' },
        { value: 1440, label: 'Last 24 hours' },
    ];

    // Observatories are now loaded via the useObservatories hook

    // Load series data
    const loadSeriesData = async () => {
        try {
            setError(null);
            setLoading(true);
            const stationId = STATION_ID_MAP[selectedStation] || STATION_ID_MAP[id];
            const result = await fetchSeries(stationId, selectedMinutes);
            setSeriesData(result.data || []);
            setLastUpdated(new Date());
        } catch (err) {
            setError(handleApiError(err));
        } finally {
            setLoading(false);
        }
    };

    // Load data on mount and when parameters change
    useEffect(() => {
        loadSeriesData();
    }, [selectedStation, selectedMinutes]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(loadSeriesData, 30000);
        return () => clearInterval(interval);
    }, [selectedStation, selectedMinutes]);

    // Process data for charts
    const chartData = React.useMemo(() => {
        if (!seriesData || seriesData.length === 0) return null;

        const processedData = seriesData.map(item => ({
            dt: new Date(item.reading_ts),
            temperature_c: item.temperature_c,
            humidity_pct: item.humidity_pct,
            rainfall_mm: item.rainfall_mm,
            pressure_hpa: item.pressure_hpa,
            windspeed_ms: item.windspeed_ms,
        }));

        return {
            temperature: buildSeries(processedData.map(r => ({ dt: r.dt, temperature_c: r.temperature_c })), '5min', 'raw', 'temperature_c', 'avg'),
            humidity: buildSeries(processedData.map(r => ({ dt: r.dt, humidity_pct: r.humidity_pct })), '5min', 'raw', 'humidity_pct', 'avg'),
            rainfall: buildSeries(processedData.map(r => ({ dt: r.dt, rainfall_mm: r.rainfall_mm })), '5min', 'raw', 'rainfall_mm', 'sum'),
            pressure: buildSeries(processedData.map(r => ({ dt: r.dt, pressure_hpa: r.pressure_hpa })), '5min', 'raw', 'pressure_hpa', 'avg'),
            windspeed: buildSeries(processedData.map(r => ({ dt: r.dt, windspeed_ms: r.windspeed_ms })), '5min', 'raw', 'windspeed_ms', 'avg'),
        };
    }, [seriesData]);

    return (
        <div>
            <Navbar lastUpdated={lastUpdated} />
            <main className="container">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h2 style={{ margin: 0 }}>Live Charts - {getStationName(STATION_ID_MAP[selectedStation]) || 'Station'}</h2>
                    <Link to="/" style={{ color: 'var(--brand-600)', textDecoration: 'none' }}>&larr; All Stations</Link>
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            Station:
                        </label>
                        <select
                            value={selectedStation}
                            onChange={(e) => setSelectedStation(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                minWidth: '120px'
                            }}
                        >
                            {Object.entries(STATION_ID_MAP).map(([key, stationId]) => (
                                <option key={key} value={key}>{getStationName(stationId) || key}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                            Time Range:
                        </label>
                        <select
                            value={selectedMinutes}
                            onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                minWidth: '150px'
                            }}
                        >
                            {timeOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'end' }}>
                        <button
                            onClick={loadSeriesData}
                            disabled={loading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {error ? (
                    <ErrorBanner message={error} />
                ) : loading && !chartData ? (
                    <div className="skeleton" style={{ height: 400, marginTop: 16 }} />
                ) : chartData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <ChartPanel title="Temperature" avgLabel="Avg" avgValue={chartData.temperature.avg}>
                            <TemperatureChart data={chartData.temperature} unit="°C" />
                        </ChartPanel>

                        <ChartPanel title="Humidity" avgLabel="Avg" avgValue={chartData.humidity.avg}>
                            <HumidityChart data={chartData.humidity} unit="%" />
                        </ChartPanel>

                        <ChartPanel title="Rainfall" avgLabel="Total" avgValue={chartData.rainfall.sum}>
                            <RainfallChart data={chartData.rainfall} unit="mm" />
                        </ChartPanel>

                        <ChartPanel title="Pressure" avgLabel="Avg" avgValue={chartData.pressure.avg}>
                            <PressureChart data={chartData.pressure} unit="hPa" />
                        </ChartPanel>

                        <ChartPanel title="Wind Speed" avgLabel="Avg" avgValue={chartData.windspeed.avg}>
                            <WindSpeedChart data={chartData.windspeed} unit="m/s" />
                        </ChartPanel>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                        <p>No data available for the selected time range.</p>
                        <button
                            onClick={loadSeriesData}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                marginTop: '8px'
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                )}

                <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                    <p>Charts update automatically every 30 seconds</p>
                    <p>Data points: {seriesData?.length || 0} readings</p>
                </div>
            </main>
        </div>
    );
}
