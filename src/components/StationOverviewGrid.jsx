import React from 'react';
import StationCard from './StationCard';

export default function StationOverviewGrid({ stations }) {
    return (
        <div className="grid" aria-label="stations-grid">
            {stations.map((s) => (
                <StationCard key={s.id} id={s.id} name={s.name} metrics={s.metrics} />
            ))}
        </div>
    );
}


