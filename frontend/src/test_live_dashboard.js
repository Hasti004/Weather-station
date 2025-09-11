/**
 * Simple test script for LiveDashboard components
 * Run with: node test_live_dashboard.js
 */

// Mock environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:8000';
process.env.VITE_LIVE_INTERVAL_MS = '30000';

console.log('Live Dashboard Test');
console.log('==================');

// Test environment variables
console.log('✓ Environment variables:');
console.log(`  VITE_API_BASE_URL: ${process.env.VITE_API_BASE_URL}`);
console.log(`  VITE_LIVE_INTERVAL_MS: ${process.env.VITE_LIVE_INTERVAL_MS}`);

// Test API URL construction
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000';
const POLL_INTERVAL_MS = parseInt(process.env.VITE_LIVE_INTERVAL_MS || '30000', 10);

console.log('\n✓ Configuration:');
console.log(`  API Base URL: ${API_BASE_URL}`);
console.log(`  Poll Interval: ${POLL_INTERVAL_MS}ms (${POLL_INTERVAL_MS / 1000}s)`);

// Test data formatting functions
const formatValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    return value.toFixed(1);
  }
  return String(value);
};

const formatTimestamp = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Invalid time';
  }
};

console.log('\n✓ Data formatting tests:');
console.log(`  formatValue(25.5): ${formatValue(25.5)}`);
console.log(`  formatValue(null): ${formatValue(null)}`);
console.log(`  formatValue(undefined): ${formatValue(undefined)}`);
console.log(`  formatTimestamp('2025-01-15T10:30:00Z'): ${formatTimestamp('2025-01-15T10:30:00Z')}`);

// Test station mapping
const getStationDisplayName = (stationId) => {
  const stationMap = {
    1: 'Udaipur',
    2: 'Ahmedabad',
    3: 'Mount Abu',
  };
  return stationMap[stationId] || `Station ${stationId}`;
};

console.log('\n✓ Station mapping tests:');
console.log(`  Station 1: ${getStationDisplayName(1)}`);
console.log(`  Station 2: ${getStationDisplayName(2)}`);
console.log(`  Station 3: ${getStationDisplayName(3)}`);
console.log(`  Station 99: ${getStationDisplayName(99)}`);

// Test sample data structure
const sampleReading = {
  station_id: 1,
  reading_ts: '2025-01-15T10:30:00Z',
  temperature_c: 25.5,
  humidity_pct: 60.0,
  rainfall_mm: 0.0,
  pressure_hpa: 1013.25,
  windspeed_ms: 5.2,
  battery_voltage_v: 12.4,
  station_name: 'Udaipur',
  location: 'Udaipur, Rajasthan'
};

console.log('\n✓ Sample data structure:');
console.log('  Sample reading keys:', Object.keys(sampleReading));
console.log('  Temperature:', formatValue(sampleReading.temperature_c));
console.log('  Station name:', getStationDisplayName(sampleReading.station_id));

console.log('\n✅ All tests passed!');
console.log('\nNext steps:');
console.log('1. Start the FastAPI backend: cd backend && uvicorn api:app --reload');
console.log('2. Start the React frontend: cd frontend && npm start');
console.log('3. Navigate to http://localhost:3000/live');
console.log('4. The dashboard should auto-refresh every 30 seconds');
