# view_data.py
from db import query

# View all stations
print("=== STATIONS ===")
stations = query("SELECT * FROM stations")
for station in stations:
    print(station)

# View latest readings
print("\n=== LATEST READINGS ===")
latest = query("""
    SELECT s.name, r.*
    FROM readings r
    JOIN stations s ON r.station_id = s.station_id
    ORDER BY r.timestamp DESC
    LIMIT 10
""")
for reading in latest:
    print(reading)

# Count readings per station
print("\n=== READING COUNTS ===")
counts = query("""
    SELECT s.name, COUNT(*) as count
    FROM readings r
    JOIN stations s ON r.station_id = s.station_id
    GROUP BY s.name
""")
for count in counts:
    print(f"{count['name']}: {count['count']} readings")
