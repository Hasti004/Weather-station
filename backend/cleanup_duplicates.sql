-- Cleanup script: Remove duplicate readings before adding unique constraint
-- This script removes duplicates, keeping only the latest record for each (station_id, timestamp) pair

USE weather_stations;

-- Show current duplicate counts
SELECT
    station_id,
    COUNT(*) as total_rows,
    COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as unique_combinations,
    COUNT(*) - COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as duplicates
FROM readings
GROUP BY station_id;

-- Create a temporary table with only unique records (keeping the latest by id)
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

-- Show counts after deduplication
SELECT
    station_id,
    COUNT(*) as clean_rows
FROM readings_clean
GROUP BY station_id;

-- Replace the original table with cleaned data
-- (This is a destructive operation - backup first!)
-- TRUNCATE TABLE readings;
-- INSERT INTO readings SELECT * FROM readings_clean;

-- For safety, just show what would be deleted
SELECT
    'Would delete' as action,
    COUNT(*) as duplicate_rows
FROM readings r1
WHERE EXISTS (
    SELECT 1 FROM readings r2
    WHERE r2.station_id = r1.station_id
      AND r2.timestamp = r1.timestamp
      AND r2.id > r1.id
);
