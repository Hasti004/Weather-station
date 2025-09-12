import React, { memo, useMemo, useCallback } from 'react';
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
import { downsampleTimeSeries, calculateMovingAverage } from '../utils/dataProcessing';

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

const OptimizedChart = memo(({
    data,
    title,
    unit,
    color = '#3b82f6',
    height = 300,
    smoothing = false,
    maxPoints = 500,
    ...props
}) => {
    // Downsample data for better performance
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return null;

        let processed = data;

        // Downsample if data is too large
        if (data.length > maxPoints) {
            processed = downsampleTimeSeries(data, maxPoints);
        }

        // Apply smoothing if requested
        if (smoothing && processed.length > 10) {
            const values = processed.map(d => d.value || d.y || 0);
            const smoothed = calculateMovingAverage(values, 3);
            processed = processed.map((d, i) => ({
                ...d,
                value: smoothed[i] || d.value || d.y || 0
            }));
        }

        return processed;
    }, [data, maxPoints, smoothing]);

    const chartData = useMemo(() => {
        if (!processedData) return null;

        return {
            labels: processedData.map(d => {
                const date = new Date(d.timestamp || d.x || d.reading_ts);
                return date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }),
            datasets: [{
                label: title,
                data: processedData.map(d => d.value || d.y || 0),
                borderColor: color,
                backgroundColor: `${color}20`,
                fill: true,
                tension: 0.1,
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 2,
            }]
        };
    }, [processedData, title, color]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: !!title,
                text: title,
                font: {
                    size: 16,
                    weight: 'bold'
                }
            },
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                callbacks: {
                    label: (context) => {
                        const value = context.parsed.y;
                        return `${title}: ${value.toFixed(1)}${unit || ''}`;
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: false
                },
                ticks: {
                    maxTicksLimit: 8,
                    color: '#6b7280'
                }
            },
            y: {
                display: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    color: '#6b7280',
                    callback: (value) => `${value}${unit || ''}`
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        animation: {
            duration: 0 // Disable animations for better performance
        }
    }), [title, unit]);

    if (!chartData) {
        return (
            <div style={{
                height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                fontSize: '14px'
            }}>
                No data available
            </div>
        );
    }

    return (
        <div style={{ height, position: 'relative' }}>
            <Line data={chartData} options={options} {...props} />
        </div>
    );
});

OptimizedChart.displayName = 'OptimizedChart';

export default OptimizedChart;
