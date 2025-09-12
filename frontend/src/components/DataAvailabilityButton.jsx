import React, { useState } from 'react';
import { FiDownload, FiCalendar, FiDatabase } from 'react-icons/fi';
import AvailabilityModal from './availability/AvailabilityModal';

export default function DataAvailabilityButton({ stationId, stationName, className = '' }) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleApplyRange = (start, end) => {
        // This could be used to filter data in the parent component
        console.log('Date range selected:', { start, end });
    };

    return (
        <>
            <button
                onClick={handleOpenModal}
                className={`data-availability-button ${className}`}
                style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s ease',
                    marginTop: '20px'
                }}
                onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }}
            >
                <FiDatabase size={20} />
                <span>View / Download Data</span>
                <FiDownload size={18} />
            </button>

            <AvailabilityModal
                id={stationId}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onApplyRange={handleApplyRange}
            />

            <style jsx>{`
                .data-availability-button:hover {
                    transform: translateY(-2px);
                }

                .data-availability-button:active {
                    transform: translateY(0);
                }

                @media (max-width: 768px) {
                    .data-availability-button {
                        padding: 14px 16px;
                        font-size: 14px;
                    }
                }
            `}</style>
        </>
    );
}
