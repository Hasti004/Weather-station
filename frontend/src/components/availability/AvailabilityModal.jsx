import React, { useMemo, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { useApiAvailability } from '../../hooks/useApiAvailability';
import CalendarHeatmap from './CalendarHeatmap';
import MissingDaysList from './MissingDaysList';
import { exportCsv2 } from '../../services/api';
import Toast from '../Toast';
import '../../styles/availability.css';

const STATION_NAMES = { ahm: 'Ahmedabad', udi: 'Udaipur', mtabu: 'Mt Abu' };

export default function AvailabilityModal({ id, isOpen, onClose, onApplyRange }) {
    const [month, setMonth] = useState(dayjs().month());
    const [year, setYear] = useState(dayjs().year());
    const [sel, setSel] = useState({ start: null, end: null });
    const [exportLoading, setExportLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [debouncedMonth, setDebouncedMonth] = useState(dayjs().month());
    const [debouncedYear, setDebouncedYear] = useState(dayjs().year());

    // Date range selection state
    const [fromYear, setFromYear] = useState(dayjs().year());
    const [fromMonth, setFromMonth] = useState(dayjs().month());
    const [toYear, setToYear] = useState(dayjs().year());
    const [toMonth, setToMonth] = useState(dayjs().month());
    const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
    const [allAvailableDates, setAllAvailableDates] = useState(new Set());

    // Debounce month/year changes
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedMonth(month);
            setDebouncedYear(year);
        }, 250);

        return () => clearTimeout(timer);
    }, [month, year]);

    // Use API-based availability hook with debounced values
    const {
        loading,
        error,
        availableDates,
        minDate,
        maxDate,
        stationName,
        getDataForRange
    } = useApiAvailability(id, debouncedMonth, debouncedYear);

    // Get numeric station ID
    const STATION_ID_MAP = { ahm: 2, udi: 1, mtabu: 3 };
    const numericStationId = STATION_ID_MAP[id];

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

            // Use the new backend export endpoint
            const alias = id === 'udi' ? 'udaipur' : id === 'ahm' ? 'ahmedabad' : 'mountabu';
            const blob = await exportCsv2(alias, startDate, endDate);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${stationName || STATION_NAMES[id]}_${startDate}_to_${endDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setToast({
                message: `Export complete: ${stationName || STATION_NAMES[id]}_${startDate}_to_${endDate}.csv`,
                type: 'success'
            });
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [sel.start, sel.end, numericStationId, stationName, id]);

    const exportLast7Days = useCallback(async () => {
        setExportLoading(true);
        try {
            const endDate = dayjs().format('YYYY-MM-DD');
            const startDate = dayjs().subtract(7, 'days').format('YYYY-MM-DD');

            const alias = id === 'udi' ? 'udaipur' : id === 'ahm' ? 'ahmedabad' : 'mountabu';
            const blob = await exportCsv2(alias, startDate, endDate);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${stationName || STATION_NAMES[id]}_last_7_days.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setToast({
                message: `Export complete: ${stationName || STATION_NAMES[id]}_last_7_days.csv`,
                type: 'success'
            });
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [numericStationId, stationName, id]);

    const exportWholeMonth = useCallback(async () => {
        setExportLoading(true);
        try {
            const startDate = dayjs(new Date(year, month, 1)).format('YYYY-MM-DD');
            const endDate = dayjs(new Date(year, month + 1, 0)).format('YYYY-MM-DD');

            const alias = id === 'udi' ? 'udaipur' : id === 'ahm' ? 'ahmedabad' : 'mountabu';
            const blob = await exportCsv2(alias, startDate, endDate);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${stationName || STATION_NAMES[id]}_${year}-${(month + 1).toString().padStart(2, '0')}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setToast({
                message: `Export complete: ${stationName || STATION_NAMES[id]}_${year}-${(month + 1).toString().padStart(2, '0')}.csv`,
                type: 'success'
            });
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [numericStationId, stationName, id, month, year]);

    const exportAllData = useCallback(async () => {
        setExportLoading(true);
        try {
            if (!minDate || !maxDate) {
                throw new Error('No data range available');
            }

            const startDate = dayjs(minDate).format('YYYY-MM-DD');
            const endDate = dayjs(maxDate).format('YYYY-MM-DD');

            const alias = id === 'udi' ? 'udaipur' : id === 'ahm' ? 'ahmedabad' : 'mountabu';
            const blob = await exportCsv2(alias, startDate, endDate);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${stationName || STATION_NAMES[id]}_all_data.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setToast({
                message: `Export complete: ${stationName || STATION_NAMES[id]}_all_data.csv`,
                type: 'success'
            });
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [numericStationId, stationName, id, minDate, maxDate]);

    // Export data for custom date range
    const exportDateRange = useCallback(async () => {
        setExportLoading(true);
        try {
            const startDate = fromDate;
            const endDate = toDate;

            // Validate date range
            if (dayjs(startDate).isAfter(dayjs(endDate))) {
                setToast({
                    message: 'From date cannot be after To date',
                    type: 'error'
                });
                setExportLoading(false);
                return;
            }

            const alias = id === 'udi' ? 'udaipur' : id === 'ahm' ? 'ahmedabad' : 'mountabu';
            const blob = await exportCsv2(alias, startDate, endDate);

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${stationName || STATION_NAMES[id]}_${startDate}_to_${endDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setToast({
                message: `Export complete: ${stationName || STATION_NAMES[id]}_${startDate}_to_${endDate}.csv`,
                type: 'success'
            });
        } catch (err) {
            setToast({
                message: `Export failed: ${err.message}`,
                type: 'error'
            });
        } finally {
            setExportLoading(false);
        }
    }, [fromDate, toDate, numericStationId, stationName, id]);

    // Load data for scrollable calendar (past 6 months)
    React.useEffect(() => {
        if (!numericStationId) return;

        const loadScrollableData = async () => {
            try {
                const now = dayjs();
                const sixMonthsAgo = now.subtract(6, 'month');

                // Load data for the past 6 months
                const response = await getDataForRange(
                    sixMonthsAgo.format('YYYY-MM-DD'),
                    now.format('YYYY-MM-DD')
                );

                if (response && response.length > 0) {
                    const dates = new Set();
                    response.forEach(reading => {
                        if (reading.reading_ts) {
                            const date = dayjs(reading.reading_ts).format('YYYY-MM-DD');
                            dates.add(date);
                        }
                    });
                    setAllAvailableDates(dates);
                }
            } catch (err) {
                console.warn('Failed to load scrollable calendar data:', err);
            }
        };

        loadScrollableData();
    }, [numericStationId, getDataForRange]);

    // No auto-download - user must click the download button manually

    // Handle ESC key to close modal
    React.useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);


    // Clear toast after 3 seconds
    React.useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    if (!isOpen) return null;

    return (
        <div
            className="av-backdrop"
            role="dialog"
            aria-modal="true"
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', display: 'grid', placeItems: 'center', zIndex: 50 }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="av-modal" style={{ width: 1200, maxWidth: '95vw', height: '90vh', maxHeight: '90vh', background: '#fff', borderRadius: 16, display: 'flex', flexDirection: 'column' }}>
                <div className="av-header">
                    <div style={{ fontWeight: 600 }}>{`Data Availability — ${stationName || STATION_NAMES[id] || ''}`}</div>
                    <button onClick={onClose} style={{ border: '1px solid var(--panel-border)', background: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Close</button>
                </div>
                <div className="av-controls" style={{ padding: '10px 16px', borderBottom: '1px solid var(--panel-border)' }}>
                    <div style={{ flex: 1 }} />
                    <div className="av-legend">
                        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--avail-green)' }} /> Available</span>
                        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--avail-red)' }} /> Missing</span>
                        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--avail-gray)' }} /> Out</span>
                        <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: '#3b82f6', border: '1px solid #1d4ed8' }} /> Download Range</span>
                    </div>
                </div>

                {/* Date Range Selector */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--panel-border)', background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                            📥 Download Data Range
                        </span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            Select From/To dates and click Download Range
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>From:</span>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                style={{
                                    padding: '6px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>To:</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                style={{
                                    padding: '6px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <button
                            onClick={exportDateRange}
                            disabled={exportLoading || dayjs(fromDate).isAfter(dayjs(toDate))}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                background: (exportLoading || dayjs(fromDate).isAfter(dayjs(toDate))) ? '#9ca3af' : '#10b981',
                                color: '#fff',
                                borderRadius: '6px',
                                cursor: (exportLoading || dayjs(fromDate).isAfter(dayjs(toDate))) ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                opacity: (exportLoading || dayjs(fromDate).isAfter(dayjs(toDate))) ? 0.6 : 1
                            }}
                        >
                            {exportLoading ? '⬇️ Downloading...' : '📥 Download Range'}
                        </button>

                        <div style={{
                            fontSize: '12px',
                            color: dayjs(fromDate).isAfter(dayjs(toDate)) ? '#ef4444' : '#6b7280',
                            fontWeight: '500'
                        }}>
                            📅 {dayjs(fromDate).format('MMM DD, YYYY')} → {dayjs(toDate).format('MMM DD, YYYY')}
                            {dayjs(fromDate).isAfter(dayjs(toDate)) && (
                                <span style={{ color: '#ef4444', marginLeft: '8px' }}>⚠️ Invalid range</span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
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
                        <CalendarHeatmap
                            availableDates={allAvailableDates.size > 0 ? allAvailableDates : availableDates}
                            minDate={minDate}
                            maxDate={maxDate}
                            onRangeSelect={onRangeSelect}
                            selectedRange={{ from: fromDate, to: toDate }}
                            onDateRangeChange={(from, to) => {
                                setFromDate(from);
                                setToDate(to);
                            }}
                        />
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
                </div>
                <div className="av-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--panel-border)' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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


