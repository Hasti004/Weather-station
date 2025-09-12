import React, { useEffect, useState } from 'react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(() => onClose?.(), 300); // Allow fade out animation
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(() => onClose?.(), 300);
    };

    if (!visible) return null;

    const getToastStyles = () => {
        const baseStyles = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '300px',
            maxWidth: '400px',
            transform: visible ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s ease-in-out',
            cursor: 'pointer'
        };

        switch (type) {
            case 'success':
                return {
                    ...baseStyles,
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: '1px solid #059669'
                };
            case 'error':
                return {
                    ...baseStyles,
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: '1px solid #dc2626'
                };
            case 'warning':
                return {
                    ...baseStyles,
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: '1px solid #d97706'
                };
            case 'info':
                return {
                    ...baseStyles,
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: '1px solid #2563eb'
                };
            default:
                return {
                    ...baseStyles,
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: '1px solid #4b5563'
                };
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'warning':
                return '⚠️';
            case 'info':
                return 'ℹ️';
            default:
                return '📢';
        }
    };

    return (
        <div style={getToastStyles()} onClick={handleClose}>
            <span style={{ fontSize: '16px' }}>{getIcon()}</span>
            <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
                {message}
            </span>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px'
                }}
                aria-label="Close notification"
            >
                ×
            </button>
        </div>
    );
}

// Toast container component for managing multiple toasts
export function ToastContainer({ toasts, onRemoveToast }) {
    return (
        <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999 }}>
            {toasts.map((toast, index) => (
                <div key={toast.id} style={{ marginBottom: '8px' }}>
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => onRemoveToast(toast.id)}
                    />
                </div>
            ))}
        </div>
    );
}
