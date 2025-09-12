import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchLatest, fetchRange, fetchSeries, fetchObservatories } from '../services/api';

// Query keys for consistent caching
export const QUERY_KEYS = {
  LATEST: 'latest',
  RANGE: 'range',
  SERIES: 'series',
  OBSERVATORIES: 'observatories',
};

/**
 * Hook for fetching latest weather data with polling
 */
export function useLatestData(options = {}) {
  const {
    refetchInterval = 30000, // 30 seconds
    enabled = true,
    ...queryOptions
  } = options;

  return useQuery({
    queryKey: [QUERY_KEYS.LATEST],
    queryFn: fetchLatest,
    refetchInterval,
    enabled,
    ...queryOptions,
  });
}

/**
 * Hook for fetching historical data with smart caching
 */
export function useRangeData(stationId, startDate, endDate, options = {}) {
  const {
    enabled = true,
    ...queryOptions
  } = options;

  return useQuery({
    queryKey: [QUERY_KEYS.RANGE, stationId, startDate, endDate],
    queryFn: () => fetchRange(stationId, startDate, endDate),
    enabled: enabled && !!stationId && !!startDate && !!endDate,
    staleTime: 2 * 60 * 1000, // 2 minutes for historical data
    ...queryOptions,
  });
}

/**
 * Hook for fetching time series data with caching
 */
export function useSeriesData(stationId, minutes = 60, options = {}) {
  const {
    refetchInterval = 60000, // 1 minute for live data
    enabled = true,
    ...queryOptions
  } = options;

  return useQuery({
    queryKey: [QUERY_KEYS.SERIES, stationId, minutes],
    queryFn: () => fetchSeries(stationId, minutes),
    enabled: enabled && !!stationId,
    refetchInterval,
    staleTime: 30 * 1000, // 30 seconds for live data
    ...queryOptions,
  });
}

/**
 * Hook for fetching observatories (rarely changes)
 */
export function useObservatoriesData(options = {}) {
  return useQuery({
    queryKey: [QUERY_KEYS.OBSERVATORIES],
    queryFn: fetchObservatories,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

/**
 * Hook for prefetching data
 */
export function usePrefetchData() {
  const queryClient = useQueryClient();

  const prefetchRange = (stationId, startDate, endDate) => {
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.RANGE, stationId, startDate, endDate],
      queryFn: () => fetchRange(stationId, startDate, endDate),
      staleTime: 2 * 60 * 1000,
    });
  };

  const prefetchSeries = (stationId, minutes = 60) => {
    queryClient.prefetchQuery({
      queryKey: [QUERY_KEYS.SERIES, stationId, minutes],
      queryFn: () => fetchSeries(stationId, minutes),
      staleTime: 30 * 1000,
    });
  };

  return { prefetchRange, prefetchSeries };
}

/**
 * Hook for invalidating queries
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  const invalidateLatest = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.LATEST] });
  };

  const invalidateRange = (stationId) => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.RANGE, stationId]
    });
  };

  const invalidateSeries = (stationId) => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.SERIES, stationId]
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries();
  };

  return {
    invalidateLatest,
    invalidateRange,
    invalidateSeries,
    invalidateAll
  };
}
