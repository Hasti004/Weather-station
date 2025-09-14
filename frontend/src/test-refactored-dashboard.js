// Simple test to verify the refactored dashboard components work
import React from 'react';
import { render } from '@testing-library/react';
import RefactoredDashboard from './pages/RefactoredDashboard';
import StationSummaryCard from './components/StationSummaryCard';

// Mock data for testing
const mockStationData = {
    station_id: 1,
    station_name: 'Udaipur',
    temperature_c: 25.5,
    humidity_pct: 65.2,
    rainfall_mm: 12.3,
    windspeed_ms: 3.2,
    pressure_hpa: 1013.2
};

// Test StationSummaryCard component
console.log('Testing StationSummaryCard component...');
try {
    const { container } = render(
        <StationSummaryCard
            stationName="Udaipur"
            stationData={mockStationData}
        />
    );
    console.log('✅ StationSummaryCard renders successfully');
} catch (error) {
    console.error('❌ StationSummaryCard test failed:', error.message);
}

// Test RefactoredDashboard component
console.log('Testing RefactoredDashboard component...');
try {
    const { container } = render(<RefactoredDashboard />);
    console.log('✅ RefactoredDashboard renders successfully');
} catch (error) {
    console.error('❌ RefactoredDashboard test failed:', error.message);
}

console.log('All tests completed!');

