import React from 'react';
import { Line } from 'react-chartjs-2';

export default function IndoorHumidityChart({ data, unit = '%' }) {
    const chartData = {
        labels: data.labels || [],
        datasets: [{
            label: `Indoor Humidity (${unit})`,
            data: data.series || [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
                beginAtZero: true,
                max: 100,
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
