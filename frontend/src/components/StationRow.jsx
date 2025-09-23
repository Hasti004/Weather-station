import React from 'react';
import { StationCard } from './StationCard';

export function StationRow({ stations }) {
  return (
    <div className="station-row">
      {stations.map(station => (
        <StationCard key={station.id} {...station} />
      ))}
    </div>
  );
}

