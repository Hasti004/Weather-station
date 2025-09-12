/**
 * Data processing utilities for performance optimization
 */

/**
 * Downsample time series data to reduce chart rendering load
 * @param {Array} data - Array of time series data points
 * @param {number} targetPoints - Target number of points (default: 500)
 * @returns {Array} Downsampled data
 */
export function downsampleTimeSeries(data, targetPoints = 500) {
  if (!data || data.length <= targetPoints) {
    return data;
  }

  const step = Math.ceil(data.length / targetPoints);
  const downsampled = [];

  for (let i = 0; i < data.length; i += step) {
    downsampled.push(data[i]);
  }

  // Always include the last point
  if (downsampled[downsampled.length - 1] !== data[data.length - 1]) {
    downsampled.push(data[data.length - 1]);
  }

  return downsampled;
}

/**
 * Calculate moving average for smoothing data
 * @param {Array} data - Array of numeric values
 * @param {number} windowSize - Window size for moving average
 * @returns {Array} Smoothed data
 */
export function calculateMovingAverage(data, windowSize = 5) {
  if (!data || data.length < windowSize) {
    return data;
  }

  const smoothed = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length, start + windowSize);
    const window = data.slice(start, end);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    smoothed.push(average);
  }

  return smoothed;
}

/**
 * Aggregate data by time intervals for better performance
 * @param {Array} data - Array of data points with timestamps
 * @param {string} interval - Time interval ('5min', '15min', '1hour', '1day')
 * @param {string} metric - Metric to aggregate
 * @param {string} operation - Aggregation operation ('avg', 'sum', 'max', 'min')
 * @returns {Array} Aggregated data
 */
export function aggregateDataByInterval(data, interval, metric, operation = 'avg') {
  if (!data || data.length === 0) {
    return [];
  }

  const intervalMs = getIntervalMs(interval);
  const aggregated = new Map();

  data.forEach(point => {
    if (!point[metric] && point[metric] !== 0) return;

    const timestamp = new Date(point.reading_ts || point.timestamp);
    const intervalKey = Math.floor(timestamp.getTime() / intervalMs) * intervalMs;

    if (!aggregated.has(intervalKey)) {
      aggregated.set(intervalKey, {
        timestamp: new Date(intervalKey),
        values: [],
        count: 0
      });
    }

    const bucket = aggregated.get(intervalKey);
    bucket.values.push(point[metric]);
    bucket.count++;
  });

  return Array.from(aggregated.values()).map(bucket => {
    const value = calculateAggregation(bucket.values, operation);
    return {
      timestamp: bucket.timestamp,
      [metric]: value,
      count: bucket.count
    };
  });
}

/**
 * Get interval in milliseconds
 */
function getIntervalMs(interval) {
  const intervals = {
    '5min': 5 * 60 * 1000,
    '15min': 15 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000,
  };
  return intervals[interval] || 5 * 60 * 1000;
}

/**
 * Calculate aggregation operation
 */
function calculateAggregation(values, operation) {
  switch (operation) {
    case 'sum':
      return values.reduce((sum, val) => sum + val, 0);
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    case 'avg':
    default:
      return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
}

/**
 * Memoize expensive calculations
 * @param {Function} fn - Function to memoize
 * @param {Array} deps - Dependencies array
 * @returns {Function} Memoized function
 */
export function createMemoizedCalculator(fn, deps) {
  let cache = new Map();
  let lastDeps = null;

  return (...args) => {
    const key = JSON.stringify(args);

    // Check if dependencies changed
    const depsChanged = !lastDeps || deps.some((dep, i) => dep !== lastDeps[i]);

    if (depsChanged) {
      cache.clear();
      lastDeps = [...deps];
    }

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Debounce function calls to prevent excessive API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls to limit execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Virtual scrolling helper for large datasets
 * @param {Array} items - Array of items
 * @param {number} containerHeight - Container height in pixels
 * @param {number} itemHeight - Item height in pixels
 * @param {number} scrollTop - Current scroll position
 * @returns {Object} Visible items and offsets
 */
export function getVisibleItems(items, containerHeight, itemHeight, scrollTop) {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount, items.length);

  return {
    items: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
    totalHeight: items.length * itemHeight,
    offsetY: startIndex * itemHeight
  };
}
