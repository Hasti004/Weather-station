import dayjs from 'dayjs';

export function parseDT(dateStr, timeStr) {
    const parsed = dayjs(`${dateStr} ${timeStr}`);
    return parsed.isValid() ? parsed.toDate() : new Date(NaN);
}

export function startOfDay(dt) {
    return dayjs(dt).startOf('day').toDate();
}

export function startOfWeek(dt) {
    const d = dayjs(dt);
    const weekday = (d.day() + 6) % 7; // 0 = Monday
    return d.subtract(weekday, 'day').startOf('day').toDate();
}

export function startOfMonth(dt) {
    return dayjs(dt).startOf('month').toDate();
}

export function isWithin(dt, start, end) {
    const t = dayjs(dt).valueOf();
    return t >= dayjs(start).valueOf() && t <= dayjs(end).valueOf();
}

export function formatLabel(dt, granularity) {
    const d = dayjs(dt);
    switch (granularity) {
        case '5min':
            return d.format('MMM D, HH:mm');
        case 'day':
            return d.format('YYYY-MM-DD');
        case 'week': {
            const week = Math.ceil(d.date() / 7);
            return `${d.format('YYYY')}-W${String(week).padStart(2, '0')}`;
        }
        case 'month':
            return d.format('YYYY-MM');
        default:
            return d.toString();
    }
}


