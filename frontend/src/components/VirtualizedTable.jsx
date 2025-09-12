import React, { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { getVisibleItems } from '../utils/dataProcessing';

const VirtualizedTable = memo(({
    data = [],
    columns = [],
    rowHeight = 40,
    containerHeight = 400,
    className = '',
    style = {},
    ...props
}) => {
    const [scrollTop, setScrollTop] = useState(0);
    const containerRef = useRef(null);

    // Calculate visible items
    const visibleItems = useMemo(() => {
        return getVisibleItems(data, containerHeight, rowHeight, scrollTop);
    }, [data, containerHeight, rowHeight, scrollTop]);

    // Handle scroll events
    const handleScroll = useCallback((e) => {
        setScrollTop(e.target.scrollTop);
    }, []);

    // Scroll to top when data changes
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
            setScrollTop(0);
        }
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div
                className={`virtualized-table ${className}`}
                style={{
                    height: containerHeight,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    ...style
                }}
                {...props}
            >
                No data available
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`virtualized-table ${className}`}
            style={{
                height: containerHeight,
                overflow: 'auto',
                position: 'relative',
                ...style
            }}
            onScroll={handleScroll}
            {...props}
        >
            {/* Header */}
            <div
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                    height: rowHeight,
                    alignItems: 'center',
                    padding: '0 16px',
                    fontWeight: '600',
                    fontSize: '14px',
                    color: '#374151'
                }}
            >
                {columns.map((column, index) => (
                    <div key={index} style={{ textAlign: column.align || 'left' }}>
                        {column.header}
                    </div>
                ))}
            </div>

            {/* Virtualized content */}
            <div
                style={{
                    height: visibleItems.totalHeight,
                    position: 'relative'
                }}
            >
                <div
                    style={{
                        transform: `translateY(${visibleItems.offsetY}px)`,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0
                    }}
                >
                    {visibleItems.items.map((item, index) => {
                        const actualIndex = visibleItems.startIndex + index;
                        return (
                            <div
                                key={actualIndex}
                                style={{
                                    height: rowHeight,
                                    display: 'grid',
                                    gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                                    alignItems: 'center',
                                    padding: '0 16px',
                                    borderBottom: '1px solid #f1f5f9',
                                    backgroundColor: actualIndex % 2 === 0 ? '#ffffff' : '#f8fafc',
                                    fontSize: '14px',
                                    color: '#374151'
                                }}
                            >
                                {columns.map((column, colIndex) => (
                                    <div
                                        key={colIndex}
                                        style={{
                                            textAlign: column.align || 'left',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {column.render
                                            ? column.render(item, actualIndex)
                                            : item[column.key] || '—'
                                        }
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

VirtualizedTable.displayName = 'VirtualizedTable';

export default VirtualizedTable;
