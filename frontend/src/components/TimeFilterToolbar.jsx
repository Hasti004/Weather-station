import React from 'react';

export default function TimeFilterToolbar({ value, onChange }) {
    const [draft, setDraft] = React.useState(value);
    const [startInput, setStartInput] = React.useState('');
    const [endInput, setEndInput] = React.useState('');
    const [error, setError] = React.useState(null);
    const [changed, setChanged] = React.useState(false);

    React.useEffect(() => {
        setDraft(value);
        setStartInput(value.start ? formatISODate(value.start) : '');
        setEndInput(value.end ? formatISODate(value.end) : '');
        setError(null);
        setChanged(false);
    }, [value]);

    const modes = [
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
        { key: 'custom', label: 'Custom' },
    ];

    const granularityOptions = [
        { key: 'raw', label: 'Hourly' },
        { key: 'daily', label: 'Daily' },
        { key: 'weekly', label: 'Weekly' },
        { key: 'monthly', label: 'Monthly' },
    ];

    function formatISODate(d) {
        const dt = new Date(d);
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function parseFlexible(input) {
        if (!input) return null;
        // Accept yyyy-mm-dd and mm/dd/yyyy
        const iso = /^\d{4}-\d{2}-\d{2}$/;
        const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        if (iso.test(input)) {
            const d = new Date(input + 'T00:00:00');
            return Number.isNaN(d.getTime()) ? null : d;
        }
        const m = input.match(us);
        if (m) {
            const mm = m[1].padStart(2, '0');
            const dd = m[2].padStart(2, '0');
            const yyyy = m[3];
            const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        return null;
    }

    const setMode = (mode) => {
        const next = { ...draft, mode, granularity: mode === 'custom' ? (draft.granularity || 'daily') : mode };
        setDraft(next);
        setChanged(true);
        setError(null);
    };

    const onStartChange = (v) => {
        setStartInput(v);
        const parsed = parseFlexible(v);
        const next = { ...draft, start: parsed };
        setDraft(next);
        setChanged(true);
        validate(next);
    };

    const onEndChange = (v) => {
        setEndInput(v);
        const parsed = parseFlexible(v);
        const next = { ...draft, end: parsed };
        setDraft(next);
        setChanged(true);
        validate(next);
    };

    const setGran = (granularity) => {
        const next = { ...draft, granularity };
        setDraft(next);
        setChanged(true);
        setError(null);
    };

    function validate(state) {
        if (state.mode !== 'custom') {
            setError(null);
            return true;
        }
        if (!state.start || !state.end) {
            setError('Enter both start and end dates.');
            return false;
        }
        const start = new Date(state.start);
        const end = new Date(state.end);
        if (start > end) {
            setError('Start must be before or equal to End.');
            return false;
        }
        setError(null);
        return true;
    }

    const reset = () => {
        const next = { mode: 'monthly', start: null, end: null, granularity: 'daily' };
        setDraft(next);
        setStartInput('');
        setEndInput('');
        setError(null);
        setChanged(true);
        debouncedApply(next);
    };

    const doApply = (state) => {
        if (!validate(state)) return;
        onChange(state);
        announce('Charts updated');
        setChanged(false);
    };

    const debouncedApply = React.useMemo(() => {
        let t = null;
        return (s) => {
            if (t) clearTimeout(t);
            t = setTimeout(() => doApply(s), 250);
        };
    }, []);

    function announce(msg) {
        const el = document.getElementById('a11y-live');
        if (el) el.textContent = msg;
    }

    const isApplyDisabled = !changed || (draft.mode === 'custom' && !validate(draft));

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', width: '100%' }}>
            <div style={{ display: 'flex', background: 'var(--card)', borderRadius: 999, padding: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                {modes.map((m) => (
                    <button
                        key={m.key}
                        onClick={() => setMode(m.key)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: '1px solid transparent',
                            background: draft.mode === m.key ? 'var(--brand-100)' : 'transparent',
                            color: draft.mode === m.key ? 'var(--brand-700)' : '#0f172a',
                            cursor: 'pointer',
                        }}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            {draft.mode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label>
                        <span style={{ fontSize: 12, color: '#475569', marginRight: 6 }}>Start</span>
                        <input
                            type="text"
                            value={startInput}
                            onChange={(e) => onStartChange(e.target.value)}
                            placeholder="yyyy-mm-dd or mm/dd/yyyy"
                            aria-invalid={!!error}
                            aria-describedby={error ? 'date-help' : undefined}
                            style={{ border: error ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px' }}
                        />
                    </label>
                    <label>
                        <span style={{ fontSize: 12, color: '#475569', marginRight: 6 }}>End</span>
                        <input
                            type="text"
                            value={endInput}
                            onChange={(e) => onEndChange(e.target.value)}
                            placeholder="yyyy-mm-dd or mm/dd/yyyy"
                            aria-invalid={!!error}
                            aria-describedby={error ? 'date-help' : undefined}
                            style={{ border: error ? '1px solid #ef4444' : '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px' }}
                        />
                    </label>
                    {error && (
                        <div id="date-help" style={{ fontSize: 12, color: '#64748B' }}>{error}</div>
                    )}
                </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#475569' }}>Granularity</span>
                <select value={draft.granularity} onChange={(e) => setGran(e.target.value)}>
                    {granularityOptions.map((g) => (
                        <option key={g.key} value={g.key}>
                            {g.label}
                        </option>
                    ))}
                </select>
            </label>

            <span style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#64748B' }}>Charts use archival data; cards/table use live data (30s).</span>
                <button onClick={reset} style={{ border: '1px solid var(--panel-border)', background: 'white', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Reset</button>
                <button
                    onClick={() => debouncedApply(draft)}
                    disabled={isApplyDisabled}
                    style={{
                        border: '1px solid var(--brand-600)',
                        background: isApplyDisabled ? '#e5e7eb' : 'var(--brand-600)',
                        color: isApplyDisabled ? '#9ca3af' : 'white',
                        borderRadius: 8,
                        padding: '6px 12px',
                        cursor: isApplyDisabled ? 'not-allowed' : 'pointer'
                    }}
                    aria-disabled={isApplyDisabled}
                >
                    Apply
                </button>
            </div>

            <div id="a11y-live" aria-live="polite" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }} />
        </div>
    );
}


