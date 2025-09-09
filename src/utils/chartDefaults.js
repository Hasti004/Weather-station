import {
    Chart as ChartJS,
    LineElement,
    BarElement,
    ArcElement,
    PointElement,
    CategoryScale,
    LinearScale,
    TimeScale,
    RadialLinearScale,
    Filler,
    Tooltip,
    Legend,
    Decimation,
    Title,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
// Adapter for time scale (Chart.js v4 compatible)
import 'chartjs-adapter-dayjs-4';

let initialized = false;

export function initChartDefaults() {
    if (initialized) return;
    initialized = true;
    ChartJS.register(
        LineElement,
        BarElement,
        ArcElement,
        PointElement,
        CategoryScale,
        LinearScale,
        TimeScale,
        RadialLinearScale,
        Filler,
        Tooltip,
        Legend,
        Title,
        Decimation,
        annotationPlugin,
        zoomPlugin
    );

    const axisColor = getComputedStyle(document.documentElement).getPropertyValue('--axis') || '#64748B';

    ChartJS.defaults.font.family = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial";
    ChartJS.defaults.color = axisColor.trim();
    ChartJS.defaults.animation.duration = 500;
    ChartJS.defaults.elements.line.tension = 0.35;
    ChartJS.defaults.elements.point.radius = 0;
    ChartJS.defaults.hover.radius = 4;
    ChartJS.defaults.plugins.decimation = { enabled: true, algorithm: 'min-max' };
    ChartJS.defaults.layout = { padding: { left: 4, right: 12, top: 8, bottom: 0 } };
}

export function cssVar(name) {
    try {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name);
        return v ? v.trim() : name;
    } catch (e) {
        return name;
    }
}


