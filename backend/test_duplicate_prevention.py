#!/usr/bin/env python3
"""Test script to verify duplicate prevention in bulk loading."""

import mysql.connector
import os
import subprocess
import sys
from pathlib import Path

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'weather_stations')
}

def get_station_count(station_id):
    """Get current row count for a station."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM readings WHERE station_id = %s", (station_id,))
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return count
    except Exception as e:
        print(f"Database error: {e}")
        return None

def test_duplicate_prevention():
    """Test that re-running bulk load doesn't create duplicates."""
    print("🧪 Testing duplicate prevention...")

    # Get initial counts
    print("\n📊 Initial row counts:")
    initial_counts = {}
    for station_id in [1, 2, 3]:
        count = get_station_count(station_id)
        if count is not None:
            initial_counts[station_id] = count
            station_name = {1: "Udaipur", 2: "Ahmedabad", 3: "Mount Abu"}[station_id]
            print(f"  {station_name} (ID {station_id}): {count:,} rows")

    # Test Mount Abu specifically (known to have duplicates)
    print(f"\n🔄 Re-running Mount Abu bulk load...")
    try:
        result = subprocess.run([
            sys.executable, "bulk_load_weather.py",
            "--station", "mountabu",
            "--file", "data/mtabu_weather_6months.txt"
        ], capture_output=True, text=True, cwd=Path(__file__).parent)

        if result.returncode == 0:
            print("✅ Bulk load completed successfully")
            print("📝 Output:")
            print(result.stdout)
        else:
            print("❌ Bulk load failed")
            print("Error:", result.stderr)
            return False

    except Exception as e:
        print(f"❌ Error running bulk load: {e}")
        return False

    # Get final counts
    print("\n📊 Final row counts:")
    final_counts = {}
    for station_id in [1, 2, 3]:
        count = get_station_count(station_id)
        if count is not None:
            final_counts[station_id] = count
            station_name = {1: "Udaipur", 2: "Ahmedabad", 3: "Mount Abu"}[station_id]
            print(f"  {station_name} (ID {station_id}): {count:,} rows")

    # Check for changes
    print("\n🔍 Duplicate prevention analysis:")
    all_good = True
    for station_id in [1, 2, 3]:
        if station_id in initial_counts and station_id in final_counts:
            initial = initial_counts[station_id]
            final = final_counts[station_id]
            change = final - initial

            if change == 0:
                print(f"  ✅ {station_name}: No new rows (duplicates prevented)")
            elif change > 0:
                print(f"  ⚠️  {station_name}: +{change:,} new rows (may indicate duplicates)")
                all_good = False
            else:
                print(f"  ❓ {station_name}: {change:,} rows (unexpected)")
                all_good = False

    if all_good:
        print("\n🎉 SUCCESS: Duplicate prevention is working!")
    else:
        print("\n⚠️  WARNING: Some duplicates may have been created")

    return all_good

if __name__ == "__main__":
    test_duplicate_prevention()
