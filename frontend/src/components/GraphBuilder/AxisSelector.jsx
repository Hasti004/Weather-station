import React from 'react';

export default function AxisSelector({ fields, xKey, yKey, onChange }) {
    const scalarKeys = Object.keys(fields).filter(k => fields[k].kind === 'scalar');
    const xKeys = ['time', ...scalarKeys];
    return (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>X axis</span>
                <select value={xKey} onChange={(e) => onChange({ xKey: e.target.value, yKey })}>
                    {xKeys.map(k => (
                        <option key={k} value={k}>{fields[k]?.label || k}</option>
                    ))}
                </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Y axis</span>
                <select value={yKey} onChange={(e) => onChange({ xKey, yKey: e.target.value })}>
                    {scalarKeys.map(k => (
                        <option key={k} value={k}>{fields[k].label}</option>
                    ))}
                </select>
            </label>
        </div>
    );
}


