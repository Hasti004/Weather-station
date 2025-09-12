/**
 * Live Dashboard component for displaying real-time weather data
 * Shows data from all weather stations with auto-refresh every 30 seconds
 */

import React, { useState, useEffect } from 'react';
import { fetchLatest, handleApiError } from '../services/api';
import { useObservatories } from '../hooks/useObservatories';

interface WeatherReading {
  station_id: number;
  reading_ts: string;
  temperature_c: number | null;
  humidity_pct: number | null;
  rainfall_mm: number | null;
  pressure_hpa: number | null;
  windspeed_ms: number | null;
  battery_pct: string | null;
  battery_voltage_v: number | null;
  temp_in_c: number | null;
  hum_in: number | null;
  rain_rate_mm_hr: number | null;
  solar_rad: number | null;
  sunrise: string | null;
  sunset: string | null;
  wind_dir: string | null;
  station_name: string;
  location: string;
}

const LiveDashboard: React.FC = () => {
  const [data, setData] = useState<WeatherReading[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { getStationName, getStationLocation } = useObservatories();

  const loadData = async () => {
    try {
      setError(null);
      const result = await fetchLatest();
      setData(result.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = () => {
    setIsLoading(true);
    loadData();
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, Number(process.env.REACT_APP_LIVE_INTERVAL_MS || 30000));
    return () => clearInterval(interval);
  }, []);

  // Always return valid JSX - never null
  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading weather data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <h3 className="text-lg font-semibold mb-2">Error Loading Data</h3>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={refresh}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const formatValue = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') {
      return value.toFixed(1);
    }
    return String(value);
  };

  const formatTimestamp = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Invalid time';
    }
  };

  const getStationDisplayName = (stationId: number): string => {
    return getStationName(stationId);
  };

  // Always return valid JSX - never null
  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading weather data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Failed to load data</h3>
              <p className="text-red-600 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">{error}</p>
              <button
                onClick={refresh}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No data available</h3>
              <p className="text-gray-600 mb-4">No weather stations are currently reporting data.</p>
              <button
                onClick={refresh}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderStationCard = (reading: any) => (
    <div key={reading.station_id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">
            {getStationDisplayName(reading.station_id)}
          </h3>
          <p className="text-sm text-gray-600">{getStationLocation(reading.station_id)}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {formatValue(reading.temperature_c)}°C
          </div>
          <div className="text-xs text-gray-500">
            {formatTimestamp(reading.reading_ts)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Humidity:</span>
            <span className="text-sm font-medium">{formatValue(reading.humidity_pct)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Wind Speed:</span>
            <span className="text-sm font-medium">{formatValue(reading.windspeed_ms)} m/s</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Pressure:</span>
            <span className="text-sm font-medium">{formatValue(reading.pressure_hpa)} hPa</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Rainfall:</span>
            <span className="text-sm font-medium">{formatValue(reading.rainfall_mm)} mm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Wind Dir:</span>
            <span className="text-sm font-medium">{formatValue(reading.wind_dir)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Battery:</span>
            <span className="text-sm font-medium">{formatValue(reading.battery_voltage_v)}V</span>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Weather Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Real-time data from weather stations • Auto-refreshes every 30 seconds
            </p>
            {lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>

          <button
            onClick={refresh}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Refreshing...
              </>
            ) : (
              <>
                <span>🔄</span>
                Refresh Now
              </>
            )}
          </button>
        </div>

        {/* Content */}
        {!data || data.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No data available</h3>
              <p className="text-gray-600 mb-4">No weather stations are currently reporting data.</p>
              <button
                onClick={refresh}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map(renderStationCard)}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Data updates automatically every 30 seconds</p>
          <p>API: {process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}</p>
        </div>
      </div>
    </div>
  );
};

export default LiveDashboard;

// Usage example:
// <LiveDashboard />
