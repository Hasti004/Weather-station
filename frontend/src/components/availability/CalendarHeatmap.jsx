import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';

export default function CalendarHeatmap({ month, year, availableDates, minDate, maxDate, onRangeSelect }) {
    const start = useMemo(() => dayjs(new Date(year, month, 1)), [month, year]);
    const end = useMemo(() => start.endOf('month'), [start]);
    const firstWeekStart = start.startOf('week'); // Sunday-start grid
    const weeks = useMemo(() => {
        const cells = [];
        let cursor = firstWeekStart;
        for (let i = 0; i < 42; i++) {
            cells.push(cursor);
            cursor = cursor.add(1, 'day');
        }
        return cells;
    }, [firstWeekStart]);

    const [selStart, setSelStart] = useState(null);
    const [selEnd, setSelEnd] = useState(null);

    function classify(d) {
        const inMonth = d.month() === start.month();
        if (!inMonth) return 'out';
        const within = (!minDate || d.toDate() >= minDate) && (!maxDate || d.toDate() <= maxDate);
        if (!within) return 'out';
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
        } else {
            setSelStart(d);
            setSelEnd(null);
        }
    }

    const isSelected = (d) => selStart && selEnd && d.isAfter(selStart.subtract(1, 'day')) && d.isBefore(selEnd.add(1, 'day'));

    return (
        <div className="av-grid">
            <div className="cal" role="grid" aria-label="availability-calendar">
                {weeks.map((d, i) => {
                    const cls = classify(d);
                    const selected = isSelected(d);
                    return (
                        <div
                            key={i}
                            role="gridcell"
                            tabIndex={0}
                            onClick={() => onClickCell(d)}
                            className={`cell ${cls}${selected ? ' sel' : ''}`}
                            aria-label={`${d.format('YYYY-MM-DD')}: ${cls === 'ok' ? 'available' : cls === 'miss' ? 'missing' : 'out of month'}`}
                        >
                            {d.date()}
                            <span className="dot" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


