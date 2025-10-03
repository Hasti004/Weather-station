import React, { useMemo, useState, useEffect } from 'react';
import dayjs from 'dayjs';

export default function CalendarHeatmap({ availableDates, minDate, maxDate, onRangeSelect, selectedRange, onDateRangeChange }) {
    const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'));
    const [selStart, setSelStart] = useState(null);
    const [selEnd, setSelEnd] = useState(null);

    // Generate months to display (6 months before and after current month)
    const monthsToShow = useMemo(() => {
        const months = [];
        const startMonth = currentMonth.subtract(6, 'month');
        for (let i = 0; i < 12; i++) {
            months.push(startMonth.add(i, 'month'));
        }
        return months;
    }, [currentMonth]);

    function classify(d) {
        // Check if date is in the future
        const today = dayjs().startOf('day');
        if (d.isAfter(today)) return 'out';

        // Check if date is within the data range
        const within = (!minDate || d.toDate() >= minDate) && (!maxDate || d.toDate() <= maxDate);
        if (!within) return 'out';

        // Check if data is available for this date
        const key = d.format('YYYY-MM-DD');
        return availableDates.has(key) ? 'ok' : 'miss';
    }

    function onClickCell(d) {
        if (!selStart) {
            setSelStart(d);
            setSelEnd(null);
        } else if (!selEnd) {
            const a = selStart.isBefore(d) ? selStart : d;
            const b = selStart.isBefore(d) ? d : selStart;
            setSelStart(a);
            setSelEnd(b);
            onRangeSelect?.(a.toDate(), b.toDate());
            onDateRangeChange?.(a.format('YYYY-MM-DD'), b.format('YYYY-MM-DD'));
        } else {
            setSelStart(d);
            setSelEnd(null);
        }
    }

    const isSelected = (d) => selStart && selEnd && d.isAfter(selStart.subtract(1, 'day')) && d.isBefore(selEnd.add(1, 'day'));

    // Check if date is in the selected range for download
    const isInSelectedRange = (d) => {
        if (!selectedRange?.from || !selectedRange?.to) return false;
        const fromDate = dayjs(selectedRange.from);
        const toDate = dayjs(selectedRange.to);
        return (d.isAfter(fromDate, 'day') || d.isSame(fromDate, 'day')) &&
               (d.isBefore(toDate, 'day') || d.isSame(toDate, 'day'));
    };

    // Generate calendar grid for a specific month
    const generateMonthGrid = (monthStart) => {
        const firstWeekStart = monthStart.startOf('week'); // Sunday-start grid
        const cells = [];
        let cursor = firstWeekStart;
        for (let i = 0; i < 42; i++) {
            cells.push(cursor);
            cursor = cursor.add(1, 'day');
        }
        return cells;
    };

    return (
        <div style={{ height: '600px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
            {monthsToShow.map((monthStart, monthIndex) => {
                const weeks = generateMonthGrid(monthStart);
                return (
                    <div key={monthIndex} style={{ marginBottom: '32px' }}>
                        {/* Month Header */}
                        <div style={{
                            textAlign: 'center',
                            padding: '16px 0',
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#374151',
                            borderBottom: '2px solid #e5e7eb',
                            marginBottom: '12px',
                            background: '#f8fafc',
                            position: 'sticky',
                            top: 0,
                            zIndex: 10
                        }}>
                            {monthStart.format('MMMM YYYY')}
                        </div>

                        {/* Day Headers */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px',
                            marginBottom: '12px',
                            background: '#f8fafc',
                            position: 'sticky',
                            top: '80px',
                            zIndex: 9
                        }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} style={{
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#6b7280',
                                    padding: '8px 0'
                                }}>
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '4px'
                        }}>
                            {weeks.map((d, i) => {
                                const cls = classify(d);
                                const selected = isSelected(d);
                                const inSelectedRange = isInSelectedRange(d);
                                const inCurrentMonth = d.month() === monthStart.month();

                                return (
                                    <div
                                        key={i}
                                        role="gridcell"
                                        tabIndex={0}
                                        onClick={() => onClickCell(d)}
                                        className={`cell ${cls}${selected ? ' sel' : ''}${inSelectedRange ? ' range-selected' : ''}`}
                                        aria-label={`${d.format('YYYY-MM-DD')}: ${cls === 'ok' ? 'available' : cls === 'miss' ? 'missing' : 'out of month'}${inSelectedRange ? ' (in download range)' : ''}`}
                                        style={{
                                            ...(inSelectedRange ? {
                                                background: '#dbeafe',
                                                border: '2px solid #3b82f6',
                                                borderRadius: '6px'
                                            } : {}),
                                            ...(inCurrentMonth ? {} : { opacity: 0.3 }),
                                            padding: '12px 8px',
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            border: '1px solid #e5e7eb',
                                            background: cls === 'ok' ? '#dcfce7' : cls === 'miss' ? '#fef2f2' : '#f9fafb',
                                            borderRadius: '6px',
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            minHeight: '48px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <div style={{ fontSize: '16px', fontWeight: '600' }}>{d.date()}</div>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: cls === 'ok' ? '#22c55e' : cls === 'miss' ? '#ef4444' : '#9ca3af',
                                            marginTop: '4px'
                                        }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}


