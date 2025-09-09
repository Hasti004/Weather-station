import React from 'react';

export default function TemplateChips({ onSelect }) {
    const templates = [
        { key: 'essentials', label: 'Essentials' },
        { key: 'power', label: 'Power & Solar' },
        { key: 'wind', label: 'Wind' },
        { key: 'atm', label: 'Atmospheric' },
    ];
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {templates.map(t => (
                <button key={t.key} onClick={() => onSelect(t.key)} style={{ background: 'var(--brand-100)', color: 'var(--brand-700)', border: '1px solid rgba(37,99,235,.25)', borderRadius: 999, padding: '6px 10px', cursor: 'pointer' }}>{t.label}</button>
            ))}
        </div>
    );
}


