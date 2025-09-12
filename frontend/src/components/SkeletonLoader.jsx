import React from 'react';

/**
 * Skeleton loader component for better perceived performance
 */
export function SkeletonLoader({
  width = '100%',
  height = '20px',
  className = '',
  style = {},
  ...props
}) {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{
        width,
        height,
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style
      }}
      {...props}
    />
  );
}

/**
 * Station card skeleton loader
 */
export function StationCardSkeleton() {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <SkeletonLoader width="40px" height="40px" style={{ borderRadius: '50%', marginRight: '12px' }} />
        <div style={{ flex: 1 }}>
          <SkeletonLoader width="120px" height="18px" style={{ marginBottom: '4px' }} />
          <SkeletonLoader width="80px" height="14px" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <SkeletonLoader width="60px" height="14px" />
            <SkeletonLoader width="40px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Chart skeleton loader
 */
export function ChartSkeleton({ height = '300px' }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      height
    }}>
      <SkeletonLoader width="200px" height="18px" style={{ marginBottom: '16px' }} />
      <SkeletonLoader width="100%" height="calc(100% - 50px)" style={{ borderRadius: '8px' }} />
    </div>
  );
}

/**
 * Calendar skeleton loader
 */
export function CalendarSkeleton() {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '20px' }}>
        {Array.from({ length: 42 }).map((_, i) => (
          <SkeletonLoader
            key={i}
            width="100%"
            height="32px"
            style={{ borderRadius: '4px' }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Data table skeleton loader
 */
export function DataTableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '12px', marginBottom: '12px' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} width="100%" height="16px" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '12px', marginBottom: '8px' }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonLoader key={colIndex} width="100%" height="14px" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Loading spinner component
 */
export function LoadingSpinner({ size = '24px', color = '#3b82f6' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}20`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
  );
}

/**
 * CSS animations for skeleton loaders
 */
export function SkeletonStyles() {
  return (
    <style jsx>{`
      @keyframes skeleton-pulse {
        0% {
          opacity: 1;
        }
        50% {
          opacity: 0.4;
        }
        100% {
          opacity: 1;
        }
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      .skeleton-loader {
        position: relative;
        overflow: hidden;
      }

      .skeleton-loader::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.2),
          transparent
        );
        animation: skeleton-shimmer 2s infinite;
      }

      @keyframes skeleton-shimmer {
        100% {
          transform: translateX(100%);
        }
      }
    `}</style>
  );
}
