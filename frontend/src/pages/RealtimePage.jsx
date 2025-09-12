/**
 * Realtime Page - Shows live weather data using Server-Sent Events
 * Demonstrates real-time updates without polling
 */

import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import RealtimeStream from '../components/RealtimeStream';
import { useObservatories } from '../hooks/useObservatories';

export default function RealtimePage() {
    const [selectedStation, setSelectedStation] = useState(null);
    const { getStationOptions } = useObservatories();

    return (
        <div>
            <Navbar />
            <main className="container">
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px'
                }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', color: '#111827' }}>
                            Real-time Weather Stream
                        </h1>
                        <p style={{ fontSize: '16px', color: '#6b7280', margin: '0' }}>
                            Live weather data updates using Server-Sent Events
                        </p>
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Filter by Station:
                        </label>
                        <select
                            value={selectedStation || ''}
                            onChange={(e) => setSelectedStation(e.target.value ? Number(e.target.value) : null)}
                            style={{
                                padding: '8px 12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px',
                                minWidth: '150px',
                                backgroundColor: 'white'
                            }}
                        >
                            <option value="">All Stations</option>
                            {getStationOptions().map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <RealtimeStream stationId={selectedStation} />
            </main>
        </div>
    );
}
