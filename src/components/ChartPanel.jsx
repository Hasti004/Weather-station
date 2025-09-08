import React, { useMemo, useRef } from 'react';
import { initChartDefaults } from '../utils/chartDefaults';

export default function ChartPanel({ title, avgLabel, avgValue, unit, rangeText, children, hasData = true }) {
    initChartDefaults();
    const chartRef = useRef(null);

    const avgPillStyle = useMemo(() => ({
        background: 'var(--chart-rain-fill)',
        color: 'var(--chart-rain)',
        borderRadius: 999,
        padding: '4px 8px',
        fontSize: 12,
    }), []);

    const onDownload = () => {
        const inst = chartRef.current?.canvas ? chartRef.current : (chartRef.current?.chart || chartRef.current);
        if (!inst) return;
        const link = document.createElement('a');
        link.href = inst.toBase64Image();
        link.download = `${title}.png`;
        link.click();
    };

    const onResetZoom = () => {
        const inst = chartRef.current?.resetZoom ? chartRef.current : (chartRef.current?.chart || chartRef.current);
        if (inst && inst.resetZoom) inst.resetZoom();
    };

    const content = typeof children === 'function' ? children(chartRef) : children;

    return (
        <section className="placeholder-section" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h3 style={{ margin: '0 0 2px 0', fontWeight: 600, fontSize: '1.05rem', color: 'var(--ink-700)' }}>{title}</h3>
                    {rangeText && <div style={{ fontSize: '0.825rem', color: 'var(--axis)' }}>{rangeText}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {typeof avgValue === 'number' && (
                        <span style={{ background: 'var(--pill-bg)', color: 'var(--pill-text)', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>
                            {avgLabel}: {avgValue.toFixed(2)} {unit || ''}
                        </span>
                    )}
                    <button aria-label="Download PNG" onClick={onDownload} title="Download PNG" style={{ border: '1px solid var(--panel-border)', color: 'var(--ink-700)', borderRadius: 8, padding: '6px 8px', background: 'white', cursor: 'pointer' }}>↓</button>
                    <button aria-label="Reset Zoom" onClick={onResetZoom} title="Reset Zoom" style={{ border: '1px solid var(--panel-border)', color: 'var(--ink-700)', borderRadius: 8, padding: '6px 8px', background: 'white', cursor: 'pointer' }}>⤾</button>
                </div>
            </div>
            <div className="placeholder-box" style={{ padding: 12, minHeight: 340 }}>
                {hasData ? content : (
                    <div style={{ height: 316, display: 'grid', placeItems: 'center', color: 'var(--axis)' }}>No data in this range</div>
                )}
            </div>
        </section>
    );
}


