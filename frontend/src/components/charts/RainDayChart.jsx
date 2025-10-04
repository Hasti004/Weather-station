import React from 'react';
import { Bar } from 'react-chartjs-2';

export default function RainDayChart({ data, unit = 'mm' }) {
    const chartData = {
        labels: data.labels || [],
        datasets: [{
            label: `Daily Rainfall (${unit})`,
            data: data.series || [],
            backgroundColor: '#10b981',
            borderColor: '#059669',
            borderWidth: 1
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

    return <Bar data={chartData} options={options} />;
}
