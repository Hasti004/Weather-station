import React from 'react';

export default function ErrorBanner({ message }) {
    return (
        <div className="error-banner" role="alert" aria-live="assertive">
            <strong>Data Error:</strong> {message}
        </div>
    );
}


