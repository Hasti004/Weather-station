import React from 'react';

export default function TimeFilterToolbar({ value, onChange }) {
    const modes = [
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
        { key: 'custom', label: 'Custom' },
    ];
    const granularityOptions = [
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
        { key: 'raw', label: '5-min' },
    ];

    const setMode = (mode) => onChange({ ...value, mode, granularity: mode === 'custom' ? value.granularity || 'daily' : mode });
    const setStart = (start) => onChange({ ...value, start });
    const setEnd = (end) => onChange({ ...value, end });
    const setGran = (granularity) => onChange({ ...value, granularity });

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 999, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {modes.map((m) => (
                    <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: '1px solid transparent',
                            background: value.mode === m.key ? 'var(--brand-100)' : 'transparent',
                            color: value.mode === m.key ? 'var(--brand-700)' : 'var(--text-900)',
                            cursor: 'pointer',
                        }}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {value.mode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label>
                        <span style={{ fontSize: 12, color: '#475569', marginRight: 6 }}>Start</span>
                        <input type="date" onChange={(e) => setStart(new Date(e.target.value))} />
                    </label>
                    <label>
                        <span style={{ fontSize: 12, color: '#475569', marginRight: 6 }}>End</span>
                        <input type="date" onChange={(e) => setEnd(new Date(e.target.value))} />
                    </label>
                </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Granularity</span>
                <select value={value.granularity} onChange={(e) => setGran(e.target.value)}>
                    {granularityOptions.map((g) => (
                        <option key={g.key} value={g.key}>
                            {g.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}


