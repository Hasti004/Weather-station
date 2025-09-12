-- Add unique constraint to prevent duplicate readings
-- This ensures that (station_id, timestamp) combination is unique

USE weather_stations;

-- Add unique index on (station_id, timestamp) to prevent duplicates
ALTER TABLE readings ADD UNIQUE INDEX unique_station_time (station_id, timestamp);

-- Verify the constraint was added
SHOW INDEX FROM readings WHERE Key_name = 'unique_station_time';
