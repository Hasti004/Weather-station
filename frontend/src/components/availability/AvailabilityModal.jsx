import React, { useMemo, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { useApiAvailability } from '../../hooks/useApiAvailability';
import CalendarHeatmap from './CalendarHeatmap';
import MissingDaysList from './MissingDaysList';
import { exportWeatherDataToCSV, validateDateRange } from '../../utils/exportUtils';
import Toast from '../Toast';
import '../../styles/availability.css';

const STATION_NAMES = { ahm: 'Ahmedabad', udi: 'Udaipur', mtabu: 'Mt Abu' };

export default function AvailabilityModal({ id, isOpen, onClose, onApplyRange }) {
    const [month, setMonth] = useState(dayjs().month());
    const [year, setYear] = useState(dayjs().year());
    const [sel, setSel] = useState({ start: null, end: null });
    const [exportLoading, setExportLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Use API-based availability hook
    const {
        loading,
        error,
        availableDates,
        minDate,
        maxDate,
        stationName,
        getDataForRange
    } = useApiAvailability(id, month, year);

    // Update default month/year when data loads
    React.useEffect(() => {
        if (maxDate && !loading) {
            const maxDateObj = dayjs(maxDate);
            setMonth(maxDateObj.month());
            setYear(maxDateObj.year());
        }
    }, [maxDate, loading]);

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

    // Export functions
    const exportSelectedDays = useCallback(async () => {
        if (!sel.start || !sel.end) return;

        setExportLoading(true);
        try {
            const startDate = dayjs(sel.start).format('YYYY-MM-DD');
            const endDate = dayjs(sel.end).format('YYYY-MM-DD');

            const data = await getDataForRange(startDate, endDate);
            const result = exportWeatherDataToCSV(data, stationName || STATION_NAMES[id], startDate, endDate, 'selected');

            if (result.success) {
                setToast({
                    message: `Export complete: ${result.filename}`,
                    type: 'success'
                });
            } else {
                setToast({
                    message: `Export failed: ${result.error}`,
                    type: 'error'
                });
            }
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [sel.start, sel.end, getDataForRange, stationName, id]);

    const exportLast7Days = useCallback(async () => {
        setExportLoading(true);
        try {
            const endDate = dayjs().format('YYYY-MM-DD');
            const startDate = dayjs().subtract(7, 'days').format('YYYY-MM-DD');

            const data = await getDataForRange(startDate, endDate);
            const result = exportWeatherDataToCSV(data, stationName || STATION_NAMES[id], startDate, endDate, 'week');

            if (result.success) {
                setToast({
                    message: `Export complete: ${result.filename}`,
                    type: 'success'
                });
            } else {
                setToast({
                    message: `Export failed: ${result.error}`,
                    type: 'error'
                });
            }
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [getDataForRange, stationName, id]);

    const exportWholeMonth = useCallback(async () => {
        setExportLoading(true);
        try {
            const startDate = dayjs(new Date(year, month, 1)).format('YYYY-MM-DD');
            const endDate = dayjs(new Date(year, month + 1, 0)).format('YYYY-MM-DD');

            const data = await getDataForRange(startDate, endDate);
            const result = exportWeatherDataToCSV(data, stationName || STATION_NAMES[id], startDate, endDate, 'month');

            if (result.success) {
                setToast({
                    message: `Export complete: ${result.filename}`,
                    type: 'success'
                });
            } else {
                setToast({
                    message: `Export failed: ${result.error}`,
                    type: 'error'
                });
            }
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [getDataForRange, stationName, id, month, year]);

    const exportAllData = useCallback(async () => {
        setExportLoading(true);
        try {
            if (!minDate || !maxDate) {
                throw new Error('No data range available');
            }

            const startDate = dayjs(minDate).format('YYYY-MM-DD');
            const endDate = dayjs(maxDate).format('YYYY-MM-DD');

            const data = await getDataForRange(startDate, endDate);
            const result = exportWeatherDataToCSV(data, stationName || STATION_NAMES[id], startDate, endDate, 'all');

            if (result.success) {
                setToast({
                    message: `Export complete: ${result.filename}`,
                    type: 'success'
                });
            } else {
                setToast({
                    message: `Export failed: ${result.error}`,
                    type: 'error'
                });
            }
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [getDataForRange, stationName, id, minDate, maxDate]);

    // Clear toast after 3 seconds
    React.useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    if (!isOpen) return null;

    return (
        <div className="av-backdrop" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', display: 'grid', placeItems: 'center', zIndex: 50 }}>
            <div className="av-modal" style={{ width: 880, maxWidth: '90vw', background: '#fff', borderRadius: 16 }}>
                <div className="av-header">
                    <div style={{ fontWeight: 600 }}>{`Data Availability — ${stationName || STATION_NAMES[id] || ''}`}</div>
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
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '4px solid #f3f4f6',
                                borderTop: '4px solid #3b82f6',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            <div style={{ fontSize: '16px', color: '#6b7280' }}>
                                Loading availability data...
                            </div>
                        </div>
                    </div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{
                            fontSize: '16px',
                            color: '#6b7280',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <div style={{ fontSize: '24px' }}>📊</div>
                            <div>{error}</div>
                        </div>
                    </div>
                ) : (
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
                )}
                <div className="av-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            className="download-button"
                            disabled={!canApply || exportLoading}
                            onClick={exportSelectedDays}
                            style={{
                                border: '1px solid var(--panel-border)',
                                background: canApply && !exportLoading ? '#10b981' : '#f1f5f9',
                                color: canApply && !exportLoading ? 'white' : '#9ca3af',
                                borderRadius: 8,
                                padding: '6px 12px',
                                cursor: canApply && !exportLoading ? 'pointer' : 'not-allowed',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease'
                            }}
                            title={!canApply ? 'Select dates first' : 'Download selected date range'}
                        >
                            {exportLoading ? '⏳' : '📥'} Download Selected
                        </button>
                        <button
                            className="download-button"
                            disabled={exportLoading}
                            onClick={exportLast7Days}
                            style={{
                                border: '1px solid var(--panel-border)',
                                background: exportLoading ? '#f1f5f9' : '#3b82f6',
                                color: exportLoading ? '#9ca3af' : 'white',
                                borderRadius: 8,
                                padding: '6px 12px',
                                cursor: exportLoading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                            title="Download last 7 days of data"
                        >
                            Last 7 Days
                        </button>
                        <button
                            className="download-button"
                            disabled={exportLoading}
                            onClick={exportWholeMonth}
                            style={{
                                border: '1px solid var(--panel-border)',
                                background: exportLoading ? '#f1f5f9' : '#8b5cf6',
                                color: exportLoading ? '#9ca3af' : 'white',
                                borderRadius: 8,
                                padding: '6px 12px',
                                cursor: exportLoading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                            title="Download current month's data"
                        >
                            This Month
                        </button>
                        <button
                            className="download-button"
                            disabled={exportLoading || !minDate || !maxDate}
                            onClick={exportAllData}
                            style={{
                                border: '1px solid var(--panel-border)',
                                background: exportLoading || !minDate || !maxDate ? '#f1f5f9' : '#ef4444',
                                color: exportLoading || !minDate || !maxDate ? '#9ca3af' : 'white',
                                borderRadius: 8,
                                padding: '6px 12px',
                                cursor: exportLoading || !minDate || !maxDate ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                            title="Download all available data"
                        >
                            All Data
                        </button>
                    </div>
                    <button
                        disabled={!canApply}
                        onClick={() => { onApplyRange?.(sel.start, sel.end); onClose?.(); }}
                        style={{
                            border: '1px solid var(--panel-border)',
                            background: canApply ? 'var(--brand-100)' : '#f1f5f9',
                            color: 'var(--brand-700)',
                            borderRadius: 8,
                            padding: '6px 10px',
                            cursor: canApply ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Use selection as filter
                    </button>
                </div>
            </div>
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .download-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .download-button:not(:disabled):hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                @media (max-width: 768px) {
                    .av-modal {
                        width: 95vw !important;
                        max-width: 95vw !important;
                        margin: 10px !important;
                    }

                    .av-footer {
                        flex-direction: column !important;
                        gap: 12px !important;
                        align-items: stretch !important;
                    }

                    .av-footer > div:first-child {
                        justify-content: center !important;
                        flex-wrap: wrap !important;
                    }

                    .av-footer button {
                        font-size: 12px !important;
                        padding: 8px 12px !important;
                    }
                }
            `}</style>
        </div>
    );
}


