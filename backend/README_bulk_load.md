# Bulk Load Weather Data Script

This script loads historical weather data from `.txt` files into the MySQL `weather_stations` database.

## Features

- **Station-specific column mapping**: Each station has different sensors, so columns are mapped according to `STATION_CONFIG`
- **Data cleaning**: Handles missing values, null indicators, and invalid data
- **Batch processing**: Inserts data in batches of 1000 rows for efficiency
- **Duplicate prevention**: Uses `INSERT IGNORE` to prevent duplicate entries
- **Error handling**: Gracefully handles parsing errors and continues processing
- **Progress reporting**: Shows insertion progress and final statistics

## Station Configuration

The script supports three weather stations with different sensor configurations:

### Ahmedabad (station_id: 2)
- **File patterns**: `ahm_weather_6months.txt`, `ahm_with_headers.txt`, `ahmedabad_*.txt`
- **Sensors**: All 15 parameters including barometer and battery sensors

### Udaipur (station_id: 1)
- **File patterns**: `udi_weather_6months.txt`, `udi_with_headers.txt`, `udaipur_*.txt`
- **Sensors**: All 15 parameters including barometer and battery sensors

### Mount Abu (station_id: 3)
- **File patterns**: `mtabu_weather_6months.txt`, `mtabu_no_headers.txt`, `mountabu_*.txt`
- **Sensors**: 12 parameters (missing barometer and battery sensors)

## Data Format

Expected CSV format with columns:
```
Timestamp,Barometer(hPa),BatteryStatus,BatteryVolts,HumIn,HumOut,RainDay(mm),RainRate(mm/hr),SolarRad,SunRise,SunSet,TempIn(C),TempOut(C),WindDir,WindSpeed(m/s)
2025-03-11 00:00:00,1006.48,OK,12.33,49,66,0.0,0.0,26,06:11,17:48,24.46,31.47,71,4.87
```

**Note**: Mount Abu files may be missing the first two columns (Barometer and BatteryStatus/BatteryVolts).

## Usage Examples

### Load a specific station file:
```bash
python bulk_load_weather.py --station ahmedabad --file data/ahm_weather_6months.txt
```

### Load all available files:
```bash
python bulk_load_weather.py --all
```

### Load from custom directory:
```bash
python bulk_load_weather.py --all --data-dir /path/to/data
```

### Test without inserting (dry run):
```bash
python bulk_load_weather.py --all --dry-run
```

## Database Requirements

The script requires a MySQL database with the following schema:

### Stations Table
```sql
CREATE TABLE stations (
    station_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### Readings Table
```sql
CREATE TABLE readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    barometer_hpa FLOAT,
    battery_status VARCHAR(20),
    battery_volts FLOAT,
    hum_in FLOAT,
    hum_out FLOAT,
    rain_day_mm FLOAT,
    rain_rate_mm_hr FLOAT,
    solar_rad FLOAT,
    sunrise TIME,
    sunset TIME,
    temp_in_c FLOAT,
    temp_out_c FLOAT,
    wind_dir VARCHAR(10),
    wind_speed_ms FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(station_id),
    INDEX idx_station_timestamp (station_id, timestamp),
    INDEX idx_timestamp (timestamp)
);
```

## Environment Configuration

Create a `.env` file in the backend directory:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=weather_stations
```

## Data Cleaning Rules

The script applies the following cleaning rules:

1. **Null handling**: Empty strings, "NA", "NAN", "null", "-999" → `NULL`
2. **Numeric values**: Rounded to 1 decimal place
3. **Timestamps**: Normalized to `YYYY-MM-DD HH:MM:SS` format
4. **Time values**: Validated `HH:MM` format for sunrise/sunset
5. **Text values**: Preserved as-is (wind direction, battery status)

## Output Example

```
✓ Database connection successful. Found 3 stations.
Scanning for data files in data...

=== Processing AHMEDABAD ===
Loading ahmedabad data from data\ahm_weather_6months.txt...
  Skipping header line
  Inserted batch of 1000 rows
  Inserted batch of 1000 rows
  ...
  Inserted final batch of 696 rows
  Processed 52697 lines, 1 errors
  Station ahmedabad now has 52696 total readings

=== SUMMARY ===
Total rows processed: 52696

Current database status:
  Ahmedabad: 52696 readings
    Range: 2025-03-11 00:00:00 to 2025-09-11 23:55:00
  Udaipur: 0 readings
  Mount Abu: 0 readings
```

## Troubleshooting

### Common Issues

1. **Database connection failed**: Check `.env` file and database credentials
2. **File not found**: Verify file paths and use `--data-dir` if needed
3. **Parsing errors**: Check file format and column count
4. **Permission denied**: Ensure database user has INSERT privileges

### Debug Mode

Use `--dry-run` to test file parsing without database insertion:
```bash
python bulk_load_weather.py --all --dry-run
```

This will show which files would be processed and validate the configuration.
