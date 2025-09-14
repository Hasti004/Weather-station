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
    // Group data by station for individual summaries
    const stationSummaries = React.useMemo(() => {
        if (!climateData || climateData.length === 0) return [];

        const stations = {};
        climateData.forEach(item => {
            const stationId = item.station_id;
            const stationName = item.station_name ||
                (stationId === 1 ? 'Udaipur' :
                 stationId === 2 ? 'Ahmedabad' :
                 stationId === 3 ? 'Mount Abu' : `Station ${stationId}`);

            if (!stations[stationId]) {
                stations[stationId] = {
                    id: stationId,
                    name: stationName,
                    data: item
                };
            }
        });
        return Object.values(stations);
    }, [climateData]);

    // Calculate aggregated climate data for overall summary
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
            {/* Station Summaries */}
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
                    Station Summaries
                </h3>

                <div className="station-summaries-grid">
                    {stationSummaries.map((station) => (
                        <div key={station.id} className="station-summary-item">
                            <div className="station-header">
                                <h4 className="station-name">{station.name}</h4>
                            </div>

                            <div className="station-metrics">
                                <div className="metric-row">
                                    <div className="metric-item">
                                        <div className="metric-icon" style={{ color: '#fbbf24' }}>
                                            🌡️
                                        </div>
                                        <div className="metric-content">
                                            <div className="metric-value" style={{ color: '#fbbf24' }}>
                                                {station.data.temperature_c ? station.data.temperature_c.toFixed(1) : '—'}°C
                                            </div>
                                            <div className="metric-label">Temperature</div>
                                        </div>
                                    </div>

                                    <div className="metric-item">
                                        <div className="metric-icon" style={{ color: '#3b82f6' }}>
                                            💧
                                        </div>
                                        <div className="metric-content">
                                            <div className="metric-value" style={{ color: '#3b82f6' }}>
                                                {station.data.humidity_pct ? station.data.humidity_pct.toFixed(1) : '—'}%
                                            </div>
                                            <div className="metric-label">Humidity</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="metric-row">
                                    <div className="metric-item">
                                        <div className="metric-icon" style={{ color: '#10b981' }}>
                                            🌧️
                                        </div>
                                        <div className="metric-content">
                                            <div className="metric-value" style={{ color: '#10b981' }}>
                                                {station.data.rainfall_mm ? station.data.rainfall_mm.toFixed(1) : '—'}mm
                                            </div>
                                            <div className="metric-label">Rainfall</div>
                                        </div>
                                    </div>

                                    <div className="metric-item">
                                        <div className="metric-icon" style={{ color: '#8b5cf6' }}>
                                            💨
                                        </div>
                                        <div className="metric-content">
                                            <div className="metric-value" style={{ color: '#8b5cf6' }}>
                                                {station.data.windspeed_ms ? station.data.windspeed_ms.toFixed(1) : '—'} m/s
                                            </div>
                                            <div className="metric-label">Wind Speed</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
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
                .station-summaries-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 20px;
                }

                .station-summary-item {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }

                .station-summary-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-2px);
                }

                .station-header {
                    margin-bottom: 16px;
                }

                .station-name {
                    color: white;
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                }

                .station-metrics {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .metric-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .metric-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .metric-icon {
                    font-size: 16px;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .metric-content {
                    flex: 1;
                    min-width: 0;
                }

                .metric-value {
                    font-size: 16px;
                    font-weight: 700;
                    line-height: 1.2;
                    margin-bottom: 2px;
                }

                .metric-label {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.8);
                    font-weight: 500;
                }

                .charts-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                    gap: 24px;
                }

                @media (max-width: 768px) {
                    .station-summaries-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }

                    .metric-row {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }

                    .charts-grid {
                        grid-template-columns: 1fr;
                        gap: 16px;
                    }
                }

                @media (max-width: 480px) {
                    .station-summary-item {
                        padding: 16px;
                    }

                    .metric-item {
                        padding: 8px;
                        gap: 8px;
                    }

                    .metric-value {
                        font-size: 14px;
                    }

                    .charts-grid {
                        gap: 12px;
                    }
                }
            `}</style>
        </div>
    );
}
