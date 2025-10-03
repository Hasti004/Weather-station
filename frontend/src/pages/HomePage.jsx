import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import AvailabilityModal from '../components/availability/AvailabilityModal';
import { fetchSeries } from '../services/api';
import { useLiveAll } from '../live/LiveDataProvider';
import { getLatest } from '../services/api';
import ClimateSummary from '../components/ClimateSummary';
import { Footer } from '../components/Footer';
import { FiThermometer, FiDroplet, FiCloudRain, FiTrendingDown, FiWind } from 'react-icons/fi';

export default function HomePage() {
    const { list, bySlug, lastUpdated, loading, error } = useLiveAll();
    const [openFor, setOpenFor] = useState(null);
    const [climateData, setClimateData] = useState(null);
    const [seriesData, setSeriesData] = useState({});
    const [manualRefresh, setManualRefresh] = useState(false);

    // Debug logging
    console.log('[HomePage] Live data:', {
        stations: Object.keys(bySlug).length,
        loading,
        error: !!error,
        lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'never',
        stationData: Object.keys(bySlug).map(slug => ({
            slug,
            temp: bySlug[slug]?.temperature_c,
            humidity: bySlug[slug]?.humidity_pct,
            timestamp: bySlug[slug]?.reading_ts
        })),
        rawData: list
    });

    // Additional debugging for data flow
    console.log('[HomePage] bySlug object:', bySlug);
    console.log('[HomePage] list array:', list);
    console.log('[HomePage] loading state:', loading);
    console.log('[HomePage] error state:', error);

    // Get the three main stations from live data
    const ahm = bySlug.ahm;
    const udi = bySlug.udi;
    const mtabu = bySlug.mtabu;

    // Convert live data to the format expected by the UI
    const stations = [
        ahm ? {
            id: 'ahm',
            name: ahm.name || 'Ahmedabad',
            metrics: {
                temperature_c: ahm.temperature_c,
                humidity_pct: ahm.humidity_pct,
                rainfall_mm: ahm.rainfall_mm,
                pressure_hpa: ahm.pressure_hpa,
                windspeed_ms: ahm.windspeed_ms,
            }
        } : null,
        udi ? {
            id: 'udi',
            name: udi.name || 'Udaipur',
            metrics: {
                temperature_c: udi.temperature_c,
                humidity_pct: udi.humidity_pct,
                rainfall_mm: udi.rainfall_mm,
                pressure_hpa: udi.pressure_hpa,
                windspeed_ms: udi.windspeed_ms,
            }
        } : null,
        mtabu ? {
            id: 'mtabu',
            name: mtabu.name || 'Mount Abu',
            metrics: {
                temperature_c: mtabu.temperature_c,
                humidity_pct: mtabu.humidity_pct,
                rainfall_mm: mtabu.rainfall_mm,
                pressure_hpa: mtabu.pressure_hpa,
                windspeed_ms: mtabu.windspeed_ms,
            }
        } : null
    ].filter(Boolean);

    console.log('[HomePage] Processed stations:', stations);

    // Debug temperature values specifically
    console.log('[HomePage] Temperature values:', {
        ahm_temp: ahm?.temperature_c,
        udi_temp: udi?.temperature_c,
        mtabu_temp: mtabu?.temperature_c,
        stations_temp: stations.map(s => ({ id: s.id, temp: s.metrics?.temperature_c }))
    });

    // Load climate data and series data on mount
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Set climate data from live data
                setClimateData(list);

                // Load series data for charts
                const seriesPromises = stations.map(async (station) => {
                    try {
                        const stationId = station.id === 'udi' ? 1 : station.id === 'ahm' ? 2 : 3;
                        const seriesResult = await fetchSeries(stationId, 1440);
                        return { stationId, data: seriesResult.data || [] };
                    } catch (e) {
                        console.warn(`Failed to fetch series for ${station.name}:`, e);
                        return { stationId: station.id, data: [] };
                    }
                });
                const seriesResults = await Promise.all(seriesPromises);
                const seriesMap = {};
                seriesResults.forEach(({ stationId, data }) => { seriesMap[stationId] = data; });
                setSeriesData(seriesMap);
            } catch (e) {
                if (!mounted) return;
                console.warn('Failed to load climate/series data:', e);
            }
        })();
        return () => { mounted = false; };
    }, [list, stations]);

    return (
        <div style={{
            minHeight: '100vh',
            background: `
                linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.4)),
                linear-gradient(135deg, #667eea 0%, #764ba2 100%)
            `,
            backgroundAttachment: 'fixed',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Navbar lastUpdated={lastUpdated ? new Date(lastUpdated) : null} />

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

                    <div style={{
                        marginBottom: '20px',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.8)',
                        textAlign: 'center'
                    }}>
                        {lastUpdated ? (
                            <>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</>
                        ) : (
                            <>Loading live data...</>
                        )}
                        {loading && <div style={{ marginTop: '4px', fontSize: '10px' }}>🔄 Updating...</div>}

                        {/* Debug info */}
                        <div style={{ marginTop: '8px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)' }}>
                            Stations: {Object.keys(bySlug).length} | Data: {list.length}
                        </div>

                        {/* Temperature debug */}
                        <div style={{ marginTop: '4px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)' }}>
                            Temps: Ahm={ahm?.temperature_c || 'N/A'}°C | Udi={udi?.temperature_c || 'N/A'}°C | Abu={mtabu?.temperature_c || 'N/A'}°C
                        </div>

                        {/* Raw data debug */}
                        <div style={{ marginTop: '4px', fontSize: '9px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '300px', wordBreak: 'break-all' }}>
                            Raw: {JSON.stringify(list.slice(0, 1))}
                        </div>

                        <button
                            onClick={async () => {
                                setManualRefresh(true);
                                try {
                                    const result = await getLatest();
                                    console.log('[HomePage] Manual refresh result:', result);
                                    alert(`Manual refresh successful! Got ${result.data?.length || 0} stations. Check console for details.`);
                                } catch (err) {
                                    console.error('[HomePage] Manual refresh failed:', err);
                                    alert(`Manual refresh failed: ${err.message}`);
                                } finally {
                                    setManualRefresh(false);
                                }
                            }}
                            disabled={manualRefresh}
                            style={{
                                marginTop: '8px',
                                padding: '4px 8px',
                                fontSize: '10px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: manualRefresh ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {manualRefresh ? 'Refreshing...' : '🔄 Refresh'}
                        </button>
                    </div>

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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {stations.map((station) => (
                                <div key={station.id} style={{
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    transform: 'translateY(0)',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
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
                                                <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                                                    {station.name}
                                                </h3>
                                                <p style={{ margin: '0', fontSize: '14px', color: '#6b7280' }}>
                                                    Live Weather Data
                                                </p>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/station/${station.id}`}
                                            style={{
                                                color: '#3b82f6',
                                                textDecoration: 'none',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                padding: '8px 16px',
                                                borderRadius: '6px',
                                                border: '1px solid #3b82f6',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.background = '#3b82f6';
                                                e.target.style.color = 'white';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.background = 'transparent';
                                                e.target.style.color = '#3b82f6';
                                            }}>
                                            View Details →
                                        </Link>
                                    </div>

                                    {station.metrics && (
                                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                            <StatCard
                                                icon={FiThermometer}
                                                label="Temperature"
                                                value={station.metrics.temperature_c ?? '—'}
                                                unit="°C"
                                            />
                                            <StatCard
                                                icon={FiDroplet}
                                                label="Humidity"
                                                value={station.metrics.humidity_pct ?? '—'}
                                                unit="%"
                                            />
                                            <StatCard
                                                icon={FiCloudRain}
                                                label="Rainfall"
                                                value={station.metrics.rainfall_mm ?? '—'}
                                                unit="mm"
                                            />
                                            <StatCard
                                                icon={FiTrendingDown}
                                                label="Pressure"
                                                value={station.metrics.pressure_hpa ?? '—'}
                                                unit="hPa"
                                            />
                                            <StatCard
                                                icon={FiWind}
                                                label="Wind Speed"
                                                value={station.metrics.windspeed_ms ?? '—'}
                                                unit="m/s"
                                            />
                                        </div>
                                    )}

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

                    {/* Scrollable content area */}
                    <div className="scrollable-content">
                        {/* Climate Summary and Charts */}
                        {!loading && !error && (
                            <ClimateSummary
                                climateData={climateData}
                                seriesData={seriesData}
                            />
                        )}

                        {/* Additional content sections */}
                        <div className="content-sections">
                            <div className="content-section">
                                <h2 style={{
                                    fontSize: '28px',
                                    fontWeight: '600',
                                    color: 'white',
                                    margin: '40px 0 20px 0',
                                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                                }}>
                                    Live Weather Data
                                </h2>
                                <p style={{
                                    fontSize: '16px',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    lineHeight: '1.6',
                                    margin: '0 0 30px 0'
                                }}>
                                    Our weather monitoring stations provide real-time meteorological data
                                    including temperature, humidity, rainfall, atmospheric pressure, and wind speed.
                                    Data is updated every 30 seconds to ensure accuracy and reliability.
                                </p>
                            </div>

                            <div className="content-section">
                                <h2 style={{
                                    fontSize: '28px',
                                    fontWeight: '600',
                                    color: 'white',
                                    margin: '40px 0 20px 0',
                                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                                }}>
                                    Station Coverage
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                    }}>
                                        <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '18px' }}>Ahmedabad</h3>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0', fontSize: '14px' }}>
                                            Main monitoring station covering Gujarat region
                                        </p>
                                    </div>
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                    }}>
                                        <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '18px' }}>Udaipur</h3>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0', fontSize: '14px' }}>
                                            Rajasthan region weather monitoring
                                        </p>
                                    </div>
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        padding: '20px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                    }}>
                                        <h3 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '18px' }}>Mount Abu</h3>
                                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0', fontSize: '14px' }}>
                                            Hill station meteorological data
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="content-section">
                                <h2 style={{
                                    fontSize: '28px',
                                    fontWeight: '600',
                                    color: 'white',
                                    margin: '40px 0 20px 0',
                                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                                }}>
                                    Data Features
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px' }}>🌡️</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Temperature Monitoring</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px' }}>💧</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Humidity Tracking</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px' }}>🌧️</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Rainfall Measurement</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px' }}>📊</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Pressure Analysis</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px' }}>💨</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Wind Speed Data</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px' }}>📈</span>
                                        <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Historical Charts</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Scrollable Updates Section */}
            <div className="updates-section">
                <h2 className="updates-title">Recent Updates & Weather Logs</h2>
                <div className="updates-rail" role="region" aria-label="Recent updates">
                    <div className="updates-fade-left" aria-hidden="true"></div>
                    <div className="updates-fade-right" aria-hidden="true"></div>
                    <div
                        className="updates-cards"
                        tabIndex="0"
                        role="list"
                        onKeyDown={(e) => {
                            const container = e.currentTarget;
                            const cardWidth = 300; // Card width + gap
                            if (e.key === 'ArrowLeft') {
                                e.preventDefault();
                                container.scrollBy({ left: -cardWidth, behavior: 'smooth' });
                            } else if (e.key === 'ArrowRight') {
                                e.preventDefault();
                                container.scrollBy({ left: cardWidth, behavior: 'smooth' });
                            }
                        }}
                    >
                        {[
                            {
                                title: "Weather Station Maintenance",
                                description: "Scheduled maintenance completed on all three monitoring stations. All systems operating normally.",
                                date: "2025-01-15"
                            },
                            {
                                title: "Data Collection Update",
                                description: "Enhanced data collection frequency to every 30 seconds for improved accuracy.",
                                date: "2025-01-14"
                            },
                            {
                                title: "New Monitoring Features",
                                description: "Added real-time alerts for extreme weather conditions across all stations.",
                                date: "2025-01-13"
                            },
                            {
                                title: "System Performance Report",
                                description: "Monthly performance report shows 99.8% uptime across all weather monitoring systems.",
                                date: "2025-01-12"
                            },
                            {
                                title: "Weather Pattern Analysis",
                                description: "Latest analysis reveals interesting temperature patterns in the Mount Abu region.",
                                date: "2025-01-11"
                            },
                            {
                                title: "Station Calibration Complete",
                                description: "Quarterly calibration completed for all sensors. Data accuracy improved by 15%.",
                                date: "2025-01-10"
                            },
                            {
                                title: "Network Optimization",
                                description: "Improved data transmission reliability with new network protocols.",
                                date: "2025-01-09"
                            },
                            {
                                title: "Sensor Upgrade",
                                description: "Temperature sensors upgraded to provide more accurate readings.",
                                date: "2025-01-08"
                            }
                        ].map((update, index) => (
                            <div key={index} className="update-card" role="listitem" tabIndex="0">
                                <h3 className="update-title">{update.title}</h3>
                                <p className="update-description">{update.description}</p>
                                <div className="update-date">{update.date}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

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
                    flex: 1;
                    min-height: 0;
                    position: relative;
                    z-index: 1;
                }

                .station-sidebar {
                    width: 320px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-right: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
                    overflow-y: auto;
                    flex-shrink: 0;
                }

                .main-content {
                    flex: 1;
                    padding: 20px 40px;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    overflow: hidden;
                }

                .scrollable-content {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 10px;
                    padding-bottom: 40px;
                    min-height: 0;
                }

                .scrollable-content::-webkit-scrollbar {
                    width: 8px;
                }

                .scrollable-content::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }

                .scrollable-content::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 4px;
                }

                .scrollable-content::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.5);
                }

                .content-sections {
                    margin-top: 20px;
                }

                .content-section {
                    margin-bottom: 40px;
                }

                /* Updates Section */
                .updates-section {
                    padding: 40px 0;
                    background: rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .updates-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: white;
                    margin: 0 0 20px 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                    text-align: center;
                }

                .updates-rail {
                    position: relative;
                    overflow: hidden;
                }

                .updates-fade-left,
                .updates-fade-right {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 40px;
                    z-index: 2;
                    pointer-events: none;
                }

                .updates-fade-left {
                    left: 0;
                    background: linear-gradient(90deg, rgba(255, 255, 255, 0.1), transparent);
                }

                .updates-fade-right {
                    right: 0;
                    background: linear-gradient(270deg, rgba(255, 255, 255, 0.1), transparent);
                }

                .updates-cards {
                    display: flex;
                    gap: 20px;
                    padding: 20px;
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }

                .updates-cards::-webkit-scrollbar {
                    display: none;
                }

                .updates-cards:focus {
                    outline: 2px solid #3b82f6;
                    outline-offset: 2px;
                }

                .update-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    min-width: 280px;
                    max-width: 320px;
                    scroll-snap-align: start;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    flex-shrink: 0;
                }

                .update-card:hover,
                .update-card:focus {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
                    outline: 2px solid #3b82f6;
                    outline-offset: 2px;
                }

                .update-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0 0 8px 0;
                }

                .update-description {
                    font-size: 14px;
                    color: #64748b;
                    margin: 0 0 12px 0;
                    line-height: 1.4;
                }

                .update-date {
                    font-size: 12px;
                    color: #9ca3af;
                    font-weight: 500;
                }

                /* Footer Styles */
                .homepage-footer {
                    background: linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);
                    color: #334155;
                    padding: 24px 20px;
                    margin-top: auto;
                    border-top: 1px solid #e2e8f0;
                }

                .footer-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }

                .footer-left p {
                    margin: 0;
                    font-size: 14px;
                    color: #64748b;
                }

                .footer-center {
                    flex: 1;
                    display: flex;
                    justify-content: center;
                }

                .footer-nav {
                    display: flex;
                    gap: 24px;
                }

                .footer-nav a {
                    color: #3b82f6;
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    position: relative;
                }

                .footer-nav a:hover {
                    text-decoration: underline;
                    text-underline-offset: 4px;
                }

                .footer-nav a:focus {
                    outline: 2px solid #3b82f6;
                    outline-offset: 2px;
                    border-radius: 2px;
                }

                .footer-right {
                    display: flex;
                    align-items: center;
                }

                .social-icons {
                    display: flex;
                    gap: 12px;
                }

                .social-icon {
                    font-size: 18px;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    padding: 4px;
                    border-radius: 4px;
                }

                .social-icon:hover {
                    transform: scale(1.1);
                    background: rgba(59, 130, 246, 0.1);
                }

                .social-icon:focus {
                    outline: 2px solid #3b82f6;
                    outline-offset: 2px;
                }

                @media (max-width: 768px) {
                    .footer-content {
                        flex-direction: column;
                        text-align: center;
                        gap: 15px;
                    }

                    .footer-nav {
                        gap: 20px;
                    }

                    .updates-cards {
                        gap: 15px;
                    }

                    .update-card {
                        min-width: 260px;
                    }
                }

                @media (max-width: 768px) {
                    .home-main {
                        flex-direction: column;
                        min-height: 0;
                    }

                    .station-sidebar {
                        width: 100%;
                        min-height: auto;
                        border-right: none;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
                        flex-shrink: 0;
                    }

                    .main-content {
                        padding: 20px;
                        min-height: 0;
                    }

                    .scrollable-content {
                        min-height: 0;
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


