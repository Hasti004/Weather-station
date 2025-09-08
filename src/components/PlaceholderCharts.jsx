import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const sampleLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const sampleData = [12, 19, 8, 15, 22, 13, 17];

const lineData = {
    labels: sampleLabels,
    datasets: [
        {
            label: 'Sample',
            data: sampleData,
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.2)',
            tension: 0.35,
        },
    ],
};

const barData = {
    labels: sampleLabels,
    datasets: [
        {
            label: 'Sample',
            data: sampleData.map((n) => Math.max(0, n - 5)),
            backgroundColor: '#93C5FD',
        },
    ],
};

export default function PlaceholderCharts() {
    return (
        <div>
            <section className="placeholder-section" aria-label="Temperature Trend (Coming Soon)">
                <h3>Temperature Trend (Coming Soon)</h3>
                {/* TODO: Replace sample labels/data with parsed historical series from data file */}
                <div className="placeholder-box" style={{ padding: 12 }}>
                    <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
            </section>
            <section className="placeholder-section" aria-label="Humidity Trend (Coming Soon)">
                <h3>Humidity Trend (Coming Soon)</h3>
                {/* TODO: Replace sample labels/data with parsed historical series from data file */}
                <div className="placeholder-box" style={{ padding: 12 }}>
                    <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
            </section>
            <section className="placeholder-section" aria-label="Rainfall Trend (Coming Soon)">
                <h3>Rainfall Trend (Coming Soon)</h3>
                {/* TODO: Replace sample labels/data with parsed historical series from data file */}
                <div className="placeholder-box" style={{ padding: 12 }}>
                    <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false }} />
                </div>
            </section>
        </div>
    );
}


