import React from 'react';
import Navbar from '../components/Navbar';
import { Footer } from '../components/Footer';
import '../styles/contact.css';

export default function ContactPage() {
    return (
        <div className="contact-page">
            <Navbar />

            <main className="contact-main">
                <div className="contact-container">
                    <div className="contact-header">
                        <h1>Contact Us</h1>
                        <p>Get in touch with our Weather Monitoring Division</p>
                    </div>

                    <div className="contact-content">
                        <div className="contact-info">
                            <div className="contact-section">
                                <h2>Physical Research Laboratory</h2>
                                <p className="organization-desc">
                                    Weather Monitoring Division provides real-time meteorological data
                                    across Rajasthan and Gujarat regions with state-of-the-art
                                    weather monitoring stations.
                                </p>
                            </div>

                            <div className="contact-details">
                                <div className="contact-item">
                                    <div className="contact-icon">📧</div>
                                    <div className="contact-text">
                                        <h3>Email</h3>
                                        <p>vishnu@prl.res.in</p>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">📱</div>
                                    <div className="contact-text">
                                        <h3>Phone</h3>
                                        <p></p>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">📍</div>
                                    <div className="contact-text">
                                        <h3>Address</h3>
                                        <p>Physical Research Laboratory</p>
                                        <p>Navrangpura, Ahmedabad - 380009</p>
                                        <p>Gujarat, India</p>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">🌐</div>
                                    <div className="contact-text">
                                        <h3>Website</h3>
                                        <p>www.prl.res.in</p>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">⏰</div>
                                    <div className="contact-text">
                                        <h3>Office Hours</h3>
                                        <p>Monday - Friday: 9:00 AM - 5:00 PM</p>
                                        <p>Saturday: 9:00 AM - 1:00 PM</p>
                                        <p>Sunday: Closed</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="weather-stations">
                            <h2>Weather Station Locations</h2>
                            <div className="stations-grid">
                                <div className="station-info">
                                    <h3>🏙️ Ahmedabad</h3>
                                    <p>Main monitoring station</p>
                                    <p>
                                        Coordinates:{' '}
                                        <a
                                            href="https://www.google.com/maps?q=23.0225,72.5714"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                                        >
                                            23.0225°N, 72.5714°E
                                        </a>
                                    </p>
                                </div>
                                <div className="station-info">
                                    <h3>🏰 Udaipur</h3>
                                    <p>Rajasthan region station</p>
                                    <p>
                                        Coordinates:{' '}
                                        <a
                                            href="https://www.google.com/maps?q=24.5854,73.7125"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                                        >
                                            24.5854°N, 73.7125°E
                                        </a>
                                    </p>
                                </div>
                                <div className="station-info">
                                    <h3>⛰️ Mount Abu</h3>
                                    <p>Hill station monitoring</p>
                                    <p>
                                        Coordinates:{' '}
                                        <a
                                            href="https://www.google.com/maps?q=24.5925,72.7156"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                                        >
                                            24.5925°N, 72.7156°E
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
