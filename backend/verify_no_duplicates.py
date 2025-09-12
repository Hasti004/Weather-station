#!/usr/bin/env python3
"""Verification helper to check for duplicates in the readings table."""

import mysql.connector
import os
from typing import Dict, List, Tuple

# Database configuration
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'weather_stations')
}

def get_connection():
    """Get database connection."""
    return mysql.connector.connect(**DB_CONFIG)

def check_total_counts() -> Dict[int, int]:
    """Check total row counts per station."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT station_id, COUNT(*) as total_rows
            FROM readings
            GROUP BY station_id
            ORDER BY station_id
        """)

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return {station_id: count for station_id, count in results}
    except Exception as e:
        print(f"Error getting total counts: {e}")
        return {}

def check_duplicates() -> List[Tuple[int, str, int]]:
    """Check for duplicate (station_id, timestamp) combinations."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT station_id, timestamp, COUNT(*) as duplicate_count
            FROM readings
            GROUP BY station_id, timestamp
            HAVING COUNT(*) > 1
            ORDER BY station_id, timestamp
            LIMIT 10
        """)

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return results
    except Exception as e:
        print(f"Error checking duplicates: {e}")
        return []

def check_unique_constraint() -> bool:
    """Check if unique constraint exists on (station_id, timestamp)."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.table_constraints
            WHERE table_schema = %s
              AND table_name = 'readings'
              AND constraint_name = 'unique_station_time'
        """, (DB_CONFIG['database'],))

        result = cursor.fetchone()
        cursor.close()
        conn.close()

        return result[0] > 0 if result else False
    except Exception as e:
        print(f"Error checking unique constraint: {e}")
        return False

def get_station_info() -> Dict[int, Dict[str, any]]:
    """Get detailed information about each station's data."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                station_id,
                COUNT(*) as total_rows,
                MIN(timestamp) as earliest,
                MAX(timestamp) as latest,
                COUNT(DISTINCT timestamp) as unique_timestamps
            FROM readings
            GROUP BY station_id
            ORDER BY station_id
        """)

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        station_info = {}
        for row in results:
            station_id, total, earliest, latest, unique_timestamps = row
            station_info[station_id] = {
                'total_rows': total,
                'earliest': earliest,
                'latest': latest,
                'unique_timestamps': unique_timestamps,
                'duplicates': total - unique_timestamps
            }

        return station_info
    except Exception as e:
        print(f"Error getting station info: {e}")
        return {}

def main():
    """Main verification function."""
    print("🔍 Verifying duplicate prevention implementation...")
    print("=" * 60)

    # Check unique constraint
    print("\n1️⃣ Checking unique constraint...")
    has_constraint = check_unique_constraint()
    if has_constraint:
        print("✅ Unique constraint 'unique_station_time' exists")
    else:
        print("❌ Unique constraint 'unique_station_time' NOT found")
        print("   Run the migration script to add the constraint")

    # Check total counts
    print("\n2️⃣ Checking total row counts...")
    counts = check_total_counts()
    station_names = {1: "Udaipur", 2: "Ahmedabad", 3: "Mount Abu"}

    for station_id in sorted(counts.keys()):
        station_name = station_names.get(station_id, f"Station {station_id}")
        count = counts[station_id]
        print(f"   {station_name} (ID {station_id}): {count:,} rows")

    # Check for duplicates
    print("\n3️⃣ Checking for duplicate (station_id, timestamp) combinations...")
    duplicates = check_duplicates()

    if not duplicates:
        print("✅ No duplicates found - all (station_id, timestamp) combinations are unique")
    else:
        print(f"❌ Found {len(duplicates)} duplicate combinations:")
        for station_id, timestamp, count in duplicates:
            station_name = station_names.get(station_id, f"Station {station_id}")
            print(f"   {station_name} (ID {station_id}) at {timestamp}: {count} copies")

    # Detailed station info
    print("\n4️⃣ Detailed station information...")
    station_info = get_station_info()

    for station_id in sorted(station_info.keys()):
        info = station_info[station_id]
        station_name = station_names.get(station_id, f"Station {station_id}")

        print(f"\n   {station_name} (ID {station_id}):")
        print(f"     Total rows: {info['total_rows']:,}")
        print(f"     Unique timestamps: {info['unique_timestamps']:,}")
        print(f"     Duplicates: {info['duplicates']:,}")
        print(f"     Date range: {info['earliest']} to {info['latest']}")

        if info['duplicates'] > 0:
            print(f"     ⚠️  This station has {info['duplicates']} duplicate rows")
        else:
            print(f"     ✅ No duplicates found")

    # Summary
    print("\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)

    if has_constraint and not duplicates:
        print("🎉 SUCCESS: Duplicate prevention is working correctly!")
        print("   - Unique constraint is in place")
        print("   - No duplicate rows found")
        print("   - Ingestion should be idempotent")
    else:
        print("⚠️  ISSUES FOUND:")
        if not has_constraint:
            print("   - Missing unique constraint")
        if duplicates:
            print(f"   - {len(duplicates)} duplicate combinations found")
        print("   - Run the migration script to fix these issues")

if __name__ == "__main__":
    main()
