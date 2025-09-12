-- Migration: Remove duplicates and add unique constraint on (station_id, timestamp)
-- Date: 2025-09-12
-- Purpose: Fix duplicate readings and prevent future duplicates

USE weather_stations;

-- Step 1: Show current duplicate situation
SELECT
    'Before cleanup' as status,
    station_id,
    COUNT(*) as total_rows,
    COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as unique_combinations,
    COUNT(*) - COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as duplicates
FROM readings
GROUP BY station_id
ORDER BY station_id;

-- Step 2: Create backup table (optional but recommended)
CREATE TABLE IF NOT EXISTS readings_backup_2025_09_12 AS
SELECT * FROM readings;

-- Step 3: Remove duplicates (keep lowest id per station_id, timestamp)
-- This deletes all duplicate rows except the one with the lowest id
DELETE r1 FROM readings r1
JOIN readings r2
  ON r1.station_id = r2.station_id
 AND r1.timestamp  = r2.timestamp
 AND r1.id > r2.id;

-- Step 4: Show results after duplicate removal
SELECT
    'After cleanup' as status,
    station_id,
    COUNT(*) as total_rows,
    COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as unique_combinations,
    COUNT(*) - COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as duplicates
FROM readings
GROUP BY station_id
ORDER BY station_id;

-- Step 5: Add unique constraint (only if not already present)
-- Check if constraint already exists
SET @constraint_exists = (
    SELECT COUNT(*)
    FROM information_schema.table_constraints
    WHERE table_schema = 'weather_stations'
      AND table_name = 'readings'
      AND constraint_name = 'unique_station_time'
);

-- Add constraint only if it doesn't exist
SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE readings ADD UNIQUE INDEX unique_station_time (station_id, timestamp)',
    'SELECT "Unique constraint already exists" as message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 6: Verify the constraint was added
SHOW INDEX FROM readings WHERE Key_name = 'unique_station_time';

-- Step 7: Final verification - should show 0 duplicates
SELECT
    'Final verification' as status,
    station_id,
    COUNT(*) as total_rows,
    MIN(timestamp) as earliest,
    MAX(timestamp) as latest
FROM readings
GROUP BY station_id
ORDER BY station_id;

-- Step 8: Test for any remaining duplicates (should return 0 rows)
SELECT
    'Duplicate check' as status,
    station_id,
    timestamp,
    COUNT(*) as duplicate_count
FROM readings
GROUP BY station_id, timestamp
HAVING COUNT(*) > 1
LIMIT 10;
