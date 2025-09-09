// Lightweight time utilities using dayjs in local time (Asia/Kolkata expected)
import dayjs from 'dayjs';

export type Granularity = '5min' | 'day' | 'week' | 'month';

export function parseDT(dateStr: string, timeStr: string): Date {
    // date: YYYY-MM-DD, time: HH:mm
    const parsed = dayjs(`${dateStr} ${timeStr}`);
    return parsed.isValid() ? parsed.toDate() : new Date(NaN);
}

export function startOfDay(dt: Date): Date {
    return dayjs(dt).startOf('day').toDate();
}

export function startOfWeek(dt: Date): Date {
    // ISO week start Monday: mimic by subtracting day offset
    const d = dayjs(dt);
    const weekday = (d.day() + 6) % 7; // 0 = Monday
    return d.subtract(weekday, 'day').startOf('day').toDate();
}

export function startOfMonth(dt: Date): Date {
    return dayjs(dt).startOf('month').toDate();
}

export function isWithin(dt: Date, start: Date, end: Date): boolean {
    const t = dayjs(dt).valueOf();
    return t >= dayjs(start).valueOf() && t <= dayjs(end).valueOf();
}

export function formatLabel(dt: Date, granularity: Granularity): string {
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


