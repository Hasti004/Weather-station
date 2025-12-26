import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ lastUpdated }) {
    const ts = lastUpdated ? new Date(lastUpdated).toLocaleString() : '—';
    const location = useLocation();

    return (
        <nav className="navbar" role="navigation" aria-label="main navigation">
            <div className="navbar-inner">
                <div className="navbar-brand">
                    <Link to="/" className="navbar-title">Weather Dashboard</Link>
                </div>

                <div className="navbar-menu">
                    <Link
                        to="/"
                        className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
                    >
                        Home
                    </Link>
                    <Link
                        to="/data"
                        className={`navbar-link ${location.pathname === '/data' ? 'active' : ''}`}
                    >
                        View Data
                    </Link>
                    <Link
                        to="/contact"
                        className={`navbar-link ${location.pathname === '/contact' ? 'active' : ''}`}
                    >
                        Contact
                    </Link>
                </div>

                <div className="navbar-info">
                    <p className="navbar-subtitle">Last updated: {ts}</p>
                </div>
            </div>
        </nav>
    );
}


