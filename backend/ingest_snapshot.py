"""
Snapshot weather data ingester for overwritten CSV files.
Watches file for changes and processes entire file on each modification.
"""
import os
import csv
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv

from db import batch_insert_readings, get_latest_reading_ts

# Load environment variables
load_dotenv()

class SnapshotFileHandler(FileSystemEventHandler):
    """File watcher for snapshot weather CSV files."""

    def __init__(self, file_path: str, obs_id: str, has_header: bool = True, settle_ms: int = 600):
        self.file_path = Path(file_path)
        self.obs_id = obs_id
        self.has_header = has_header
        self.settle_ms = settle_ms
        self.last_modified = 0
        self.field_mapping = {
            'Timestamp': 'reading_ts',
            'TempOut(C)': 'temperature_c',
            'HumOut': 'humidity_pct',
            'RainRate(mm/hr)': 'rainfall_mm',
            'Barometer(hPa)': 'pressure_hpa',
            'WindSpeed(m/s)': 'windspeed_ms',
            'BatteryVolts': 'battery_voltage_v'
        }
        self.time_formats = [
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%d/%m/%Y %H:%M"
        ]

    def on_modified(self, event):
        """Handle file modification events with debouncing."""
        if event.is_directory or Path(event.src_path) != self.file_path:
            return

        current_time = time.time() * 1000  # Convert to milliseconds
        self.last_modified = current_time

        # Debounce: wait for settle period before processing
        time.sleep(self.settle_ms / 1000.0)

        # Only process if no new modifications occurred during settle period
        if current_time == self.last_modified:
            try:
                self._process_snapshot()
            except Exception as e:
                print(f"Error processing snapshot: {e}")

    def _process_snapshot(self):
        """Process entire snapshot file."""
        if not self.file_path.exists():
            print(f"Snapshot file does not exist: {self.file_path}")
            return

        try:
            # Get latest timestamp in database for this obs_id
            latest_ts = get_latest_reading_ts(self.obs_id)
            print(f"Latest timestamp in DB for {self.obs_id}: {latest_ts}")

            # Read entire file
            readings = []
            with open(self.file_path, 'r', encoding='utf-8', errors='replace') as f:
                if self.has_header:
                    # Skip header
                    next(f)

                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        reading = self._parse_line(line)
                        if reading:
                            # Only include readings newer than latest in DB
                            reading_ts = reading[1]  # reading_ts is second element
                            if not latest_ts or reading_ts > latest_ts:
                                readings.append(reading)
                    except Exception as e:
                        print(f"Error parsing line {line_num}: {e}")
                        print(f"Line content: {line[:100]}...")
                        continue

            # Batch insert new readings
            if readings:
                inserted = batch_insert_readings(readings)
                print(f"Inserted {inserted} new readings from snapshot for {self.obs_id}")
            else:
                print(f"No new readings found in snapshot for {self.obs_id}")

        except Exception as e:
            print(f"Error processing snapshot file: {e}")

    def _parse_line(self, line: str) -> Optional[Tuple]:
        """Parse a CSV line into database row tuple."""
        try:
            # Parse CSV line
            reader = csv.DictReader([line])
            row = next(reader)

            # Map fields
            reading_ts = self._parse_timestamp(row.get('Timestamp', ''))
            if not reading_ts:
                return None

            temperature_c = self._parse_float(row.get('TempOut(C)'))
            humidity_pct = self._parse_float(row.get('HumOut'))
            rainfall_mm = self._parse_float(row.get('RainRate(mm/hr)'))
            pressure_hpa = self._parse_float(row.get('Barometer(hPa)'))
            windspeed_ms = self._parse_float(row.get('WindSpeed(m/s)'))
            battery_voltage_v = self._parse_float(row.get('BatteryVolts'))

            # Store unmapped fields in JSON
            fields_json = {}
            for key, value in row.items():
                if key not in self.field_mapping and value:
                    fields_json[key] = value

            # Create raw line for checksum
            raw_line = ','.join([f"{k}={v}" for k, v in row.items()])
            line_checksum = hashlib.sha256(raw_line.encode('utf-8')).hexdigest()

            return (
                self.obs_id,
                reading_ts,
                temperature_c,
                humidity_pct,
                rainfall_mm,
                pressure_hpa,
                windspeed_ms,
                None,  # visibility_km
                None,  # battery_pct
                battery_voltage_v,
                json.dumps(fields_json) if fields_json else None,
                raw_line,
                line_checksum
            )

        except Exception as e:
            print(f"Error parsing line: {e}")
            return None

    def _parse_timestamp(self, timestamp_str: str) -> Optional[str]:
        """Parse timestamp string using multiple formats."""
        if not timestamp_str:
            return None

        for fmt in self.time_formats:
            try:
                dt = datetime.strptime(timestamp_str.strip(), fmt)
                return dt.strftime("%Y-%m-%d %H:%M:%S.%f")
            except ValueError:
                continue

        print(f"Could not parse timestamp: {timestamp_str}")
        return None

    def _parse_float(self, value: str) -> Optional[float]:
        """Parse string to float, return None if invalid."""
        if not value or value.strip() == '':
            return None
        try:
            return float(value.strip())
        except ValueError:
            return None

def main():
    """Main function to start the snapshot ingester."""
    # Load configuration
    data_file = os.getenv("DATA_FILE_SNAPSHOT")
    obs_id = os.getenv("OBS_ID", "ahm")
    has_header = os.getenv("CSV_HAS_HEADER", "true").lower() == "true"
    settle_ms = int(os.getenv("SETTLE_MS", "600"))

    if not data_file:
        print("ERROR: DATA_FILE_SNAPSHOT not set in .env")
        return

    data_path = Path(data_file)
    if not data_path.exists():
        print(f"ERROR: Data file does not exist: {data_path}")
        return

    print(f"Starting snapshot ingester for {obs_id}")
    print(f"Watching file: {data_path}")
    print(f"Has header: {has_header}")
    print(f"Settle time: {settle_ms}ms")

    # Create file handler
    event_handler = SnapshotFileHandler(str(data_path), obs_id, has_header, settle_ms)

    # Create observer
    observer = Observer()
    observer.schedule(event_handler, str(data_path.parent), recursive=False)

    # Start watching
    observer.start()
    print("File watcher started. Press Ctrl+C to stop.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping file watcher...")
        observer.stop()

    observer.join()
    print("Snapshot ingester stopped.")

if __name__ == "__main__":
    main()
