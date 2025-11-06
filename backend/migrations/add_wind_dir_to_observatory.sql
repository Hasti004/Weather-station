-- Migration: Add wind_dir column to observatory.readings table
-- This adds the wind direction column needed for wind rose visualization

USE observatory;

-- Check if column already exists before adding
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'observatory'
    AND TABLE_NAME = 'readings'
    AND COLUMN_NAME = 'wind_dir'
);

-- Add wind_dir column if it doesn't exist
SET @sql = IF(@col_exists > 0,
    'SELECT "Column wind_dir already exists" AS message;',
    'ALTER TABLE readings ADD COLUMN wind_dir INT NULL AFTER windspeed_ms;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column was added
DESCRIBE readings;

-- Show sample of current data
SELECT
    COUNT(*) as total_records,
    COUNT(wind_dir) as records_with_wind_dir,
    MIN(reading_ts) as earliest_record,
    MAX(reading_ts) as latest_record
FROM readings;

