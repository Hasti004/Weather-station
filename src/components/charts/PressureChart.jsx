import React from 'react';
import { Line } from 'react-chartjs-2';
import dayjs from 'dayjs';
import { cssVar } from '../../utils/chartDefaults';

export default function PressureChart({ data, unit = 'hPa', chartRef }) {
    const chartData = {
        labels: data.labels,
        datasets: [
            {
                label: `Pressure (${unit})`,
                data: data.series,
                borderColor: cssVar('--chart-temp'),
                backgroundColor: 'rgba(59, 130, 246, .08)',
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
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue} ${unit}`,
                    title: (items) => {
                        const l = items?.[0]?.label;
                        return l && dayjs(l).isValid() ? dayjs(l).format('DD MMM, YYYY HH:mm') : l;
                    }
                },
            },
            annotation: {
                annotations: {
                    avg: {
                        type: 'line',
                        yMin: data.avg,
                        yMax: data.avg,
                        borderColor: cssVar('--chart-temp'),
                        borderWidth: 1,
                        borderDash: [6, 6],
                        label: {
                            display: true,
                            content: `Average: ${data.avg.toFixed(2)} ${unit}`,
                            position: 'start',
                            backgroundColor: '#ffffff',
                            color: cssVar('--chart-temp')
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
            y: { grid: { color: 'var(--grid)' }, ticks: { padding: 6, color: 'var(--axis)' }, title: { display: true, text: unit, color: 'var(--ink-700)', font: { weight: 600 } } },
        },
    };
    return <Line ref={chartRef} data={chartData} options={options} />;
}


