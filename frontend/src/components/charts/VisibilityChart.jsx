import React from 'react';
import { Line } from 'react-chartjs-2';

export default function VisibilityChart({ data, unit = 'km', chartRef }) {
    const chartData = {
        labels: data.labels,
        datasets: [
            {
                label: `Visibility (${unit})`,
                data: data.series,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, .12)',
                tension: 0.35,
                pointRadius: 0,
                borderWidth: 2,
                fill: { target: 'origin' },
            },
        ],
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', align: 'start', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 13 }, color: 'var(--ink-700)' } },
            annotation: {
                annotations: {
                    avg: { type: 'line', yMin: data.avg, yMax: data.avg, borderColor: '#22c55e', borderWidth: 1, borderDash: [6, 6], label: { display: true, content: `Average: ${data.avg.toFixed(2)} ${unit}`, position: 'start', backgroundColor: '#fff', color: '#22c55e' } }
                }
            },
            zoom: { zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' }, pan: { enabled: true, mode: 'x' } }
        },
        scales: {
            x: { grid: { color: 'transparent', borderColor: 'var(--panel-border)', drawOnChartArea: false }, ticks: { maxRotation: 0, autoSkip: true, color: 'var(--axis)' }, title: { display: true, text: 'Time', color: 'var(--ink-700)', font: { weight: 600 } }, type: 'category' },
            y: { grid: { color: 'var(--grid)' }, ticks: { padding: 6, color: 'var(--axis)' }, title: { display: true, text: unit, color: 'var(--ink-700)', font: { weight: 600 } } },
        },
    };
    return <Line ref={chartRef} data={chartData} options={options} />;
}


