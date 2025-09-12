import React, { Suspense, lazy } from 'react';
import { SkeletonLoader, ChartSkeleton, CalendarSkeleton } from './SkeletonLoader';

// Lazy load heavy components
export const LazyAvailabilityModal = lazy(() => import('./availability/AvailabilityModal'));
export const LazyRealtimeStream = lazy(() => import('./RealtimeStream'));
export const LazyClimateSummary = lazy(() => import('./ClimateSummary'));

// Lazy load chart components
export const LazyTemperatureChart = lazy(() => import('./TemperatureChart'));
export const LazyHumidityChart = lazy(() => import('./HumidityChart'));
export const LazyRainfallChart = lazy(() => import('./RainfallChart'));
export const LazyPressureChart = lazy(() => import('./charts/PressureChart'));
export const LazyWindSpeedChart = lazy(() => import('./charts/WindSpeedChart'));
export const LazyWindRoseChart = lazy(() => import('./charts/WindRoseChart'));

// Lazy load page components
export const LazyStationPage = lazy(() => import('../pages/StationPage'));
export const LazyLiveChartPage = lazy(() => import('../pages/LiveChartPage'));
export const LazyRealtimePage = lazy(() => import('../pages/RealtimePage'));

/**
 * Higher-order component for lazy loading with fallback
 */
export function withLazyLoading(Component, fallback = null) {
    return function LazyWrapper(props) {
        return (
            <Suspense fallback={fallback || <SkeletonLoader width="100%" height="200px" />}>
                <Component {...props} />
            </Suspense>
        );
    };
}

/**
 * Lazy modal wrapper with skeleton fallback
 */
export function LazyModalWrapper({ children, ...props }) {
    return (
        <Suspense fallback={<div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,.35)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 50
        }}>
            <div style={{
                width: 880,
                maxWidth: '90vw',
                background: '#fff',
                borderRadius: 16,
                padding: '40px',
                textAlign: 'center'
            }}>
                <SkeletonLoader width="200px" height="20px" style={{ marginBottom: '20px' }} />
                <CalendarSkeleton />
            </div>
        </div>}>
            {children}
        </Suspense>
    );
}

/**
 * Lazy chart wrapper with chart skeleton
 */
export function LazyChartWrapper({ children, height = 300, ...props }) {
    return (
        <Suspense fallback={<ChartSkeleton height={height} />}>
            {children}
        </Suspense>
    );
}

/**
 * Lazy page wrapper with loading state
 */
export function LazyPageWrapper({ children, ...props }) {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <SkeletonLoader width="200px" height="20px" />
                <SkeletonLoader width="400px" height="300px" />
            </div>
        }>
            {children}
        </Suspense>
    );
}
