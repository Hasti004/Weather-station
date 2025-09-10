import React, { useMemo } from 'react';
import dayjs from 'dayjs';

export default function MissingDaysList({ month, year, availableDates }) {
    const list = useMemo(() => {
        const start = dayjs(new Date(year, month, 1));
        const end = start.endOf('month');
        const out = [];
        for (let d = start; d.isBefore(end.add(1, 'day')); d = d.add(1, 'day')) {
            const key = d.format('YYYY-MM-DD');
            if (!availableDates.has(key)) out.push(key);
        }
        return out;
    }, [month, year, availableDates]);

    if (!list.length) return null;
    return (
        <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Missing days</div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
                {list.map((d) => (
                    <li key={d}>{d}</li>
                ))}
            </ul>
        </div>
    );
}


