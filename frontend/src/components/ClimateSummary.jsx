import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function ClimateSummary({ climateData, seriesData }) {
    // Calculate aggregated climate data
    const aggregatedData = React.useMemo(() => {
        if (!climateData || climateData.length === 0) return null;

        const validTemps = climateData.filter(d => d.temperature_c !== null && !isNaN(d.temperature_c));
        const validHumidity = climateData.filter(d => d.humidity_pct !== null && !isNaN(d.humidity_pct));
        const validRainfall = climateData.filter(d => d.rainfall_mm !== null && !isNaN(d.rainfall_mm));
        const validWindSpeed = climateData.filter(d => d.windspeed_ms !== null && !isNaN(d.windspeed_ms));

        return {
            avgTemperature: validTemps.length > 0
                ? (validTemps.reduce((sum, d) => sum + d.temperature_c, 0) / validTemps.length).toFixed(1)
                : '—',
            avgHumidity: validHumidity.length > 0
                ? (validHumidity.reduce((sum, d) => sum + d.humidity_pct, 0) / validHumidity.length).toFixed(1)
                : '—',
            totalRainfall: validRainfall.length > 0
                ? validRainfall.reduce((sum, d) => sum + d.rainfall_mm, 0).toFixed(1)
                : '—',
            avgWindSpeed: validWindSpeed.length > 0
                ? (validWindSpeed.reduce((sum, d) => sum + d.windspeed_ms, 0) / validWindSpeed.length).toFixed(1)
                : '—',
            stationCount: climateData.length
        };
    }, [climateData]);

    // Prepare chart data for temperature trend
    const temperatureChartData = React.useMemo(() => {
        if (!seriesData || Object.keys(seriesData).length === 0) return null;

        const datasets = [];
        const colors = ['#3b82f6', '#ef4444', '#10b981']; // Blue, Red, Green
        const stationNames = { 1: 'Udaipur', 2: 'Ahmedabad', 3: 'Mount Abu' };

        Object.entries(seriesData).forEach(([stationId, data], index) => {
            if (data && data.length > 0) {
                const chartData = data.map(item => ({
                    x: new Date(item.reading_ts),
                    y: item.temperature_c
                })).filter(item => item.y !== null && !isNaN(item.y));

                if (chartData.length > 0) {
                    datasets.push({
                        label: stationNames[stationId] || `Station ${stationId}`,
                        data: chartData,
                        borderColor: colors[index % colors.length],
                        backgroundColor: colors[index % colors.length] + '20',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    });
                }
            }
        });

        return datasets.length > 0 ? {
            datasets
        } : null;
    }, [seriesData]);

    // Prepare chart data for rainfall trend
    const rainfallChartData = React.useMemo(() => {
        if (!seriesData || Object.keys(seriesData).length === 0) return null;

        const datasets = [];
        const colors = ['#3b82f6', '#ef4444', '#10b981'];
        const stationNames = { 1: 'Udaipur', 2: 'Ahmedabad', 3: 'Mount Abu' };

        Object.entries(seriesData).forEach(([stationId, data], index) => {
            if (data && data.length > 0) {
                const chartData = data.map(item => ({
                    x: new Date(item.reading_ts),
                    y: item.rainfall_mm
                })).filter(item => item.y !== null && !isNaN(item.y));

                if (chartData.length > 0) {
                    datasets.push({
                        label: stationNames[stationId] || `Station ${stationId}`,
                        data: chartData,
                        borderColor: colors[index % colors.length],
                        backgroundColor: colors[index % colors.length] + '40',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    });
                }
            }
        });

        return datasets.length > 0 ? {
            datasets
        } : null;
    }, [seriesData]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: 'white',
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    displayFormats: {
                        hour: 'HH:mm'
                    }
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.8)',
                    maxTicksLimit: 8
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            },
            y: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.8)'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    if (!aggregatedData) {
        return (
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                    Loading climate data...
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Today's Climate Summary */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '24px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
                <h3 style={{
                    color: 'white',
                    fontSize: '24px',
                    fontWeight: '600',
                    margin: '0 0 20px 0',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                    Today's Climate Summary
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px'
                }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#fbbf24', marginBottom: '4px' }}>
                            {aggregatedData.avgTemperature}°C
                        </div>
                        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            Average Temperature
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#3b82f6', marginBottom: '4px' }}>
                            {aggregatedData.avgHumidity}%
                        </div>
                        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            Average Humidity
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                            {aggregatedData.totalRainfall}mm
                        </div>
                        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            Total Rainfall
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#8b5cf6', marginBottom: '4px' }}>
                            {aggregatedData.avgWindSpeed} m/s
                        </div>
                        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            Average Wind Speed
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                {/* Temperature Trend Chart */}
                {temperatureChartData && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h4 style={{
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: '600',
                            margin: '0 0 16px 0',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                        }}>
                            24-Hour Temperature Trend
                        </h4>
                        <div style={{ height: '300px' }}>
                            <Line data={temperatureChartData} options={chartOptions} />
                        </div>
                    </div>
                )}

                {/* Rainfall Trend Chart */}
                {rainfallChartData && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h4 style={{
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: '600',
                            margin: '0 0 16px 0',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                        }}>
                            24-Hour Rainfall Trend
                        </h4>
                        <div style={{ height: '300px' }}>
                            <Line data={rainfallChartData} options={chartOptions} />
                        </div>
                    </div>
                )}
            </div>

            <style jsx>{`
                .charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 24px;
                }

                @media (max-width: 768px) {
                    .charts-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                }

                @media (max-width: 480px) {
                    .charts-grid {
                        gap: 12px;
                    }
                }
            `}</style>
        </div>
    );
}
