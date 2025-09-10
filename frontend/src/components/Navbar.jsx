import React from 'react';

export default function Navbar({ lastUpdated }) {
    const ts = lastUpdated ? new Date(lastUpdated).toLocaleString() : '—';
    return (
        <nav className="navbar" role="navigation" aria-label="main navigation">
            <div className="navbar-inner">
                <h1 className="navbar-title">Weather Dashboard</h1>
                <p className="navbar-subtitle">Last updated: {ts}</p>
            </div>
        </nav>
    );
}


