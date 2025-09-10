import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useArchiveAvailability } from '../../hooks/useArchiveAvailability';
import CalendarHeatmap from './CalendarHeatmap';
import MissingDaysList from './MissingDaysList';
import '../../styles/availability.css';

const STATION_NAMES = { ahm: 'Ahmedabad', udi: 'Udaipur', mtabu: 'Mt Abu' };

export default function AvailabilityModal({ id, isOpen, onClose, onApplyRange }) {
    const { loading, error, availableDates, minDate, maxDate } = useArchiveAvailability(id);
    const defaultMonth = useMemo(() => (maxDate ? dayjs(maxDate).month() : dayjs().month()), [maxDate]);
    const defaultYear = useMemo(() => (maxDate ? dayjs(maxDate).year() : dayjs().year()), [maxDate]);
    const [month, setMonth] = useState(defaultMonth);
    const [year, setYear] = useState(defaultYear);
    const [sel, setSel] = useState({ start: null, end: null });

    const years = useMemo(() => {
        if (!minDate || !maxDate) return [dayjs().year()];
        const ys = [];
        for (let y = dayjs(minDate).year(); y <= dayjs(maxDate).year(); y++) ys.push(y);
        return ys;
    }, [minDate, maxDate]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const jumpMonths = useMemo(() => {
        const out = [];
        if (!minDate || !maxDate) return out;
        let d = dayjs(minDate).startOf('month');
        const end = dayjs(maxDate).startOf('month');
        while (d.isBefore(end.add(1, 'month'))) {
            out.push({ key: d.format('YYYY-MM'), label: d.format('MMM YYYY'), m: d.month(), y: d.year() });
            d = d.add(1, 'month');
        }
        return out;
    }, [minDate, maxDate]);

    const applyQuick = (days) => {
        const end = maxDate ? dayjs(maxDate) : dayjs();
        const start = end.subtract(days, 'day');
        onApplyRange?.(start.toDate(), end.toDate());
        onClose?.();
    };

    const onRangeSelect = (start, end) => setSel({ start, end });

    const canApply = sel.start && sel.end;

    if (!isOpen) return null;

    return (
        <div className="av-backdrop" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
            <div className="av-modal" style={{ width: 880, maxWidth: '90vw', background: '#fff', borderRadius: 16 }}>
                <div className="av-header">
                    <div style={{ fontWeight: 600 }}>{`Data Availability — ${STATION_NAMES[id] || ''}`}</div>
                    <button onClick={onClose} style={{ border: '1px solid var(--panel-border)', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Close</button>
                </div>
                <div className="av-controls" style={{ padding: '10px 16px', borderBottom: '1px solid var(--panel-border)' }}>
                    <label>
                        Month
                        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={{ marginLeft: 6 }}>
                            {months.map((m, i) => (
                                <option key={m} value={i}>{m}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Year
                        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ marginLeft: 6 }}>
                            {years.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Jump to
                        <select onChange={(e) => { const found = jumpMonths.find(j => j.key === e.target.value); if (found) { setMonth(found.m); setYear(found.y); } }} style={{ marginLeft: 6 }}>
                            <option value="">Select</option>
                            {jumpMonths.map((j) => (
                                <option key={j.key} value={j.key}>{j.label}</option>
                            ))}
                        </select>
                    </label>
                    <span style={{ flex: 1 }} />
                    <div className="av-legend">
                        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--avail-green)' }} /> Available</span>
                        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--avail-red)' }} /> Missing</span>
                        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--avail-gray)' }} /> Out</span>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 12 }}>
                    <CalendarHeatmap month={month} year={year} availableDates={availableDates} minDate={minDate} maxDate={maxDate} onRangeSelect={onRangeSelect} />
                    <div style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                            <button onClick={() => applyQuick(7)} className="chip" style={{ border: '1px solid var(--panel-border)', borderRadius: 999, padding: '4px 8px', background: '#fff' }}>Last 7d</button>
                            <button onClick={() => applyQuick(30)} className="chip" style={{ border: '1px solid var(--panel-border)', borderRadius: 999, padding: '4px 8px', background: '#fff' }}>Last 30d</button>
                            <button onClick={() => applyQuick(90)} className="chip" style={{ border: '1px solid var(--panel-border)', borderRadius: 999, padding: '4px 8px', background: '#fff' }}>Last 90d</button>
                        </div>
                        <MissingDaysList month={month} year={year} availableDates={availableDates} />
                        <div style={{ marginTop: 10 }}>
                            <button onClick={() => { setSel({ start: null, end: null }); }} style={{ background: 'transparent', border: 'none', color: 'var(--brand-600)', cursor: 'pointer' }}>Clear selection</button>
                        </div>
                    </div>
                </div>
                <div className="av-footer">
                    <button disabled={!canApply} onClick={() => { onApplyRange?.(sel.start, sel.end); onClose?.(); }} style={{ border: '1px solid var(--panel-border)', background: canApply ? 'var(--brand-100)' : '#f1f5f9', color: 'var(--brand-700)', borderRadius: 8, padding: '6px 10px', cursor: canApply ? 'pointer' : 'not-allowed' }}>Use selection as filter</button>
                </div>
            </div>
        </div>
    );
}


