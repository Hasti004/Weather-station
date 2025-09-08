import React from 'react';
import { Bar } from 'react-chartjs-2';
import { cssVar } from '../utils/chartDefaults';

export default function RainfallChart({ data, unit = 'mm' }) {
    const chartData = {
        labels: data.labels,
        datasets: [
            {
                label: `Rainfall (${unit})`,
                data: data.series,
                backgroundColor: cssVar('--chart-rain-fill'),
                borderColor: cssVar('--chart-rain'),
                borderWidth: 1.5,
                borderRadius: 6,
                maxBarThickness: 28,
                minBarLength: 2,
            },
        ],
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 13 }, color: 'var(--ink-700)' } },
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue} ${unit}`,
                },
            },
            annotation: {
                annotations: {
                    avg: {
                        type: 'line',
                        yMin: data.avg,
                        yMax: data.avg,
                        borderColor: cssVar('--chart-rain'),
                        borderWidth: 1,
                        borderDash: [6, 6],
                        label: {
                            display: true,
                            content: `Average: ${data.avg.toFixed(2)} ${unit}`,
                            position: 'start',
                            backgroundColor: '#ffffff',
                            color: cssVar('--chart-rain')
                        },
                    },
                },
            },
            zoom: {
                zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
                pan: { enabled: true, mode: 'x' },
            },
        },
        scales: {
            x: { grid: { color: 'transparent', borderColor: 'var(--panel-border)', drawOnChartArea: false }, ticks: { maxRotation: 0, autoSkip: true, color: 'var(--axis)' }, title: { display: true, text: 'Time', color: 'var(--ink-700)', font: { weight: 600 } }, type: 'category' },
            y: { beginAtZero: true, grid: { color: 'var(--grid)' }, ticks: { padding: 6, color: 'var(--axis)' }, title: { display: true, text: unit, color: 'var(--ink-700)', font: { weight: 600 } } },
        },
    };
    return <Bar data={chartData} options={options} />;
}


