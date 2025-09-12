/**
 * Realtime Stream Component
 * Uses EventSource to receive real-time weather data updates
 * Displays live data in cards and charts that update automatically
 */

import React, { useState, useEffect, useRef } from 'react';
import { connectStream, fetchLatest, handleApiError } from '../services/api';
import { useObservatories } from '../hooks/useObservatories';
import StatCard from './StatCard';
import ErrorBanner from './ErrorBanner';
import { FiThermometer, FiDroplet, FiCloudRain, FiTrendingDown, FiWind, FiEye } from 'react-icons/fi';

export default function RealtimeStream({ stationId = null, showCharts = true }) {
    const [data, setData] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const { getStationName, getStationLocation } = useObservatories();

    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // Format value for display
    const formatValue = (value) => {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'number') {
            return value.toFixed(1);
        }
        return String(value);
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
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

    // Handle incoming stream data
    const handleStreamMessage = (message) => {
        try {
            setData(prevData => {
                // If we have station-specific data, update that station
                if (message.station_id) {
                    const updated = prevData.filter(item => item.station_id !== message.station_id);
                    return [...updated, message];
                }
                // If we have all stations data, replace the entire array
                if (Array.isArray(message)) {
                    return message;
                }
                return prevData;
            });
            setLastUpdate(new Date());
            setError(null);
            setIsConnected(true);
            setConnectionStatus('connected');
            reconnectAttempts.current = 0;
        } catch (err) {
            console.error('Error processing stream message:', err);
            setError('Failed to process incoming data');
        }
    };

    // Connect to stream
    const connectToStream = () => {
        try {
            // Close existing connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            setConnectionStatus('connecting');
            eventSourceRef.current = connectStream(stationId, handleStreamMessage);

            eventSourceRef.current.onopen = () => {
                setIsConnected(true);
                setConnectionStatus('connected');
                setError(null);
                reconnectAttempts.current = 0;
            };

            eventSourceRef.current.onerror = (event) => {
                console.error('EventSource error:', event);
                setIsConnected(false);
                setConnectionStatus('error');

                // Attempt to reconnect
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);

                    setConnectionStatus(`reconnecting (${reconnectAttempts.current}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectToStream();
                    }, delay);
                } else {
                    setError('Connection failed after multiple attempts. Please refresh the page.');
                    setConnectionStatus('failed');
                }
            };

        } catch (err) {
            setError(handleApiError(err));
            setConnectionStatus('failed');
        }
    };

    // Disconnect from stream
    const disconnectFromStream = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setIsConnected(false);
        setConnectionStatus('disconnected');
    };

    // Load initial data and connect to stream
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const result = await fetchLatest();
                setData(result.data || []);
                setLastUpdate(new Date());
            } catch (err) {
                setError(handleApiError(err));
            }
        };

        loadInitialData();
        connectToStream();

        return () => {
            disconnectFromStream();
        };
    }, [stationId]);

    // Render connection status indicator
    const renderConnectionStatus = () => {
        const statusColors = {
            connected: '#10b981',
            connecting: '#f59e0b',
            reconnecting: '#f59e0b',
            error: '#ef4444',
            failed: '#ef4444',
            disconnected: '#6b7280'
        };

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                padding: '8px 12px',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
            }}>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: statusColors[connectionStatus] || '#6b7280'
                }} />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    {connectionStatus === 'connected' && 'Live data stream connected'}
                    {connectionStatus === 'connecting' && 'Connecting to stream...'}
                    {connectionStatus === 'reconnecting' && `Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`}
                    {connectionStatus === 'error' && 'Connection error'}
                    {connectionStatus === 'failed' && 'Connection failed'}
                    {connectionStatus === 'disconnected' && 'Disconnected'}
                </span>
                {lastUpdate && (
                    <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: 'auto' }}>
                        Last update: {lastUpdate.toLocaleString()}
                    </span>
                )}
            </div>
        );
    };

    // Render station card
    const renderStationCard = (reading) => (
        <div key={reading.station_id} style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 4px 0', color: '#111827' }}>
                        {getStationName(reading.station_id) || `Station ${reading.station_id}`}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
                        {getStationLocation(reading.station_id) || 'Weather Station'}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                        {formatValue(reading.temperature_c)}°C
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {formatTimestamp(reading.reading_ts)}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Humidity:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatValue(reading.humidity_pct)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Wind Speed:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatValue(reading.windspeed_ms)} m/s</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Pressure:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatValue(reading.pressure_hpa)} hPa</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Rainfall:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatValue(reading.rainfall_mm)} mm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Wind Dir:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatValue(reading.wind_dir)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', color: '#6b7280' }}>Battery:</span>
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{formatValue(reading.battery_voltage_v)}V</span>
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 8px 0', color: '#111827' }}>
                    Real-time Weather Stream
                </h2>
                <p style={{ fontSize: '16px', color: '#6b7280', margin: '0' }}>
                    Live weather data updates via Server-Sent Events
                </p>
            </div>

            {renderConnectionStatus()}

            {error && (
                <ErrorBanner message={error} />
            )}

            {data.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#6b7280',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                }}>
                    <p style={{ fontSize: '16px', margin: '0 0 16px 0' }}>No data available</p>
                    <button
                        onClick={connectToStream}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        Reconnect
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                    {data.map(renderStationCard)}
                </div>
            )}

            <div style={{
                marginTop: '20px',
                padding: '12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center'
            }}>
                <p style={{ margin: '0' }}>
                    Real-time data stream • Updates automatically •
                    {stationId ? ` Station: ${getStationName(stationId) || stationId}` : ' All stations'}
                </p>
            </div>
        </div>
    );
}
