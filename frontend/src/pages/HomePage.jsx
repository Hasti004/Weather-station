import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import StationOverviewGrid from '../components/StationOverviewGrid';
import DataAvailabilityButton from '../components/DataAvailabilityButton';
import AvailabilityModal from '../components/availability/AvailabilityModal';
import { fetchLatest, fetchSeries } from '../services/api';
import ClimateSummary from '../components/ClimateSummary';
import Footer from '../components/Footer';

async function fetchStation(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const text = (await res.text()).trim();
    const parts = text.split(',').map((p) => p.trim());
    if (parts.length !== 6) return null;
    const nums = parts.map((p) => (Number.isFinite(Number(p)) ? Number(p) : null));
    return {
        temperature_c: nums[0],
        humidity_pct: nums[1],
        rainfall_mm: nums[2],
        pressure_hpa: nums[3],
        windspeed_ms: nums[4],
        visibility_km: nums[5],
    };
}

export default function HomePage() {
    const [loading, setLoading] = useState(true);
    const [stations, setStations] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [error, setError] = useState(null);
    const [openFor, setOpenFor] = useState(null);
    const [climateData, setClimateData] = useState(null);
    const [seriesData, setSeriesData] = useState({});

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Try to fetch from API first, fallback to file-based
                try {
                    const latestResult = await fetchLatest();
                    if (latestResult && latestResult.data) {
                        const apiStations = latestResult.data.map(station => ({
                            id: station.station_id === 1 ? 'udi' : station.station_id === 2 ? 'ahm' : 'mtabu',
                            name: station.station_name || (station.station_id === 1 ? 'Udaipur' : station.station_id === 2 ? 'Ahmedabad' : 'Mount Abu'),
                            metrics: {
                                temperature_c: station.temperature_c,
                                humidity_pct: station.humidity_pct,
                                rainfall_mm: station.rainfall_mm,
                                pressure_hpa: station.pressure_hpa,
                                windspeed_ms: station.windspeed_ms,
                                visibility_km: station.visibility_km || null,
                            }
                        }));

                        if (!mounted) return;
                        setStations(apiStations);
                        setClimateData(latestResult.data);
                        setLastUpdated(new Date());

                        // Fetch series data for charts
                        const seriesPromises = apiStations.map(async (station) => {
                            try {
                                const stationId = station.id === 'udi' ? 1 : station.id === 'ahm' ? 2 : 3;
                                const seriesResult = await fetchSeries(stationId, 1440); // 24 hours
                                return { stationId, data: seriesResult.data || [] };
                            } catch (e) {
                                console.warn(`Failed to fetch series for ${station.name}:`, e);
                                return { stationId: station.id, data: [] };
                            }
                        });

                        const seriesResults = await Promise.all(seriesPromises);
                        const seriesMap = {};
                        seriesResults.forEach(({ stationId, data }) => {
                            seriesMap[stationId] = data;
                        });
                        setSeriesData(seriesMap);

                        setLoading(false);
                        return;
                    }
                } catch (apiError) {
                    console.warn('API fetch failed, falling back to file-based:', apiError);
                }

                // Fallback to file-based data
                const [ahm, udi, mtabu] = await Promise.all([
                    fetchStation(new URL('../data/ahm.txt', import.meta.url)),
                    fetchStation(new URL('../data/udi.txt', import.meta.url)),
                    fetchStation(new URL('../data/mtabu.txt', import.meta.url)),
                ]);
                if (!mounted) return;
                setStations([
                    { id: 'ahm', name: 'Ahmedabad', metrics: ahm },
                    { id: 'udi', name: 'Udaipur', metrics: udi },
                    { id: 'mtabu', name: 'Mt Abu', metrics: mtabu },
                ]);
                setLastUpdated(new Date());
            } catch (e) {
                if (!mounted) return;
                setError(e.message || 'Failed to load stations');
            } finally {
                if (!mounted) return;
                setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div style={{
            minHeight: '100vh',
            background: `
                linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4)),
                linear-gradient(135deg, #667eea 0%, #764ba2 100%)
            `,
            backgroundAttachment: 'fixed',
            position: 'relative'
        }}>
            <Navbar lastUpdated={lastUpdated} />

            <main className="home-main">
                {/* Left sidebar with station widgets */}
                <div className="station-sidebar">
                    <h2 style={{
                        margin: '0 0 20px 0',
                        color: 'white',
                        fontSize: '24px',
                        fontWeight: '600',
                        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                    }}>
                        Weather Stations
                    </h2>

                {error ? (
                        <div style={{
                            padding: '16px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                            {error}
                        </div>
                ) : loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} style={{
                                    height: '200px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    borderRadius: '12px',
                                    animation: 'pulse 2s infinite'
                                }} />
                        ))}
                    </div>
                ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {stations.map((station) => (
                                <div key={station.id} style={{
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '16px',
                                    padding: '20px',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    transform: 'translateY(0)',
                                    transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                                }}
                                onClick={() => window.location.href = `/station/${station.id}`}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: '12px',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '16px'
                                        }}>
                                            {station.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                                                {station.name}
                                            </h3>
                                            <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                                                Live Weather Data
                                            </p>
                                        </div>
                                    </div>

                                    {station.metrics && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Temp:</span>
                                                <span style={{ fontWeight: '600', color: '#1f2937' }}>
                                                    {station.metrics.temperature_c ?? '—'}°C
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Humidity:</span>
                                                <span style={{ fontWeight: '600', color: '#1f2937' }}>
                                                    {station.metrics.humidity_pct ?? '—'}%
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Wind:</span>
                                                <span style={{ fontWeight: '600', color: '#1f2937' }}>
                                                    {station.metrics.windspeed_ms ?? '—'} m/s
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '12px', color: '#6b7280' }}>Pressure:</span>
                                                <span style={{ fontWeight: '600', color: '#1f2937' }}>
                                                    {station.metrics.pressure_hpa ?? '—'} hPa
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <DataAvailabilityButton
                                        stationId={station.id}
                                        stationName={station.name}
                                        className="station-data-button"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Main content area */}
                <div className="main-content">
                    <div style={{ marginBottom: '40px' }}>
                        <h1 style={{
                            fontSize: '48px',
                            fontWeight: '700',
                            color: 'white',
                            margin: '0 0 16px 0',
                            textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
                        }}>
                            Weather Dashboard
                        </h1>
                        <p style={{
                            fontSize: '20px',
                            color: 'rgba(255, 255, 255, 0.9)',
                            margin: '0',
                            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                        }}>
                            Real-time weather monitoring across Rajasthan and Gujarat
                        </p>
                    </div>

                    {/* Climate Summary and Charts */}
                    {!loading && !error && (
                        <ClimateSummary
                            climateData={climateData}
                            seriesData={seriesData}
                        />
                    )}
                </div>
            </main>

            {/* Footer */}
            <Footer />

            {/* Modals */}
            {openFor && (
                <AvailabilityModal
                    id={openFor}
                    isOpen={true}
                    onClose={() => setOpenFor(null)}
                    onApplyRange={() => { /* Home does not change filters, just visibility */ }}
                />
            )}

            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .home-main {
                    display: flex;
                    min-height: calc(100vh - 60px);
                    position: relative;
                    z-index: 1;
                }

                .station-sidebar {
                    width: 320px;
                    min-height: 100%;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-right: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
                }

                .main-content {
                    flex: 1;
                    padding: 20px 40px;
                    display: flex;
                    flex-direction: column;
                }

                @media (max-width: 768px) {
                    .home-main {
                        flex-direction: column;
                    }

                    .station-sidebar {
                        width: 100%;
                        min-height: auto;
                        border-right: none;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
                    }

                    .main-content {
                        padding: 20px;
                    }

                    .main-content h1 {
                        font-size: 32px !important;
                    }

                    .main-content p {
                        font-size: 16px !important;
                    }
                }

                @media (max-width: 480px) {
                    .station-sidebar {
                        padding: 16px;
                    }

                    .main-content {
                        padding: 16px;
                    }

                    .main-content h1 {
                        font-size: 28px !important;
                    }
                }
            `}</style>
        </div>
    );
}


