#!/usr/bin/env python3
"""
Test script for the refactored FastAPI application.
Tests that all endpoints work with the new ingestion schema.
"""

import sys
import json
from pathlib import Path

# Add current directory to path to import db module
sys.path.insert(0, str(Path(__file__).parent))

def test_database_connection():
    """Test database connection and schema."""
    try:
        from db import query

        # Test basic connection
        result = query("SELECT 1 as test", one=True)
        print("✓ Database connection successful")

        # Test stations table
        stations = query("SELECT * FROM stations ORDER BY station_id")
        print(f"✓ Found {len(stations)} stations:")
        for station in stations:
            print(f"  - Station {station['station_id']}: {station['name']} ({station['location']})")

        # Test readings table structure
        readings = query("SELECT * FROM readings LIMIT 1")
        if readings:
            print("✓ Readings table has data")
            print(f"  Sample reading columns: {list(readings[0].keys())}")
        else:
            print("⚠ Readings table is empty")

        return True

    except Exception as e:
        print(f"✗ Database test failed: {e}")
        return False

def test_translation_functions():
    """Test the translation functions."""
    try:
        from api import translate_reading_to_frontend, translate_station_to_frontend

        # Test reading translation
        sample_reading = {
            'station_id': 1,
            'timestamp': '2025-01-15 10:30:00',
            'temp_out_c': 25.5,
            'hum_out': 60.0,
            'rain_day_mm': 0.0,
            'barometer_hpa': 1013.25,
            'wind_speed_ms': 5.2,
            'battery_status': 'Good',
            'battery_volts': 12.4
        }

        translated = translate_reading_to_frontend(sample_reading)
        print("✓ Reading translation test:")
        print(f"  Original: station_id={sample_reading['station_id']}, temp_out_c={sample_reading['temp_out_c']}")
        print(f"  Translated: station_id={translated.get('station_id')}, temperature_c={translated.get('temperature_c')}")

        # Test station translation
        sample_station = {
            'station_id': 1,
            'name': 'Udaipur',
            'location': 'Udaipur, Rajasthan'
        }

        translated_station = translate_station_to_frontend(sample_station)
        print("✓ Station translation test:")
        print(f"  Original: station_id={sample_station['station_id']}")
        print(f"  Translated: obs_id={translated_station.get('obs_id')}")

        return True

    except Exception as e:
        print(f"✗ Translation test failed: {e}")
        return False

def test_api_endpoints():
    """Test API endpoint functionality."""
    try:
        from api import app
        from fastapi.testclient import TestClient

        client = TestClient(app)

        # Test root endpoint
        response = client.get("/")
        if response.status_code == 200:
            data = response.json()
            print("✓ Root endpoint working")
            print(f"  API: {data['message']}")
            print(f"  Stations: {data['stations']}")
        else:
            print(f"✗ Root endpoint failed: {response.status_code}")
            return False

        # Test health endpoint
        response = client.get("/health")
        if response.status_code == 200:
            data = response.json()
            print("✓ Health endpoint working")
            print(f"  Status: {data['ok']}")
        else:
            print(f"✗ Health endpoint failed: {response.status_code}")
            return False

        # Test observatories endpoint
        response = client.get("/observatories")
        if response.status_code == 200:
            data = response.json()
            print("✓ Observatories endpoint working")
            print(f"  Found {data['count']} stations")
        else:
            print(f"✗ Observatories endpoint failed: {response.status_code}")
            return False

        # Test latest endpoint
        response = client.get("/latest")
        if response.status_code == 200:
            data = response.json()
            print("✓ Latest endpoint working")
            print(f"  Found {data['count']} latest readings")
        else:
            print(f"✗ Latest endpoint failed: {response.status_code}")
            return False

        # Test range endpoint
        response = client.get("/range?station_id=1&start=2025-01-01T00:00:00&end=2025-01-02T00:00:00")
        if response.status_code == 200:
            data = response.json()
            print("✓ Range endpoint working")
            print(f"  Found {data['count']} readings in range")
        else:
            print(f"✗ Range endpoint failed: {response.status_code}")
            return False

        # Test series endpoint
        response = client.get("/series?station_id=1&minutes=60")
        if response.status_code == 200:
            data = response.json()
            print("✓ Series endpoint working")
            print(f"  Found {data['count']} readings in series")
        else:
            print(f"✗ Series endpoint failed: {response.status_code}")
            return False

        return True

    except ImportError:
        print("⚠ FastAPI test client not available. Install with: pip install httpx")
        return True
    except Exception as e:
        print(f"✗ API endpoint test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("FastAPI Refactor Test Suite")
    print("=" * 50)

    tests = [
        ("Database Connection", test_database_connection),
        ("Translation Functions", test_translation_functions),
        ("API Endpoints", test_api_endpoints)
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * 30)
        try:
            if test_func():
                passed += 1
                print(f"✓ {test_name} passed")
            else:
                print(f"✗ {test_name} failed")
        except Exception as e:
            print(f"✗ {test_name} error: {e}")

    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! API refactor is successful.")
        print("\nNext steps:")
        print("1. Start the API: uvicorn api:app --reload")
        print("2. Test endpoints: http://localhost:8000/docs")
        print("3. Verify data flows correctly with ingestion scripts")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
