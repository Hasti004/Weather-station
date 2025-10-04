import React from 'react';
import { Line } from 'react-chartjs-2';

export default function IndoorTemperatureChart({ data, unit = '°C' }) {
    const chartData = {
        labels: data.labels || [],
        datasets: [{
            label: `Indoor Temperature (${unit})`,
            data: data.series || [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'time',
                time: {
                    displayFormats: {
                        day: 'MMM DD'
                    }
                },
                ticks: { color: 'var(--axis)' },
                grid: { color: 'var(--grid)' }
            },
            y: {
                ticks: { color: 'var(--axis)' },
                grid: { color: 'var(--grid)' }
            }
        },
        plugins: {
            legend: { display: false }
        }
    };

    return <Line data={chartData} options={options} />;
}
