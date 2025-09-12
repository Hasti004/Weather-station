#!/usr/bin/env python3
"""Test script to verify that ingestion is idempotent (no duplicates on re-run)."""

import subprocess
import sys
import time
from pathlib import Path
from verify_no_duplicates import get_connection, check_total_counts, check_duplicates

def get_station_count(station_id: int) -> int:
    """Get current row count for a specific station."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM readings WHERE station_id = %s", (station_id,))
        count = cursor.fetchone()[0]
        cursor.close()
        conn.close()
        return count
    except Exception as e:
        print(f"Error getting count for station {station_id}: {e}")
        return 0

def run_bulk_load(station: str, file_path: str) -> bool:
    """Run bulk load for a specific station."""
    try:
        print(f"🔄 Running bulk load for {station}...")
        result = subprocess.run([
            sys.executable, "bulk_load_weather.py",
            "--station", station,
            "--file", file_path
        ], capture_output=True, text=True, cwd=Path(__file__).parent)

        if result.returncode == 0:
            print("✅ Bulk load completed successfully")
            return True
        else:
            print("❌ Bulk load failed")
            print("Error:", result.stderr)
            return False
    except Exception as e:
        print(f"❌ Error running bulk load: {e}")
        return False

def test_idempotent_ingestion():
    """Test that re-running ingestion doesn't create duplicates."""
    print("🧪 Testing idempotent ingestion...")
    print("=" * 60)

    # Test Mount Abu (known to have had duplicates)
    station = "mountabu"
    file_path = "data/mtabu_weather_6months.txt"
    station_id = 3

    print(f"\n📊 Testing {station.upper()} station (ID {station_id})")

    # Get initial count
    print("\n1️⃣ Getting initial row count...")
    initial_count = get_station_count(station_id)
    print(f"   Initial count: {initial_count:,} rows")

    # Check for existing duplicates
    print("\n2️⃣ Checking for existing duplicates...")
    duplicates = check_duplicates()
    if duplicates:
        print(f"   ⚠️  Found {len(duplicates)} duplicate combinations before test")
        for station_id, timestamp, count in duplicates[:5]:  # Show first 5
            print(f"      Station {station_id} at {timestamp}: {count} copies")
    else:
        print("   ✅ No duplicates found before test")

    # Run bulk load
    print(f"\n3️⃣ Running bulk load for {station}...")
    success = run_bulk_load(station, file_path)

    if not success:
        print("❌ Test failed - bulk load did not complete successfully")
        return False

    # Get final count
    print("\n4️⃣ Getting final row count...")
    final_count = get_station_count(station_id)
    print(f"   Final count: {final_count:,} rows")

    # Check for new duplicates
    print("\n5️⃣ Checking for new duplicates...")
    new_duplicates = check_duplicates()
    if new_duplicates:
        print(f"   ❌ Found {len(new_duplicates)} duplicate combinations after test")
        for station_id, timestamp, count in new_duplicates[:5]:  # Show first 5
            print(f"      Station {station_id} at {timestamp}: {count} copies")
    else:
        print("   ✅ No duplicates found after test")

    # Analyze results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)

    count_change = final_count - initial_count

    if count_change == 0:
        print("🎉 SUCCESS: Row count unchanged - ingestion is idempotent!")
        print("   - No new rows were inserted")
        print("   - Duplicates were properly skipped")
        print("   - The upsert pattern is working correctly")
    elif count_change > 0:
        print(f"⚠️  WARNING: Row count increased by {count_change:,} rows")
        print("   - This suggests duplicates may have been created")
        print("   - Check if the unique constraint is properly applied")
    else:
        print(f"❓ UNEXPECTED: Row count decreased by {abs(count_change):,} rows")
        print("   - This is unexpected behavior")

    if new_duplicates:
        print(f"❌ FAILURE: {len(new_duplicates)} duplicate combinations found")
        print("   - The unique constraint may not be working")
        print("   - Run the migration script to fix this")
    else:
        print("✅ SUCCESS: No duplicate combinations found")

    return count_change == 0 and not new_duplicates

def main():
    """Main test function."""
    print("🧪 Testing Idempotent Ingestion")
    print("This test verifies that re-running bulk load doesn't create duplicates")
    print("=" * 60)

    # Check if we're in the right directory
    if not Path("bulk_load_weather.py").exists():
        print("❌ Error: bulk_load_weather.py not found in current directory")
        print("   Please run this script from the backend directory")
        return False

    if not Path("data/mtabu_weather_6months.txt").exists():
        print("❌ Error: data/mtabu_weather_6months.txt not found")
        print("   Please ensure the data file exists")
        return False

    # Run the test
    success = test_idempotent_ingestion()

    if success:
        print("\n🎉 ALL TESTS PASSED!")
        print("   Duplicate prevention is working correctly")
    else:
        print("\n❌ TESTS FAILED!")
        print("   Please check the issues above and run the migration script")

    return success

if __name__ == "__main__":
    main()
