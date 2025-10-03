import React from 'react';
import { StationCard } from './StationCard';

export function StationRow({ stations }) {
  console.log('[StationRow] Received stations:', stations);

  if (!stations || stations.length === 0) {
    return (
      <div className="station-row">
        <p>No station data available</p>
      </div>
    );
  }

  return (
    <div className="station-row">
      {stations.map(station => (
        <StationCard key={station.id} {...station} />
      ))}
    </div>
  );
}

