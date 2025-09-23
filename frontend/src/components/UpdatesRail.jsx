import React from 'react';

export function UpdatesRail() {
  // Sample updates data - in a real app this would come from an API
  const updates = [
    {
      id: 1,
      title: "System Maintenance",
      description: "Scheduled maintenance completed successfully. All stations operational.",
      date: "2025-01-15"
    },
    {
      id: 2,
      title: "New Station Added",
      description: "Mount Abu weather station now fully integrated with real-time monitoring.",
      date: "2025-01-14"
    },
    {
      id: 3,
      title: "Data Quality Update",
      description: "Improved humidity sensor calibration across all monitoring stations.",
      date: "2025-01-13"
    },
    {
      id: 4,
      title: "API Enhancement",
      description: "Enhanced data export capabilities with new CSV and JSON formats.",
      date: "2025-01-12"
    },
    {
      id: 5,
      title: "Weather Alert",
      description: "Heavy rainfall warning issued for Rajasthan region. Stay updated.",
      date: "2025-01-11"
    },
    {
      id: 6,
      title: "Dashboard Update",
      description: "New visualization features added to the weather monitoring dashboard.",
      date: "2025-01-10"
    },
    {
      id: 7,
      title: "Sensor Calibration",
      description: "Temperature sensors recalibrated for improved accuracy.",
      date: "2025-01-09"
    },
    {
      id: 8,
      title: "Network Optimization",
      description: "Improved data transmission speed and reliability across all stations.",
      date: "2025-01-08"
    }
  ];

  const onKeyDown = (e) => {
    const container = e.currentTarget;
    const step = 296; // card width ~280 + gap
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      container.scrollBy({ left: step, behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      container.scrollBy({ left: -step, behavior: 'smooth' });
    }
  };

  return (
    <section className="updates-rail">
      <div className="updates-rail-header">
        <h3 className="updates-rail-title">Recent Updates</h3>
        <p className="updates-rail-subtitle">Latest system updates and weather alerts</p>
      </div>

      <div className="updates-rail-container">
        <div
          className="updates-rail-scroll"
          role="list"
          tabIndex={0}
          aria-label="Recent updates horizontally scrollable list"
          onKeyDown={onKeyDown}
        >
          {updates.map((update) => (
            <div key={update.id} className="update-card" role="listitem" tabIndex={-1}>
              <div className="update-card-content">
                <h4 className="update-title">{update.title}</h4>
                <p className="update-description">{update.description}</p>
                <span className="update-date">{update.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
