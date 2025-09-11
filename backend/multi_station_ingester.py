"""
Multi-station weather data ingester for MySQL database.
Supports both .txt (Davis) and .dat (WXT520) files with realtime and bulk ingestion.
"""
import os
import time
import threading
import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Union
import mysql.connector
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'weather_stations'),
    'charset': 'utf8mb4',
    'autocommit': True
}

# Station Configuration
STATION_CONFIG = {
    "ahmedabad": {
        "obs_id": "ahm",
        "live_file": "ahmedabad_live.txt",
        "columns": ["timestamp", "barometer_hpa", "battery_status", "battery_volts",
                   "hum_in", "hum_out", "rain_day_mm", "rain_rate_mm_hr", "solar_rad",
                   "sunrise", "sunset", "temp_in_c", "temp_out_c", "wind_dir", "wind_speed_ms"]
    },
    "udaipur": {
        "obs_id": "udi",
        "live_file": "udaipur_live.txt",
        "columns": ["timestamp", "barometer_hpa", "battery_status", "battery_volts",
                   "hum_in", "hum_out", "rain_day_mm", "rain_rate_mm_hr", "solar_rad",
                   "sunrise", "sunset", "temp_in_c", "temp_out_c", "wind_dir", "wind_speed_ms"]
    },
    "mount abu": {
        "obs_id": "mtabu",
        "live_file": "mountabu_live.txt",
        "columns": ["timestamp", "battery_volts", "hum_in", "hum_out", "rain_day_mm",
                   "rain_rate_mm_hr", "solar_rad", "sunrise", "sunset", "temp_in_c",
                   "temp_out_c", "wind_dir", "wind_speed_ms"]
    }
}

class MultiStationIngester:
    """Handles weather data ingestion for multiple stations."""

    def __init__(self):
        self.db_config = DB_CONFIG
        self.station_config = STATION_CONFIG
        self.lock = threading.Lock()

    def get_connection(self):
        """Get database connection."""
        return mysql.connector.connect(**self.db_config)

    def clean_value(self, val: str) -> Any:
        """
        Clean and format a sensor value.

        Args:
            val: Raw value from file

        Returns:
            None for invalid values, formatted value otherwise
        """
        if not val or val.strip() == '':
            return None

        val = val.strip()

        # Check for invalid values
        if val.upper() in ['NA', 'NAN', '-999', 'NULL', 'NONE']:
            return None

        # Try to convert to float for numeric values
        try:
            float_val = float(val)
            # Round to 1 decimal place
            return round(float_val, 1)
        except ValueError:
            # Keep as string (e.g., wind_dir, battery_status)
            return val

    def parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse timestamp string to datetime object."""
        if not timestamp_str or timestamp_str.strip() == '':
            return None

        timestamp_str = timestamp_str.strip()

        # Common timestamp formats
        formats = [
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M:%S.%f",
            "%d/%m/%Y %H:%M:%S",
            "%d/%m/%Y %H:%M",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f"
        ]

        for fmt in formats:
            try:
                return datetime.strptime(timestamp_str, fmt)
            except ValueError:
                continue

        # If parsing fails, return current time
        print(f"[WARN] Could not parse timestamp: {timestamp_str}, using current time")
        return datetime.now()

    def parse_line(self, station_name: str, line: str) -> Optional[Dict[str, Any]]:
        """
        Parse a single line of data using station configuration.

        Args:
            station_name: Name of the station
            line: Raw line from file

        Returns:
            Dictionary mapping sensor names to values, or None if parsing fails
        """
        if station_name not in self.station_config:
            print(f"[ERROR] Unknown station: {station_name}")
            return None

        config = self.station_config[station_name]
        columns = config["columns"]

        # Split line by comma
        values = [v.strip() for v in line.split(',')]

        # Check if we have enough values
        if len(values) < len(columns):
            print(f"[WARN] Not enough values in line: {line}")
            return None

        # Parse the line
        data = {}
        for i, column in enumerate(columns):
            if i < len(values):
                if column == "timestamp":
                    data[column] = self.parse_timestamp(values[i])
                else:
                    data[column] = self.clean_value(values[i])
            else:
                data[column] = None

        return data

    def insert_into_db(self, obs_id: str, timestamp: datetime, data: Dict[str, Any]) -> bool:
        """
        Insert one record into the database.

        Args:
            obs_id: Observatory ID of the station
            timestamp: Timestamp of the reading
            data: Dictionary of sensor values

        Returns:
            True if successful, False otherwise
        """
        conn = None
        cursor = None

        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Map data to observatory schema
            # Create JSON field with all sensor data (convert datetime to string)
            json_data = {}
            for key, value in data.items():
                if isinstance(value, datetime):
                    json_data[key] = value.isoformat()
                else:
                    json_data[key] = value
            fields_json = json.dumps(json_data)

            # Create raw line representation
            raw_line = ",".join([str(v) if v is not None else "" for v in data.values()])

            # Create line checksum
            import hashlib
            line_checksum = hashlib.sha256(raw_line.encode('utf-8')).hexdigest()

            # Prepare the SQL statement for observatory schema
            sql = """
            INSERT INTO readings
            (obs_id, reading_ts, temperature_c, humidity_pct, rainfall_mm, pressure_hpa,
             windspeed_ms, visibility_km, battery_pct, battery_voltage_v, fields_json, raw_line, line_checksum)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            temperature_c = VALUES(temperature_c),
            humidity_pct = VALUES(humidity_pct),
            rainfall_mm = VALUES(rainfall_mm),
            pressure_hpa = VALUES(pressure_hpa),
            windspeed_ms = VALUES(windspeed_ms),
            visibility_km = VALUES(visibility_km),
            battery_pct = VALUES(battery_pct),
            battery_voltage_v = VALUES(battery_voltage_v),
            fields_json = VALUES(fields_json),
            raw_line = VALUES(raw_line),
            line_checksum = VALUES(line_checksum)
            """

            # Prepare values tuple
            values = (
                obs_id,
                timestamp,
                data.get('temp_out_c'),  # temperature_c
                data.get('hum_out'),     # humidity_pct
                data.get('rain_day_mm'), # rainfall_mm
                data.get('barometer_hpa'), # pressure_hpa
                data.get('wind_speed_ms'), # windspeed_ms
                None,  # visibility_km (not in our sensor list)
                None,  # battery_pct (not in our sensor list)
                data.get('battery_volts'), # battery_voltage_v
                fields_json,
                raw_line,
                line_checksum
            )

            cursor.execute(sql, values)
            conn.commit()
            return True

        except Exception as e:
            print(f"[ERROR] Database insert failed: {e}")
            if conn:
                conn.rollback()
            return False
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    def read_last_line(self, filepath: Path) -> Optional[str]:
        """Read the last line from a file efficiently."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                # Go to end of file
                f.seek(0, 2)
                file_size = f.tell()

                if file_size == 0:
                    return None

                # Read backwards to find last line
                pos = file_size - 1
                while pos >= 0:
                    f.seek(pos)
                    char = f.read(1)
                    if char == '\n':
                        break
                    pos -= 1

                # Read the last line
                f.seek(pos + 1)
                last_line = f.read().strip()
                return last_line if last_line else None

        except (FileNotFoundError, UnicodeDecodeError) as e:
            print(f"[ERROR] Failed to read {filepath}: {e}")
            return None

    def ingest_station_realtime(self, station_name: str, data_dir: Path) -> bool:
        """
        Ingest the last line from a station's live file.

        Args:
            station_name: Name of the station
            data_dir: Directory containing live files

        Returns:
            True if successful, False otherwise
        """
        if station_name not in self.station_config:
            print(f"[ERROR] Unknown station: {station_name}")
            return False

        config = self.station_config[station_name]
        live_file = data_dir / config["live_file"]

        if not live_file.exists():
            print(f"[WARN] Live file not found: {live_file}")
            return False

        # Read last line
        last_line = self.read_last_line(live_file)
        if not last_line:
            print(f"[WARN] No data in {live_file}")
            return False

        # Parse the line
        data = self.parse_line(station_name, last_line)
        if not data:
            print(f"[ERROR] Failed to parse line from {live_file}")
            return False

        # Insert into database
        timestamp = data.get('timestamp') or datetime.now()
        success = self.insert_into_db(config["obs_id"], timestamp, data)

        if success:
            print(f"[SUCCESS] Ingested {station_name}: {timestamp}")
        else:
            print(f"[ERROR] Failed to ingest {station_name}")

        return success

    def ingest_realtime(self, data_dir: str = "data") -> Dict[str, bool]:
        """
        Run realtime ingestion for all stations in parallel.

        Args:
            data_dir: Directory containing live files

        Returns:
            Dictionary mapping station names to success status
        """
        data_path = Path(data_dir)
        results = {}

        print(f"[INFO] Starting realtime ingestion from {data_path}")

        def ingest_station(station_name):
            """Thread function for ingesting a single station."""
            try:
                success = self.ingest_station_realtime(station_name, data_path)
                with self.lock:
                    results[station_name] = success
            except Exception as e:
                print(f"[ERROR] Thread error for {station_name}: {e}")
                with self.lock:
                    results[station_name] = False

        # Create and start threads for each station
        threads = []
        for station_name in self.station_config.keys():
            thread = threading.Thread(target=ingest_station, args=(station_name,))
            thread.start()
            threads.append(thread)

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Print results
        print(f"\n[SUMMARY] Realtime ingestion results:")
        for station, success in results.items():
            status = "✅ SUCCESS" if success else "❌ FAILED"
            print(f"  {station}: {status}")

        return results

    def ingest_bulk(self, station_name: str, folderpath: str) -> int:
        """
        Ingest all files from a station's archive folder.

        Args:
            station_name: Name of the station
            folderpath: Path to the archive folder

        Returns:
            Number of records successfully inserted
        """
        if station_name not in self.station_config:
            print(f"[ERROR] Unknown station: {station_name}")
            return 0

        folder_path = Path(folderpath)
        if not folder_path.exists():
            print(f"[ERROR] Archive folder not found: {folder_path}")
            return 0

        config = self.station_config[station_name]
        obs_id = config["obs_id"]
        total_inserted = 0

        print(f"[INFO] Starting bulk ingestion for {station_name} from {folder_path}")

        # Find all .txt and .dat files
        file_patterns = ["*.txt", "*.dat"]
        files = []
        for pattern in file_patterns:
            files.extend(folder_path.glob(pattern))

        if not files:
            print(f"[WARN] No data files found in {folder_path}")
            return 0

        print(f"[INFO] Found {len(files)} files to process")

        for file_path in sorted(files):
            print(f"[INFO] Processing {file_path.name}")
            file_inserted = 0

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue

                        # Parse the line
                        data = self.parse_line(station_name, line)
                        if not data:
                            print(f"[WARN] Skipping malformed line {line_num} in {file_path.name}")
                            continue

                        # Insert into database
                        timestamp = data.get('timestamp') or datetime.now()
                        if self.insert_into_db(obs_id, timestamp, data):
                            file_inserted += 1
                        else:
                            print(f"[ERROR] Failed to insert line {line_num} from {file_path.name}")

            except (UnicodeDecodeError, IOError) as e:
                print(f"[ERROR] Failed to read {file_path.name}: {e}")
                continue

            print(f"[INFO] Inserted {file_inserted} records from {file_path.name}")
            total_inserted += file_inserted

        print(f"[SUCCESS] Bulk ingestion complete for {station_name}: {total_inserted} records")
        return total_inserted

    def create_sample_files(self, data_dir: str = "data"):
        """Create sample live files for testing."""
        data_path = Path(data_dir)
        data_path.mkdir(exist_ok=True)

        # Sample data for each station
        sample_data = {
            "ahmedabad_live.txt": "2024-01-15 10:30:00,1013.2,Good,12.4,45.2,68.5,0.0,0.0,850.3,06:30,18:45,22.1,28.5,NW,3.2",
            "udaipur_live.txt": "2024-01-15 10:30:00,1012.8,Good,12.6,42.3,65.8,0.0,0.0,780.5,06:15,18:30,24.2,31.5,NE,2.8",
            "mountabu_live.txt": "2024-01-15 10:30:00,12.2,48.5,72.1,0.0,0.0,650.8,06:45,19:00,18.5,25.3,SW,2.5"
        }

        for filename, content in sample_data.items():
            file_path = data_path / filename
            file_path.write_text(content)
            print(f"[INFO] Created sample file: {file_path}")

def main():
    """Main function with example usage."""
    ingester = MultiStationIngester()

    # Create sample files if they don't exist
    data_dir = "data"
    sample_files = ["ahmedabad_live.txt", "udaipur_live.txt", "mountabu_live.txt"]
    sample_files_exist = all((Path(data_dir) / f).exists() for f in sample_files)

    if not sample_files_exist:
        print("[INFO] Creating sample live files...")
        ingester.create_sample_files(data_dir)

    print("=== Multi-Station Weather Data Ingester ===\n")

    # Example 1: Ingest last line from all 3 live files in parallel
    print("1. Realtime ingestion (last line from live files):")
    realtime_results = ingester.ingest_realtime(data_dir)

    print("\n" + "="*50 + "\n")

    # Example 2: Ingest all archived files from mountabu folder
    print("2. Bulk ingestion (all files from archive folder):")
    archive_folder = "./archives/mountabu/"

    # Create sample archive folder and files
    archive_path = Path(archive_folder)
    archive_path.mkdir(parents=True, exist_ok=True)

    # Create sample archive files
    sample_archive_data = [
        "2024-01-14 10:00:00,12.1,48.0,72.0,0.0,0.0,650.0,06:45,19:00,18.0,25.0,SW,2.4",
        "2024-01-14 11:00:00,12.0,48.5,72.5,0.0,0.0,680.0,06:45,19:00,18.5,25.5,SW,2.6",
        "2024-01-14 12:00:00,11.9,49.0,73.0,0.0,0.0,700.0,06:45,19:00,19.0,26.0,SW,2.8"
    ]

    for i, data in enumerate(sample_archive_data, 1):
        archive_file = archive_path / f"mountabu_2024-01-14_{i:02d}.txt"
        archive_file.write_text(data)

    print(f"[INFO] Created sample archive files in {archive_folder}")

    # Perform bulk ingestion
    bulk_count = ingester.ingest_bulk("mount abu", archive_folder)

    print(f"\n[SUMMARY] Bulk ingestion completed: {bulk_count} records inserted")

if __name__ == "__main__":
    main()
