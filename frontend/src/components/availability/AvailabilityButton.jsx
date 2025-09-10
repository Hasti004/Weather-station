import React from 'react';
import { FiCalendar } from 'react-icons/fi';

export default function AvailabilityButton({ onOpen }) {
    return (
        <button
            onClick={onOpen}
            title="Data Availability"
            aria-label="Data Availability"
            style={{
                width: 32,
                height: 32,
                display: 'inline-grid',
                placeItems: 'center',
                borderRadius: 8,
                border: '1px solid var(--panel-border)',
                background: '#fff',
                color: 'var(--brand-600)',
                cursor: 'pointer'
            }}
        >
            <FiCalendar size={16} />
        </button>
    );
}


