import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Footer } from '../components/Footer';

export default function HomePage() {
    const [openFor, setOpenFor] = useState(null);

    // Simple static station data - ONLY NAMES
    const stations = [
        { id: 'ahm', name: 'Ahmedabad Station' },
        { id: 'udi', name: 'Udaipur Station' },
        { id: 'mtabu', name: 'Mount Abu Station' }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <Navbar />

            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '20px 0'
            }}>
                <h1 style={{
                        color: 'white',
                    fontSize: '32px',
                    textAlign: 'center',
                    marginBottom: '40px'
                    }}>
                        Weather Stations
                </h1>

                        <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                            {stations.map((station) => (
                                <div key={station.id} style={{
                            background: 'white',
                            borderRadius: '12px',
                            padding: '30px',
                            textAlign: 'center',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                        }}>
                            <h2 style={{
                                color: '#333',
                                fontSize: '24px',
                                margin: '0 0 20px 0'
                            }}>
                                {station.name}
                            </h2>

                            <Link
                                to={`/station/${station.id}`}
                                style={{
                                    display: 'inline-block',
                                    background: '#3b82f6',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontSize: '16px',
                                    fontWeight: '500'
                                }}
                            >
                                View Details →
                            </Link>
                            </div>
                        ))}
                </div>
            </div>

            <Footer />
        </div>
    );
}
