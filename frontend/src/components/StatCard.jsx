import React from 'react';

export default function StatCard({ icon: Icon, label, value, unit }) {
    return (
        <div className="card" aria-label={`stat-card-${label.toLowerCase()}`}>
            <div className="stat">
                <div className="stat-icon" role="img" aria-label={`${label} icon`} title={`${label} icon`}>
                    {Icon ? <Icon size={20} aria-hidden="true" focusable="false" /> : null}
                </div>
                <div>
                    <p className="stat-label">{label}</p>
                    <div className="stat-value">
                        <span className="num" aria-live="polite">{value}</span>
                        <span className="unit" aria-hidden="true">{unit}</span>
                    </div>
                    <div className="stat-subtitle">latest reading</div>
                </div>
            </div>
        </div>
    );
}


