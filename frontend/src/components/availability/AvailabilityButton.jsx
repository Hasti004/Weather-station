import React from 'react';
import { FiCalendar } from 'react-icons/fi';

export default function AvailabilityButton({ onOpen }) {
    return (
        <button
            onClick={onOpen}
            title="View & download historical data"
            aria-label="View & download historical data"
            style={{
                width: 32,
                height: 32,
                display: 'inline-grid',
                placeItems: 'center',
                borderRadius: 8,
                border: '1px solid var(--panel-border)',
                background: '#fff',
                color: 'var(--brand-600)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none'
            }}
            onMouseEnter={(e) => {
                e.target.style.background = 'var(--brand-50)';
                e.target.style.borderColor = 'var(--brand-200)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.borderColor = 'var(--panel-border)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
            }}
            onFocus={(e) => {
                e.target.style.outline = '2px solid var(--brand-500)';
                e.target.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
                e.target.style.outline = 'none';
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen();
                }
            }}
        >
            <FiCalendar size={16} />
        </button>
    );
}


