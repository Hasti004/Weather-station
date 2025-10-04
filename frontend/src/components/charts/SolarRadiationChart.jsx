import React from 'react';
import { Line } from 'react-chartjs-2';

export default function SolarRadiationChart({ data, unit = 'W/m²' }) {
    const chartData = {
        labels: data.labels || [],
        datasets: [{
            label: `Solar Radiation (${unit})`,
            data: data.series || [],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
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
