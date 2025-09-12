-- Migration: Add unique constraint to prevent duplicate readings
-- Run this script to add the unique constraint to the readings table

USE weather_stations;

-- Check if the constraint already exists
SELECT COUNT(*) as constraint_exists
FROM information_schema.table_constraints
WHERE table_schema = 'weather_stations'
  AND table_name = 'readings'
  AND constraint_name = 'unique_station_time';

-- Add unique constraint on (station_id, timestamp) to prevent duplicates
-- This will fail if duplicates already exist, so we need to clean them first
ALTER TABLE readings ADD UNIQUE INDEX unique_station_time (station_id, timestamp);

-- Verify the constraint was added
SHOW INDEX FROM readings WHERE Key_name = 'unique_station_time';

-- Show current row counts per station
SELECT
    station_id,
    COUNT(*) as total_readings,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM readings
GROUP BY station_id
ORDER BY station_id;
