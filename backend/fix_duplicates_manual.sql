-- Manual fix for duplicate readings
-- Run this script in your MySQL client to clean up duplicates and add unique constraint

USE weather_stations;

-- Step 1: Show current duplicate situation
SELECT
    'Current State' as status,
    station_id,
    COUNT(*) as total_rows,
    COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as unique_combinations,
    COUNT(*) - COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as duplicates
FROM readings
GROUP BY station_id
ORDER BY station_id;

-- Step 2: Create a backup table (optional but recommended)
CREATE TABLE readings_backup AS SELECT * FROM readings;

-- Step 3: Remove duplicates by keeping only the latest record for each (station_id, timestamp) pair
-- This creates a temporary table with only unique records
CREATE TEMPORARY TABLE readings_clean AS
SELECT r1.*
FROM readings r1
INNER JOIN (
    SELECT station_id, timestamp, MAX(id) as max_id
    FROM readings
    GROUP BY station_id, timestamp
) r2 ON r1.station_id = r2.station_id
    AND r1.timestamp = r2.timestamp
    AND r1.id = r2.max_id;

-- Step 4: Show what will be cleaned
SELECT
    'After Cleaning' as status,
    station_id,
    COUNT(*) as clean_rows
FROM readings_clean
GROUP BY station_id
ORDER BY station_id;

-- Step 5: Replace the original table with cleaned data
-- WARNING: This will delete all existing data and replace with cleaned data
TRUNCATE TABLE readings;
INSERT INTO readings SELECT * FROM readings_clean;

-- Step 6: Add unique constraint to prevent future duplicates
ALTER TABLE readings ADD UNIQUE INDEX unique_station_time (station_id, timestamp);

-- Step 7: Verify the constraint was added
SHOW INDEX FROM readings WHERE Key_name = 'unique_station_time';

-- Step 8: Show final state
SELECT
    'Final State' as status,
    station_id,
    COUNT(*) as total_rows,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM readings
GROUP BY station_id
ORDER BY station_id;

-- Step 9: Test that duplicates are now prevented
-- This should show 0 duplicates
SELECT
    'Duplicate Check' as status,
    station_id,
    COUNT(*) as total_rows,
    COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as unique_combinations,
    COUNT(*) - COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as duplicates
FROM readings
GROUP BY station_id
ORDER BY station_id;
