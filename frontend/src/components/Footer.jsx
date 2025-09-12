import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            color: 'white',
            padding: '40px 20px 20px',
            marginTop: 'auto',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            zIndex: 1
        }}>
            <div className="footer-content">
                {/* About Us Section */}
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 16px 0',
                        color: '#f9fafb'
                    }}>
                        About Us
                    </h3>
                    <p style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#d1d5db',
                        margin: '0 0 16px 0'
                    }}>
                        Real-time weather monitoring system providing accurate meteorological data
                        across Rajasthan and Gujarat regions.
                    </p>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '20px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            🌡️
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            🌧️
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            💨
                        </div>
                    </div>
                </div>

                {/* Quick Links Section */}
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 16px 0',
                        color: '#f9fafb'
                    }}>
                        Quick Links
                    </h3>
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0
                    }}>
                        <li style={{ marginBottom: '8px' }}>
                            <Link
                                to="/"
                                style={{
                                    color: '#d1d5db',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    transition: 'color 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                                onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
                            >
                                <span>🏠</span>
                                Dashboard
                            </Link>
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                            <Link
                                to="/station/ahm"
                                style={{
                                    color: '#d1d5db',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    transition: 'color 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                                onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
                            >
                                <span>🏙️</span>
                                Ahmedabad
                            </Link>
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                            <Link
                                to="/station/udi"
                                style={{
                                    color: '#d1d5db',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    transition: 'color 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                                onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
                            >
                                <span>🏰</span>
                                Udaipur
                            </Link>
                        </li>
                        <li style={{ marginBottom: '8px' }}>
                            <Link
                                to="/station/mtabu"
                                style={{
                                    color: '#d1d5db',
                                    textDecoration: 'none',
                                    fontSize: '14px',
                                    transition: 'color 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                                onMouseEnter={(e) => e.target.style.color = '#3b82f6'}
                                onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
                            >
                                <span>⛰️</span>
                                Mount Abu
                            </Link>
                        </li>
                    </ul>
                </div>

                {/* Contact Section */}
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 16px 0',
                        color: '#f9fafb'
                    }}>
                        Contact
                    </h3>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: '#d1d5db'
                        }}>
                            <span>📧</span>
                            <span>weather@monitoring.com</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: '#d1d5db'
                        }}>
                            <span>📱</span>
                            <span>+91 98765 43210</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            color: '#d1d5db'
                        }}>
                            <span>📍</span>
                            <span>Rajasthan & Gujarat, India</span>
                        </div>
                    </div>
                </div>

                {/* Data Source Section */}
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 16px 0',
                        color: '#f9fafb'
                    }}>
                        Data Source
                    </h3>
                    <p style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#d1d5db',
                        margin: '0 0 16px 0'
                    }}>
                        Weather data collected from automated weather stations
                        with real-time monitoring capabilities.
                    </p>
                    <div style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '12px',
                        color: '#93c5fd'
                    }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>API Status</div>
                        <div>✅ Live Data Stream Active</div>
                        <div>✅ Historical Data Available</div>
                        <div>✅ Real-time Updates</div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="footer-bottom">
                <div style={{
                    fontSize: '14px',
                    color: '#9ca3af'
                }}>
                    © 2025 Weather Monitoring System. All rights reserved.
                </div>
                <div style={{
                    display: 'flex',
                    gap: '20px',
                    fontSize: '12px',
                    color: '#9ca3af'
                }}>
                    <span>Privacy Policy</span>
                    <span>Terms of Service</span>
                    <span>API Documentation</span>
                </div>
            </div>

            <style jsx>{`
                .footer-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 40px;
                    margin-bottom: 30px;
                }

                .footer-bottom {
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    padding-top: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 16px;
                }

                @media (max-width: 768px) {
                    .footer-content {
                        grid-template-columns: 1fr;
                        gap: 30px;
                    }

                    .footer-bottom {
                        flex-direction: column;
                        text-align: center;
                        gap: 12px;
                    }
                }

                @media (max-width: 480px) {
                    .footer-content {
                        gap: 24px;
                    }
                }
            `}</style>
        </footer>
    );
}
