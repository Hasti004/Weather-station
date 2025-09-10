import React from 'react';
import StationCard from './StationCard';

export default function StationOverviewGrid({ stations, onOpenAvailability }) {
    const images = {
        ahm: new URL('../assets/cities/ahmedabad.svg', import.meta.url),
        udi: new URL('../assets/cities/udaipur.svg', import.meta.url),
        mtabu: new URL('../assets/cities/mtabu.svg', import.meta.url),
    };
    return (
        <div className="station-row" aria-label="stations-row">
            {stations.map((s) => (
                <StationCard key={s.id} id={s.id} name={s.name} metrics={s.metrics} imageSrc={images[s.id]} onOpenAvailability={onOpenAvailability} />
            ))}
        </div>
    );
}


