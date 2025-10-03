import React from 'react';

export default function TimeFilterToolbar({ value, onChange }) {
    const [draft, setDraft] = React.useState(value);
    const [startInput, setStartInput] = React.useState('');
    const [endInput, setEndInput] = React.useState('');
    const [error, setError] = React.useState(null);
    const [changed, setChanged] = React.useState(false);
    const [showCustomPopup, setShowCustomPopup] = React.useState(false);

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
        if (mode === 'custom') {
            setShowCustomPopup(true);
            return;
        }
        const next = { ...draft, mode, granularity: mode };
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

    const handleCustomApply = () => {
        const next = { ...draft, mode: 'custom', granularity: draft.granularity || 'daily' };
        if (validate(next)) {
            setDraft(next);
            setChanged(true);
            setShowCustomPopup(false);
            doApply(next);
        }
    };

    const handleCustomCancel = () => {
        setShowCustomPopup(false);
        setError(null);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 12, color: '#475569' }}>
                        📅 {startInput && endInput ? `${startInput} to ${endInput}` : 'Custom date range selected'}
                    </span>
                    <button
                        onClick={() => setShowCustomPopup(true)}
                        style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer'
                        }}
                    >
                        Edit
                    </button>
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

            {/* Custom Date Popup */}
            {showCustomPopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: 12,
                        padding: 24,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        minWidth: 400,
                        maxWidth: 500
                    }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
                            Select Custom Date Range
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={startInput}
                                    onChange={(e) => onStartChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 6,
                                        fontSize: 14
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={endInput}
                                    onChange={(e) => onEndChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 6,
                                        fontSize: 14
                                    }}
                                />
                            </div>

                            {error && (
                                <div style={{ fontSize: 12, color: '#ef4444', padding: '8px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                                    {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button
                                    onClick={handleCustomCancel}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid #d1d5db',
                                        background: 'white',
                                        color: '#374151',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontSize: 14
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCustomApply}
                                    disabled={!!error}
                                    style={{
                                        padding: '8px 16px',
                                        border: 'none',
                                        background: error ? '#e5e7eb' : '#3b82f6',
                                        color: error ? '#9ca3af' : 'white',
                                        borderRadius: 6,
                                        cursor: error ? 'not-allowed' : 'pointer',
                                        fontSize: 14
                                    }}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
