# Multi-Station Weather Data Ingestion System

This system handles real-time weather data ingestion from multiple weather stations with different parameter configurations.

## Features

- **Multi-station support**: Udaipur, Ahmedabad, Mount Abu
- **Flexible parameter handling**: Different stations have different parameter counts
- **Sensor failure handling**: Handles -999 values and missing data
- **Database integration**: MySQL with proper schema and relationships
- **Error resilience**: Continues processing even if individual stations fail

## Station Configurations

### Udaipur & Ahmedabad
- **File**: `udaipur_live.txt`, `ahmedabad_live.txt`
- **Parameters**: All 16 parameters available
- **Data format**: Comma-separated values with all fields

### Mount Abu
- **File**: `mountabu_live.txt`
- **Parameters**: Missing first 2 parameters (barometer_hpa, battery_status)
- **Data format**: Comma-separated values starting from parameter 3

## Database Schema

### Stations Table
```sql
CREATE TABLE stations (
    station_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(100)
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
    FOREIGN KEY (station_id) REFERENCES stations(station_id)
);
```

## Setup Instructions

### 1. Database Setup
```bash
# Create the database and tables
mysql -u root -p < new_schema.sql
```

### 2. Environment Configuration
```bash
# Copy consolidated environment template
cp env_consolidated.txt .env

# Edit .env and configure your settings:
# - Set your MySQL password: DB_PASSWORD=your_actual_password
# - Choose database name: DB_NAME=weather_stations (or observatory)
# - Uncomment relevant settings for your system
```

### 3. Install Dependencies
```bash
pip install -r requirements_weather_stations.txt
```

### 4. Create Sample Data Files
The script will automatically create sample data files if they don't exist:
- `udaipur_live.txt`
- `ahmedabad_live.txt`
- `mountabu_live.txt`

## Usage

### Run the Ingester
```bash
python multi_station_ingester.py
```

### Sample Data Format

**Udaipur/Ahmedabad (all 16 parameters):**
```
1013.2,Good,12.4,45.2,68.5,0.0,0.0,850.3,06:30,18:45,22.1,28.5,NW,3.2
```

**Mount Abu (missing first 2 parameters):**
```
12.2,48.5,72.1,0.0,0.0,650.8,06:45,19:00,18.5,25.3,SW,2.5
```

## Parameter Mapping

| Index | Parameter | Type | Description |
|-------|-----------|------|-------------|
| 0 | barometer_hpa | FLOAT | Barometric pressure |
| 1 | battery_status | VARCHAR | Battery status |
| 2 | battery_volts | FLOAT | Battery voltage |
| 3 | hum_in | FLOAT | Indoor humidity |
| 4 | hum_out | FLOAT | Outdoor humidity |
| 5 | rain_day_mm | FLOAT | Daily rainfall |
| 6 | rain_rate_mm_hr | FLOAT | Rain rate |
| 7 | solar_rad | FLOAT | Solar radiation |
| 8 | sunrise | TIME | Sunrise time |
| 9 | sunset | TIME | Sunset time |
| 10 | temp_in_c | FLOAT | Indoor temperature |
| 11 | temp_out_c | FLOAT | Outdoor temperature |
| 12 | wind_dir | VARCHAR | Wind direction |
| 13 | wind_speed_ms | FLOAT | Wind speed |

## Error Handling

- **Missing files**: Logs warning and continues with other stations
- **Sensor failures**: -999 values are converted to NULL
- **Parse errors**: Invalid values are converted to NULL
- **Database errors**: Transactions are rolled back, processing continues

## Monitoring

The script provides detailed logging:
- `[INFO]`: General processing information
- `[WARN]`: Non-critical issues (missing files, parse errors)
- `[ERROR]`: Critical failures (database errors)
- `[SUCCESS]`: Successful operations

## Integration

This system can be integrated with:
- **Cron jobs**: Run periodically to process new data
- **File watchers**: Monitor files for real-time processing
- **Web APIs**: Expose data through REST endpoints
- **Dashboards**: Visualize weather data in real-time
