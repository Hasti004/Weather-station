# Duplicate Prevention Implementation

This document describes the implementation of duplicate prevention for the weather station data ingestion system.

## Problem

The original ingestion system was creating duplicate rows in the `readings` table because:
1. No unique constraint existed on `(station_id, timestamp)` combinations
2. Plain `INSERT` statements were used instead of upsert patterns
3. Re-running ingestion scripts would create new rows instead of skipping duplicates

## Solution

### 1. Database Schema Changes

**Migration File**: `migrations/2025-09-unique-station-timestamp.sql`

This migration:
- Removes existing duplicates (keeps lowest `id` per `(station_id, timestamp)` pair)
- Adds `UNIQUE INDEX unique_station_time (station_id, timestamp)`
- Is re-runnable without errors
- Creates a backup table before making changes

### 2. Code Changes

#### `bulk_load_weather.py`
- **Updated `insert_bulk()` function**:
  - Changed return type to `Tuple[int, int]` (inserted_count, skipped_count)
  - Uses `INSERT ... ON DUPLICATE KEY UPDATE station_id = station_id`
  - Logs both inserted and skipped rows
- **Enhanced dry-run mode**:
  - New `analyze_duplicates()` function
  - Shows how many rows would be inserted vs skipped
  - Provides detailed duplicate analysis

#### `multi_station_ingester.py`
- **Already properly configured**:
  - Uses `observatory` database with existing unique constraint
  - Has `ON DUPLICATE KEY UPDATE` logic
  - Added logging for duplicate detection

### 3. Verification Tools

#### `verify_no_duplicates.py`
Comprehensive verification script that checks:
- Unique constraint existence
- Total row counts per station
- Duplicate combinations
- Detailed station information

#### `test_idempotent_ingestion.py`
Test script that verifies:
- Re-running ingestion doesn't create duplicates
- Row counts remain stable
- Upsert pattern works correctly

## Usage

### 1. Apply the Migration

```bash
# Run the migration to fix existing duplicates and add unique constraint
mysql -u root -p weather_stations < migrations/2025-09-unique-station-timestamp.sql
```

### 2. Verify the Fix

```bash
# Check for duplicates and verify unique constraint
python verify_no_duplicates.py

# Test that re-running ingestion doesn't create duplicates
python test_idempotent_ingestion.py
```

### 3. Use Enhanced Dry-Run

```bash
# Analyze what would happen without actually inserting
python bulk_load_weather.py --station mountabu --file data/mtabu_weather_6months.txt --dry-run
```

### 4. Normal Ingestion

```bash
# Run normal ingestion (now idempotent)
python bulk_load_weather.py --station mountabu --file data/mtabu_weather_6months.txt
```

## Expected Behavior

### Before Fix
- Mount Abu: 263,520 rows (5x duplicates)
- Re-running ingestion: Creates more duplicates
- No duplicate prevention

### After Fix
- Mount Abu: 52,704 rows (correct count)
- Re-running ingestion: Shows "Skipped X duplicate rows"
- Row counts remain stable
- No new duplicates created

## Key Features

### 1. Idempotent Ingestion
- Running the same file multiple times won't create duplicates
- Uses `ON DUPLICATE KEY UPDATE` to skip existing rows
- Logs when duplicates are skipped

### 2. Database-Level Protection
- Unique constraint prevents duplicates at the database level
- Works even if application logic fails
- Ensures data integrity

### 3. Enhanced Logging
- Shows inserted vs skipped row counts
- Logs duplicate detection in real-time
- Provides detailed analysis in dry-run mode

### 4. Verification Tools
- Comprehensive duplicate checking
- Idempotent ingestion testing
- Database constraint verification

## Database Schema

The unique constraint is defined as:
```sql
ALTER TABLE readings ADD UNIQUE INDEX unique_station_time (station_id, timestamp);
```

This ensures that no two rows can have the same `(station_id, timestamp)` combination.

## Error Handling

- Database connection errors are properly handled
- Duplicate constraint violations are caught and logged
- Rollback on errors to maintain data consistency
- Graceful handling of missing data files

## Performance

- Batch inserts for efficiency (1000 rows per batch)
- Index on `(station_id, timestamp)` for fast duplicate detection
- Minimal overhead for duplicate checking
- Efficient upsert operations

## Testing

Run the test suite to verify everything works:

```bash
# 1. Verify no duplicates exist
python verify_no_duplicates.py

# 2. Test idempotent ingestion
python test_idempotent_ingestion.py

# 3. Test dry-run analysis
python bulk_load_weather.py --station mountabu --file data/mtabu_weather_6months.txt --dry-run
```

## Troubleshooting

### If duplicates still exist after migration:
1. Check if the unique constraint was applied: `SHOW INDEX FROM readings WHERE Key_name = 'unique_station_time'`
2. Run the verification script: `python verify_no_duplicates.py`
3. Re-run the migration if needed

### If ingestion still creates duplicates:
1. Verify the unique constraint exists
2. Check that the upsert pattern is being used
3. Look for error messages in the logs

### If dry-run shows unexpected results:
1. Check that the database connection is working
2. Verify the station configuration is correct
3. Check for parsing errors in the data files
