import React from 'react';

export default function MetricToggle({ id, label, checked, disabled, onChange }) {
    return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? 0.5 : 1 }}>
            <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(id, e.target.checked)} />
            <span style={{ color: '#334155' }}>{label}</span>
        </label>
    );
}


