#!/usr/bin/env python3
"""Fix duplicate readings and apply unique constraint."""

import mysql.connector
import os

# Database configuration (using defaults)
DB_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'root',
    'password': '',
    'database': 'weather_stations'
}

def get_current_counts():
    """Get current row counts for all stations."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT station_id, COUNT(*) as total_rows,
                   COUNT(DISTINCT CONCAT(station_id, '|', timestamp)) as unique_combinations
            FROM readings
            GROUP BY station_id
            ORDER BY station_id
        """)

        results = cursor.fetchall()
        cursor.close()
        conn.close()

        return results
    except Exception as e:
        print(f"Error getting counts: {e}")
        return []

def remove_duplicates():
    """Remove duplicate readings, keeping only the latest record for each (station_id, timestamp) pair."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("🧹 Removing duplicate readings...")

        # Create a temporary table with only unique records (keeping the latest by id)
        cursor.execute("""
            CREATE TEMPORARY TABLE readings_clean AS
            SELECT r1.*
            FROM readings r1
            INNER JOIN (
                SELECT station_id, timestamp, MAX(id) as max_id
                FROM readings
                GROUP BY station_id, timestamp
            ) r2 ON r1.station_id = r2.station_id
                AND r1.timestamp = r2.timestamp
                AND r1.id = r2.max_id
        """)

        # Get counts after deduplication
        cursor.execute("SELECT station_id, COUNT(*) FROM readings_clean GROUP BY station_id ORDER BY station_id")
        clean_counts = cursor.fetchall()

        print("📊 Cleaned counts:")
        for station_id, count in clean_counts:
            station_name = {1: "Udaipur", 2: "Ahmedabad", 3: "Mount Abu"}[station_id]
            print(f"  {station_name} (ID {station_id}): {count:,} rows")

        # Replace the original table with cleaned data
        print("🔄 Replacing original table with cleaned data...")
        cursor.execute("TRUNCATE TABLE readings")
        cursor.execute("INSERT INTO readings SELECT * FROM readings_clean")

        conn.commit()
        print("✅ Duplicates removed successfully!")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error removing duplicates: {e}")

def add_unique_constraint():
    """Add unique constraint to prevent future duplicates."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("🔒 Adding unique constraint...")

        # Add unique index
        cursor.execute("""
            ALTER TABLE readings
            ADD UNIQUE INDEX unique_station_time (station_id, timestamp)
        """)

        conn.commit()
        print("✅ Unique constraint added successfully!")

        # Verify the constraint was added
        cursor.execute("SHOW INDEX FROM readings WHERE Key_name = 'unique_station_time'")
        result = cursor.fetchone()
        if result:
            print(f"✅ Constraint verified: {result}")

        cursor.close()
        conn.close()

    except mysql.connector.Error as e:
        if e.errno == 1061:  # Duplicate key name
            print("✅ Unique constraint already exists!")
        else:
            print(f"❌ Error adding constraint: {e}")

def main():
    """Main function to fix duplicates and add constraint."""
    print("🔧 Fixing duplicate readings and adding unique constraint...")

    # Show current state
    print("\n📊 Current state:")
    counts = get_current_counts()
    for station_id, total, unique in counts:
        station_name = {1: "Udaipur", 2: "Ahmedabad", 3: "Mount Abu"}[station_id]
        duplicates = total - unique
        print(f"  {station_name} (ID {station_id}): {total:,} total, {unique:,} unique, {duplicates:,} duplicates")

    # Remove duplicates
    remove_duplicates()

    # Add unique constraint
    add_unique_constraint()

    # Show final state
    print("\n📊 Final state:")
    counts = get_current_counts()
    for station_id, total, unique in counts:
        station_name = {1: "Udaipur", 2: "Ahmedabad", 3: "Mount Abu"}[station_id]
        print(f"  {station_name} (ID {station_id}): {total:,} rows")

    print("\n🎉 All done! Duplicates removed and unique constraint added.")

if __name__ == "__main__":
    main()
