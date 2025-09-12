/**
 * CSV Export Utilities for Weather Data
 * Converts JSON data to CSV format and handles file downloads
 */

/**
 * Converts an array of objects to CSV format
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Optional array of column names to include
 * @returns {string} CSV formatted string
 */
export function convertToCSV(data, columns = null) {
    if (!data || data.length === 0) {
        return '';
    }

    // Get all unique keys from all objects if columns not specified
    const allKeys = columns || [...new Set(data.flatMap(obj => Object.keys(obj)))];

    // Create CSV header
    const header = allKeys.join(',');

    // Create CSV rows
    const rows = data.map(obj => {
        return allKeys.map(key => {
            const value = obj[key];
            // Handle null/undefined values
            if (value === null || value === undefined) {
                return '';
            }
            // Convert to string and escape quotes
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',');
    });

    return [header, ...rows].join('\n');
}

/**
 * Downloads data as a CSV file
 * @param {string} csvContent - CSV content as string
 * @param {string} filename - Name of the file to download
 */
export function downloadCSV(csvContent, filename) {
    // Create blob with CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL object
    URL.revokeObjectURL(url);
}

/**
 * Formats weather data for CSV export
 * @param {Array} weatherData - Raw weather data from API
 * @returns {Array} Formatted data for CSV export
 */
export function formatWeatherDataForCSV(weatherData) {
    if (!weatherData || !Array.isArray(weatherData)) {
        return [];
    }

    return weatherData.map(reading => ({
        timestamp: reading.reading_ts || reading.timestamp,
        station_id: reading.station_id,
        station_name: reading.station_name || 'Unknown',
        temperature_c: reading.temperature_c,
        humidity_pct: reading.humidity_pct,
        rainfall_mm: reading.rainfall_mm,
        pressure_hpa: reading.pressure_hpa,
        windspeed_ms: reading.windspeed_ms,
        wind_dir: reading.wind_dir,
        visibility_km: reading.visibility_km,
        battery_voltage_v: reading.battery_voltage_v,
        battery_status: reading.battery_status,
        solar_rad: reading.solar_rad,
        sunrise: reading.sunrise,
        sunset: reading.sunset
    }));
}

/**
 * Generates filename for weather data export
 * @param {string} stationName - Name of the station
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} exportType - Type of export (selected, week, month, all)
 * @returns {string} Formatted filename
 */
export function generateExportFilename(stationName, startDate, endDate, exportType = 'selected') {
    const cleanStationName = stationName.toLowerCase().replace(/\s+/g, '_');
    const start = startDate || 'unknown';
    const end = endDate || 'unknown';

    return `${cleanStationName}_${start}_to_${end}.csv`;
}

/**
 * Exports weather data to CSV with proper formatting
 * @param {Array} weatherData - Weather data from API
 * @param {string} stationName - Station name for filename
 * @param {string} startDate - Start date for filename
 * @param {string} endDate - End date for filename
 * @param {string} exportType - Type of export
 */
export function exportWeatherDataToCSV(weatherData, stationName, startDate, endDate, exportType = 'selected') {
    try {
        // Format data for CSV
        const formattedData = formatWeatherDataForCSV(weatherData);

        // Convert to CSV
        const csvContent = convertToCSV(formattedData);

        if (!csvContent) {
            throw new Error('No data to export');
        }

        // Generate filename
        const filename = generateExportFilename(stationName, startDate, endDate, exportType);

        // Download file
        downloadCSV(csvContent, filename);

        return {
            success: true,
            filename,
            recordCount: formattedData.length
        };
    } catch (error) {
        console.error('Export failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Validates date range for export
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Object} Validation result
 */
export function validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
        return { valid: false, error: 'Start and end dates are required' };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { valid: false, error: 'Invalid date format' };
    }

    if (start > end) {
        return { valid: false, error: 'Start date must be before end date' };
    }

    // Check if date range is too large (more than 1 year)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end - start > oneYear) {
        return { valid: false, error: 'Date range cannot exceed 1 year' };
    }

    return { valid: true };
}
