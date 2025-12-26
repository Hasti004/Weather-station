import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import '../styles/dataView.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8000';

async function fetchDataRange(stationId, start, end) {
  // Add one day to end date to include the full last day (API uses < not <=)
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() + 1);
  const endDateStr = endDate.toISOString().split('T')[0];

  const params = new URLSearchParams({
    station_id: stationId,
    start: `${start}T00:00:00`,
    end: `${endDateStr}T00:00:00`, // Use next day at 00:00:00 since API uses <
    limit: '10000'
  });
  const url = `${API_BASE}/range?${params}`;
  console.log('[DataViewPage] Fetching data from:', url);
  console.log('[DataViewPage] Request params:', { stationId, start, end, endDateStr });

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('[DataViewPage] API error:', res.status, errorText);
    throw new Error(`Failed to fetch data: ${res.status} ${errorText}`);
  }
  const result = await res.json();
  console.log('[DataViewPage] Received data:', result);
  console.log('[DataViewPage] Data count:', result.data?.length || 0);
  return result.data || [];
}

async function fetchStations() {
  const url = `${API_BASE}/stations`;
  console.log('[DataViewPage] Fetching stations from:', url);
  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('[DataViewPage] Stations API error:', res.status, errorText);
    throw new Error(`Failed to fetch stations: ${res.status}`);
  }
  const result = await res.json();
  console.log('[DataViewPage] Received stations:', result);
  // API returns {stations: [...]} not {data: [...]}
  return result.stations || result.data || [];
}

export default function DataViewPage() {
  const [stationId, setStationId] = useState('1');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const { data: stations = [] } = useQuery({
    queryKey: ['stations'],
    queryFn: fetchStations
  });

  const { data: allData = [], isLoading, error } = useQuery({
    queryKey: ['dataRange', stationId, startDate, endDate],
    queryFn: () => fetchDataRange(stationId, startDate, endDate),
    enabled: !!stationId && !!startDate && !!endDate
  });

  const filteredData = useMemo(() => {
    let filtered = allData;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(val =>
          val != null && String(val).toLowerCase().includes(term)
        )
      );
    }

    return filtered;
  }, [allData, searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [stationId, startDate, endDate, searchTerm]);

  const handleExport = () => {
    if (filteredData.length === 0) return;

    const headers = Object.keys(filteredData[0]);
    const csv = [
      headers.join(','),
      ...filteredData.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val == null) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stationName = stations.find(s => s.station_id == stationId)?.name || 'station';
    a.download = `weather_data_${stationName}_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatValue = (val) => {
    if (val == null) return '—';
    if (typeof val === 'object') return JSON.stringify(val);
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  };

  return (
    <div className="data-view-page">
      <Navbar />
      <main className="data-view-container">
        <h1>Weather Data Records</h1>
        <p className="page-description">
          Browse and search all stored weather data from the database. Data updates every 30 seconds.
        </p>

        <div className="filters">
          <div className="filter-group">
            <label>Station:</label>
            {stations.length === 0 ? (
              <select disabled>
                <option>Loading stations...</option>
              </select>
            ) : (
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
              >
                {stations.map(s => (
                  <option key={s.station_id} value={s.station_id}>
                    {s.name || `Station ${s.station_id}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="filter-group">
            <label>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate}
            />
          </div>

          <div className="filter-group">
            <label>End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="filter-group search-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search in all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={handleExport}
            className="export-btn"
            disabled={filteredData.length === 0}
            title="Export filtered data to CSV"
          >
            📥 Export CSV ({filteredData.length} records)
          </button>
        </div>

        <div className="stats-bar">
          <span><strong>Total Records:</strong> {filteredData.length.toLocaleString()}</span>
          <span>
            <strong>Showing:</strong> {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length).toLocaleString()}
          </span>
          {searchTerm && (
            <span className="search-indicator">
              🔍 Filtered by: "{searchTerm}"
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading data from database...</p>
          </div>
        ) : error ? (
          <div className="error">
            <p>❌ Error: {error.message}</p>
            <p>Please check your connection and try again.</p>
            <p style={{ fontSize: '12px', marginTop: '10px', color: '#6b7280' }}>
              Station: {stationId}, Start: {startDate}, End: {endDate}
            </p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="no-data">
            <p>📭 No data found for the selected criteria.</p>
            <p>Try adjusting the date range or station selection.</p>
            <p style={{ fontSize: '12px', marginTop: '10px', color: '#6b7280' }}>
              Station: {stationId}, Start: {startDate}, End: {endDate}
            </p>
            {allData.length === 0 && !isLoading && (
              <p style={{ fontSize: '12px', marginTop: '10px', color: '#dc2626' }}>
                ⚠️ No records found in database for this date range. Check if data exists for these dates.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    {Object.keys(paginatedData[0]).map(key => (
                      <th key={key} title={key}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, i) => (
                        <td key={i} title={formatValue(val)}>
                          {formatValue(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  ← Previous
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

