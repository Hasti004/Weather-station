#!/usr/bin/env python3
"""
Bulk load historical weather data from .txt files into MySQL.

This script loads historical weather data from text files into the weather_stations database.
Each station has different sensors, so column mapping is configured per station.

Usage:
    python bulk_load_weather.py --station ahmedabad --file backend/data/ahm_weather_6months.txt
    python bulk_load_weather.py --all

Requirements:
    - MySQL database with weather_stations schema
    - Text files with comma-separated values
    - Station configuration for column mapping
"""

import argparse
import hashlib
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

import mysql.connector
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
DOTENV = BASE_DIR / ".env"

def _load_env_safely():
    """Load environment variables with BOM handling."""
    try:
        load_dotenv(dotenv_path=str(DOTENV), override=True, encoding="utf-8-sig")
    except Exception:
        try:
            load_dotenv(dotenv_path=str(DOTENV), override=True, encoding="utf-8")
        except Exception:
            try:
                load_dotenv(dotenv_path=str(DOTENV), override=True, encoding="utf-16")
            except Exception as e:
                print(f"[env] failed to load .env: {e}. Using defaults.")
                load_dotenv(override=True)

_load_env_safely()

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'weather_stations'),
    'autocommit': False
}

# Station configuration mapping file columns to database schema
STATION_CONFIG = {
    "ahmedabad": {
        "station_id": 2,
        "columns": ["timestamp", "barometer_hpa", "battery_status", "battery_volts",
                   "hum_in", "hum_out", "rain_day_mm", "rain_rate_mm_hr",
                   "solar_rad", "sunrise", "sunset", "temp_in_c", "temp_out_c",
                   "wind_dir", "wind_speed_ms"]
    },
    "udaipur": {
        "station_id": 1,
        "columns": ["timestamp", "barometer_hpa", "battery_status", "battery_volts",
                   "hum_in", "hum_out", "rain_day_mm", "rain_rate_mm_hr",
                   "solar_rad", "sunrise", "sunset", "temp_in_c", "temp_out_c",
                   "wind_dir", "wind_speed_ms"]
    },
    "mountabu": {
        "station_id": 3,
        "columns": ["timestamp", "hum_in", "hum_out", "rain_day_mm", "rain_rate_mm_hr",
                   "solar_rad", "sunrise", "sunset", "temp_in_c", "temp_out_c",
                   "wind_dir", "wind_speed_ms"]  # Missing barometer and battery sensors
    }
}

# File patterns for auto-discovery
FILE_PATTERNS = {
    "ahmedabad": ["ahm_weather_6months.txt", "ahm_with_headers.txt", "ahmedabad_*.txt"],
    "udaipur": ["udi_weather_6months.txt", "udi_with_headers.txt", "udaipur_*.txt"],
    "mountabu": ["mtabu_weather_6months.txt", "mtabu_no_headers.txt", "mountabu_*.txt"]
}

def clean_value(val: str) -> Optional[Any]:
    """
    Clean and convert a string value to appropriate type.

    Args:
        val: Raw string value from CSV

    Returns:
        None for invalid/missing values, float for numeric, string for text
    """
    if not val or val.strip() == "":
        return None

    val = val.strip()

    # Handle common null/missing value indicators
    if val.upper() in ["", "NA", "NAN", "NULL", "-999", "N/A"]:
        return None

    # Try to convert to numeric
    try:
        num_val = float(val)
        # Handle special numeric null indicators
        if num_val == -999 or num_val == -999.0:
            return None
        # Round to 1 decimal place for numeric values
        return round(num_val, 1)
    except ValueError:
        # Return as string for non-numeric values (like wind_dir, battery_status)
        return val

def parse_timestamp(ts_str: str) -> Optional[str]:
    """
    Parse and normalize timestamp string.

    Args:
        ts_str: Raw timestamp string

    Returns:
        Normalized timestamp string or None if invalid
    """
    if not ts_str or ts_str.strip() == "":
        return None

    ts_str = ts_str.strip()

    # Handle common timestamp formats
    try:
        # Try parsing as ISO format: 2025-03-11 00:00:00
        dt = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        try:
            # Try alternative format: 2025-03-11T00:00:00
            dt = datetime.strptime(ts_str, "%Y-%m-%dT%H:%M:%S")
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except ValueError:
            try:
                # Try date only format: 2025-03-11
                dt = datetime.strptime(ts_str, "%Y-%m-%d")
                return dt.strftime("%Y-%m-%d 00:00:00")
            except ValueError:
                print(f"Warning: Could not parse timestamp: {ts_str}")
                return None

def parse_time_value(time_str: str) -> Optional[str]:
    """
    Parse time values like sunrise/sunset.

    Args:
        time_str: Time string like "06:11" or "17:48"

    Returns:
        Normalized time string or None if invalid
    """
    if not time_str or time_str.strip() == "":
        return None

    time_str = time_str.strip()

    # Handle HH:MM format
    if re.match(r'^\d{1,2}:\d{2}$', time_str):
        try:
            # Validate time format
            datetime.strptime(time_str, "%H:%M")
            return time_str
        except ValueError:
            pass

    return None

def parse_line(station: str, line: str) -> Optional[Dict[str, Any]]:
    """
    Parse a single line from the data file.

    Args:
        station: Station name (key in STATION_CONFIG)
        line: Raw CSV line

    Returns:
        Dictionary mapping database columns to cleaned values
    """
    if station not in STATION_CONFIG:
        raise ValueError(f"Unknown station: {station}")

    config = STATION_CONFIG[station]
    columns = config["columns"]

    # Split line by comma
    parts = [part.strip() for part in line.split(',')]

    if len(parts) < len(columns):
        print(f"Warning: Line has {len(parts)} parts but expected {len(columns)}: {line[:100]}...")
        return None

    # Map parts to database columns
    result = {
        "station_id": config["station_id"]
    }

    for i, column in enumerate(columns):
        if i < len(parts):
            raw_value = parts[i]

            if column == "timestamp":
                result[column] = parse_timestamp(raw_value)
            elif column in ["sunrise", "sunset"]:
                result[column] = parse_time_value(raw_value)
            else:
                result[column] = clean_value(raw_value)
        else:
            result[column] = None

    # Validate required fields
    if not result.get("timestamp"):
        return None

    return result

def generate_checksum(line: str) -> str:
    """Generate SHA256 checksum for line deduplication."""
    return hashlib.sha256(line.encode('utf-8')).hexdigest()

def insert_bulk(station_id: int, rows: List[Dict[str, Any]]) -> int:
    """
    Insert multiple rows into the readings table.

    Args:
        station_id: Station ID
        rows: List of reading dictionaries

    Returns:
        Number of rows actually inserted
    """
    if not rows:
        return 0

    # Prepare INSERT statement
    insert_sql = """
    INSERT IGNORE INTO readings (
        station_id, timestamp, barometer_hpa, battery_status, battery_volts,
        hum_in, hum_out, rain_day_mm, rain_rate_mm_hr, solar_rad,
        sunrise, sunset, temp_in_c, temp_out_c, wind_dir, wind_speed_ms
    ) VALUES (
        %(station_id)s, %(timestamp)s, %(barometer_hpa)s, %(battery_status)s, %(battery_volts)s,
        %(hum_in)s, %(hum_out)s, %(rain_day_mm)s, %(rain_rate_mm_hr)s, %(solar_rad)s,
        %(sunrise)s, %(sunset)s, %(temp_in_c)s, %(temp_out_c)s, %(wind_dir)s, %(wind_speed_ms)s
    )
    """

    conn = mysql.connector.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor()

        # Execute batch insert
        cursor.executemany(insert_sql, rows)
        inserted_count = cursor.rowcount

        conn.commit()
        return inserted_count

    except mysql.connector.Error as e:
        print(f"Database error during bulk insert: {e}")
        conn.rollback()
        return 0
    finally:
        cursor.close()
        conn.close()

def load_txt(station_name: str, filepath: Path) -> int:
    """
    Load data from a text file into the database.

    Args:
        station_name: Station name (key in STATION_CONFIG)
        filepath: Path to the data file

    Returns:
        Number of rows inserted
    """
    if not filepath.exists():
        print(f"Error: File not found: {filepath}")
        return 0

    if station_name not in STATION_CONFIG:
        print(f"Error: Unknown station: {station_name}")
        return 0

    print(f"Loading {station_name} data from {filepath}...")

    config = STATION_CONFIG[station_name]
    station_id = config["station_id"]

    rows = []
    line_count = 0
    error_count = 0

    try:
        with filepath.open('r', encoding='utf-8', errors='replace') as f:
            # Skip header line if present
            first_line = f.readline().strip()
            if first_line.lower().startswith('timestamp') or 'timestamp' in first_line.lower():
                print("  Skipping header line")
            else:
                # Process first line as data
                f.seek(0)

            for line_num, line in enumerate(f, start=2 if first_line else 1):
                line = line.strip()
                if not line:
                    continue

                line_count += 1

                try:
                    parsed = parse_line(station_name, line)
                    if parsed:
                        rows.append(parsed)
                    else:
                        error_count += 1
                        if error_count <= 5:  # Show first few errors
                            print(f"  Warning: Could not parse line {line_num}: {line[:100]}...")
                except Exception as e:
                    error_count += 1
                    if error_count <= 5:
                        print(f"  Error parsing line {line_num}: {e}")

                # Process in batches of 1000
                if len(rows) >= 1000:
                    inserted = insert_bulk(station_id, rows)
                    print(f"  Inserted batch of {inserted} rows")
                    rows = []

        # Insert remaining rows
        if rows:
            inserted = insert_bulk(station_id, rows)
            print(f"  Inserted final batch of {inserted} rows")

        # Get total inserted count
        conn = mysql.connector.connect(**DB_CONFIG)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM readings WHERE station_id = %s", (station_id,))
            total_count = cursor.fetchone()[0]
        finally:
            cursor.close()
            conn.close()

        print(f"  Processed {line_count} lines, {error_count} errors")
        print(f"  Station {station_name} now has {total_count} total readings")

        return line_count - error_count

    except Exception as e:
        print(f"Error reading file {filepath}: {e}")
        return 0

def find_data_files(data_dir: Path) -> Dict[str, List[Path]]:
    """
    Find data files for each station in the data directory.

    Args:
        data_dir: Path to the data directory

    Returns:
        Dictionary mapping station names to lists of file paths
    """
    found_files = {}

    for station, patterns in FILE_PATTERNS.items():
        station_files = []

        for pattern in patterns:
            if '*' in pattern:
                # Use glob for wildcard patterns
                matches = list(data_dir.glob(pattern))
                station_files.extend(matches)
            else:
                # Direct file check
                file_path = data_dir / pattern
                if file_path.exists():
                    station_files.append(file_path)

        if station_files:
            found_files[station] = station_files

    return found_files

def main():
    """Main function with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Bulk load historical weather data from .txt files into MySQL",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python bulk_load_weather.py --station ahmedabad --file backend/data/ahm_weather_6months.txt
  python bulk_load_weather.py --station udaipur --file backend/data/udi_weather_6months.txt
  python bulk_load_weather.py --all
  python bulk_load_weather.py --all --data-dir /path/to/data
        """
    )

    parser.add_argument(
        '--station',
        choices=['ahmedabad', 'udaipur', 'mountabu'],
        help='Station name to load data for'
    )

    parser.add_argument(
        '--file',
        type=Path,
        help='Path to the data file to load'
    )

    parser.add_argument(
        '--all',
        action='store_true',
        help='Load all available data files from the data directory'
    )

    parser.add_argument(
        '--data-dir',
        type=Path,
        default=Path('backend/data'),
        help='Directory containing data files (default: backend/data)'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Parse files but do not insert into database'
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.all and (not args.station or not args.file):
        parser.error("Either use --all or specify both --station and --file")

    if args.station and not args.file:
        parser.error("--file is required when --station is specified")

    if args.file and not args.station:
        parser.error("--station is required when --file is specified")

    # Test database connection
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM stations")
        station_count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        print(f"✓ Database connection successful. Found {station_count} stations.")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return 1

    total_inserted = 0

    if args.all:
        # Load all files from data directory
        data_dir = args.data_dir
        if not data_dir.exists():
            print(f"Error: Data directory not found: {data_dir}")
            return 1

        print(f"Scanning for data files in {data_dir}...")
        found_files = find_data_files(data_dir)

        if not found_files:
            print("No data files found!")
            return 1

        for station, files in found_files.items():
            print(f"\n=== Processing {station.upper()} ===")
            for file_path in files:
                if args.dry_run:
                    print(f"[DRY RUN] Would load {file_path}")
                else:
                    inserted = load_txt(station, file_path)
                    total_inserted += inserted

    else:
        # Load specific file
        if args.dry_run:
            print(f"[DRY RUN] Would load {args.station} from {args.file}")
        else:
            inserted = load_txt(args.station, args.file)
            total_inserted += inserted

    if not args.dry_run:
        print(f"\n=== SUMMARY ===")
        print(f"Total rows processed: {total_inserted}")

        # Show current database status
        try:
            conn = mysql.connector.connect(**DB_CONFIG)
            cursor = conn.cursor(dictionary=True)

            cursor.execute("""
                SELECT s.name, s.location, COUNT(r.id) as reading_count,
                       MIN(r.timestamp) as earliest, MAX(r.timestamp) as latest
                FROM stations s
                LEFT JOIN readings r ON s.station_id = r.station_id
                GROUP BY s.station_id, s.name, s.location
                ORDER BY s.station_id
            """)

            print("\nCurrent database status:")
            for row in cursor.fetchall():
                print(f"  {row['name']}: {row['reading_count']} readings")
                if row['earliest'] and row['latest']:
                    print(f"    Range: {row['earliest']} to {row['latest']}")

            cursor.close()
            conn.close()

        except Exception as e:
            print(f"Could not fetch database status: {e}")

    return 0

if __name__ == "__main__":
    exit(main())
