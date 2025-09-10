import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import StationOverviewGrid from '../components/StationOverviewGrid';
import AvailabilityModal from '../components/availability/AvailabilityModal';
import AvailabilityButton from '../components/availability/AvailabilityButton';

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

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
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
        <div style={{ minHeight: '100%', background: 'linear-gradient(180deg, #EAF2FF, #FFFFFF)' }}>
            <Navbar lastUpdated={lastUpdated} />
            <main className="container">
                <h2 style={{ marginTop: 0 }}>Weather Stations Overview</h2>
                {error ? (
                    <div className="error-banner">{error}</div>
                ) : loading ? (
                    <div className="grid">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 140 }} />
                        ))}
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                            {/* Optional global availability openers */}
                        </div>
                        <StationOverviewGrid stations={stations} onOpenAvailability={(id) => setOpenFor(id)} />
                        {openFor && (
                            <AvailabilityModal id={openFor} isOpen={true} onClose={() => setOpenFor(null)} onApplyRange={() => { /* Home does not change filters, just visibility */ }} />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}


