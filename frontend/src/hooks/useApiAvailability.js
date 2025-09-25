import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { fetchAvailability, fetchRange, fetchObservatories } from '../services/api';

// Station ID mapping
const STATION_ID_MAP = {
    'ahm': 2,
    'udi': 1,
    'mtabu': 3
};

// Cache for availability data
const availabilityCache = new Map();

export function useApiAvailability(stationId, month, year) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableDates, setAvailableDates] = useState(new Set());
    const [minDate, setMinDate] = useState(null);
    const [maxDate, setMaxDate] = useState(null);
    const [stationName, setStationName] = useState('');

    // Calculate date range for the month
    const dateRange = useMemo(() => {
        const start = dayjs(new Date(year, month, 1)).startOf('day');
        const end = start.endOf('month');
        return {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
        };
    }, [month, year]);

    // Get station numeric ID
    const numericStationId = useMemo(() => {
        return STATION_ID_MAP[stationId];
    }, [stationId]);

    // Load availability data for the month
    useEffect(() => {
        if (!numericStationId) {
            setError('Invalid station ID');
            return;
        }

        const cacheKey = `${stationId}_${dateRange.start}_${dateRange.end}`;

        // Check cache first
        if (availabilityCache.has(cacheKey)) {
            const cached = availabilityCache.get(cacheKey);
            setAvailableDates(cached.availableDates);
            setMinDate(cached.minDate);
            setMaxDate(cached.maxDate);
            setStationName(cached.stationName);
            return;
        }

        const loadAvailability = async () => {
            setLoading(true);
            setError(null);

            try {
                // Try the new availability endpoint first
                try {
                    // Convert 0-based month to 1-based for backend
                    const backendMonth = month + 1;
                    const availabilityResponse = await fetchAvailability(numericStationId, year, backendMonth);

                    if (availabilityResponse && availabilityResponse.days) {
                        const { days } = availabilityResponse;

                        // Convert to Set of available dates
                        const dates = new Set();
                        days.forEach(({ day, status }) => {
                            if (status === 'available') {
                                const dateStr = `${year}-${backendMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                dates.add(dateStr);
                            }
                        });

                        // Get station name from observatories
                        try {
                            const observatoriesResponse = await fetchObservatories();
                            if (observatoriesResponse.observatories && observatoriesResponse.observatories.length > 0) {
                                const station = observatoriesResponse.observatories.find(s => s.station_id === numericStationId);
                                if (station) {
                                    setStationName(station.station_name);
                                }
                            }
                        } catch (err) {
                            console.warn('Failed to fetch station name:', err);
                            setStationName(stationId.toUpperCase());
                        }

                        // Cache the result
                        const cacheData = {
                            availableDates: dates,
                            minDate: null, // Will be set by overall range loading
                            maxDate: null, // Will be set by overall range loading
                            stationName: stationName || stationId.toUpperCase()
                        };
                        availabilityCache.set(cacheKey, cacheData);

                        setAvailableDates(dates);
                        setError(null);
                        setLoading(false);
                        return;
                    }
                } catch (availabilityErr) {
                    console.warn('Availability endpoint failed, falling back to range endpoint:', availabilityErr);
                }

                // Fallback to range endpoint
                const response = await fetchRange(numericStationId, dateRange.start, dateRange.end);

                if (!response.data || response.data.length === 0) {
                    console.warn(`No data available for station ${numericStationId} in range ${dateRange.start} to ${dateRange.end}`);
                    setError('No data available for this range');
                    setAvailableDates(new Set());
                    return;
                }

                // Process the data to determine available dates
                const dates = new Set();
                let min = null;
                let max = null;

                response.data.forEach(reading => {
                    if (reading.reading_ts) {
                        const date = dayjs(reading.reading_ts).format('YYYY-MM-DD');
                        dates.add(date);

                        const readingDate = dayjs(reading.reading_ts).toDate();
                        if (!min || readingDate < min) min = readingDate;
                        if (!max || readingDate > max) max = readingDate;
                    }
                });

                // Get station name from observatories
                try {
                    const observatoriesResponse = await fetchObservatories();
                    if (observatoriesResponse.observatories && observatoriesResponse.observatories.length > 0) {
                        const station = observatoriesResponse.observatories.find(s => s.station_id === numericStationId);
                        if (station) {
                            setStationName(station.station_name);
                        }
                    }
                } catch (err) {
                    console.warn('Failed to fetch station name:', err);
                    setStationName(stationId.toUpperCase());
                }

                // Cache the result
                const cacheData = {
                    availableDates: dates,
                    minDate: min,
                    maxDate: max,
                    stationName: stationName || stationId.toUpperCase()
                };
                availabilityCache.set(cacheKey, cacheData);

                setAvailableDates(dates);
                setMinDate(min);
                setMaxDate(max);
                setError(null); // Clear any previous errors

            } catch (err) {
                console.error('Error loading availability:', err);
                setError('Failed to fetch data. Please try again.');
                setAvailableDates(new Set());
            } finally {
                setLoading(false);
            }
        };

        loadAvailability();
    }, [stationId, numericStationId, dateRange.start, dateRange.end, stationName]);

    // Load overall date range for the station (for year/month selectors)
    useEffect(() => {
        if (!numericStationId) return;

        const loadOverallRange = async () => {
            try {
                // Get a broader date range to find min/max dates
                const now = dayjs();
                const oneYearAgo = now.subtract(1, 'year');

                const response = await fetchRange(
                    numericStationId,
                    oneYearAgo.format('YYYY-MM-DD'),
                    now.format('YYYY-MM-DD')
                );

                if (response.data && response.data.length > 0) {
                    let min = null;
                    let max = null;

                    response.data.forEach(reading => {
                        if (reading.reading_ts) {
                            const readingDate = dayjs(reading.reading_ts).toDate();
                            if (!min || readingDate < min) min = readingDate;
                            if (!max || readingDate > max) max = readingDate;
                        }
                    });

                    if (min && max) {
                        setMinDate(min);
                        setMaxDate(max);
                    }
                }
            } catch (err) {
                console.warn('Failed to load overall date range:', err);
            }
        };

        loadOverallRange();
    }, [numericStationId]);

    return {
        loading,
        error,
        availableDates,
        minDate,
        maxDate,
        stationName,
        // Helper function to check if a specific date has data
        hasDataForDate: (date) => {
            const dateStr = dayjs(date).format('YYYY-MM-DD');
            return availableDates.has(dateStr);
        },
        // Helper function to get data for a date range
        getDataForRange: async (startDate, endDate) => {
            try {
                const response = await fetchRange(numericStationId, startDate, endDate);
                return response.data || [];
            } catch (err) {
                console.error('Error fetching data for range:', err);
                return [];
            }
        }
    };
}
