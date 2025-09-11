"""
FastAPI application for real-time weather data API.
Provides REST endpoints and Server-Sent Events for live data.
Refactored to align with ingestion schema: stations and readings tables.

Environment Configuration:
- The .env file must be plain text with UTF-8 encoding (no BOM).
- Example format:
  DB_USER=root
  DB_PASS=yourpassword
  DB_NAME=weather_stations
  DB_HOST=127.0.0.1
  DB_PORT=3306
"""
import json
import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from db import query

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables with BOM handling
try:
    load_dotenv(encoding="utf-8-sig")
    logger.info("Environment variables loaded successfully")
except Exception as e:
    logger.warning(f"Failed to load .env file: {e}. Using default values.")
    # Continue with defaults if .env loading fails

app = FastAPI(
    title="Weather Stations API",
    description="API for real-time weather data ingestion and retrieval",
    version="1.0.0"
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def serialize_datetime(obj):
    """Serialize datetime objects to ISO format strings."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def translate_reading_to_frontend(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Translate database reading row to frontend-friendly format.
    Maps ingestion schema columns to user-friendly frontend keys.
    """
    if not row:
        return row

    # Create a copy to avoid modifying the original
    translated = dict(row)

    # Map database columns to frontend-friendly keys
    column_mapping = {
        'station_id': 'station_id',  # Keep as-is
        'timestamp': 'reading_ts',   # Frontend expects reading_ts
        'temp_out_c': 'temperature_c',
        'hum_out': 'humidity_pct',
        'rain_day_mm': 'rainfall_mm',
        'barometer_hpa': 'pressure_hpa',
        'wind_speed_ms': 'windspeed_ms',
        'battery_status': 'battery_pct',
        'battery_volts': 'battery_voltage_v',
        'temp_in_c': 'temp_in_c',    # Keep as-is
        'hum_in': 'hum_in',          # Keep as-is
        'rain_rate_mm_hr': 'rain_rate_mm_hr',  # Keep as-is
        'solar_rad': 'solar_rad',    # Keep as-is
        'sunrise': 'sunrise',        # Keep as-is
        'sunset': 'sunset',          # Keep as-is
        'wind_dir': 'wind_dir',      # Keep as-is
    }

    # Apply translations
    for db_key, frontend_key in column_mapping.items():
        if db_key in translated:
            translated[frontend_key] = translated.pop(db_key)

    # Serialize datetime objects
    for key, value in translated.items():
        if isinstance(value, datetime):
            translated[key] = value.isoformat()
        elif key == 'fields_json' and value:
            try:
                translated[key] = json.loads(value)
            except json.JSONDecodeError:
                pass  # Keep as string if not valid JSON

    return translated

def translate_station_to_frontend(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Translate database station row to frontend-friendly format.
    Maps station_id to obs_id for backward compatibility.
    """
    if not row:
        return row

    translated = dict(row)

    # Map station columns to frontend keys
    if 'station_id' in translated:
        translated['obs_id'] = translated.pop('station_id')

    # Serialize datetime objects
    for key, value in translated.items():
        if isinstance(value, datetime):
            translated[key] = value.isoformat()

    return translated

@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Test database connection
        result = query("SELECT 1 as test", one=True)
        return {"ok": True, "database": "connected", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        return {"ok": False, "error": str(e), "timestamp": datetime.now().isoformat()}

@app.get("/latest")
async def get_latest():
    """Get latest readings for all stations."""
    try:
        sql = """
        SELECT r.*, s.name as station_name, s.location
        FROM readings r
        JOIN stations s ON r.station_id = s.station_id
        JOIN (
            SELECT station_id, MAX(timestamp) AS max_ts
        FROM readings
            GROUP BY station_id
        ) t ON t.station_id = r.station_id AND t.max_ts = r.timestamp
        ORDER BY r.station_id
        """

        results = query(sql)

        # Translate to frontend format
        translated_results = [translate_reading_to_frontend(row) for row in results]

        return {"data": translated_results, "count": len(translated_results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/range")
def range_obs(
    station_id: str = Query(..., description="Station ID (1, 2, 3) or 'all'"),
    start: str = Query(..., description="YYYY-MM-DDTHH:MM:SS"),
    end: str = Query(..., description="YYYY-MM-DDTHH:MM:SS"),
):
    """Get readings within a time range."""
    start_ts = start.replace("T", " ")
    end_ts = end.replace("T", " ")

    try:
        if station_id == "all":
            sql = """
            SELECT r.*, s.name as station_name, s.location
            FROM readings r
            JOIN stations s ON r.station_id = s.station_id
            WHERE r.timestamp >= %s AND r.timestamp < %s
            ORDER BY r.station_id, r.timestamp
            """
            results = query(sql, (start_ts, end_ts))
        else:
            sql = """
            SELECT r.*, s.name as station_name, s.location
            FROM readings r
            JOIN stations s ON r.station_id = s.station_id
            WHERE r.station_id = %s AND r.timestamp >= %s AND r.timestamp < %s
            ORDER BY r.timestamp
            """
            results = query(sql, (station_id, start_ts, end_ts))

        # Translate to frontend format
        translated_results = [translate_reading_to_frontend(row) for row in results]

        return {"data": translated_results, "count": len(translated_results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/series")
async def get_series(
    station_id: str = Query(..., description="Station ID (1, 2, 3)"),
    minutes: int = Query(60, description="Number of minutes to look back")
):
    """Get time series data for a specific station."""
    try:
        # Calculate start time
        start_time = datetime.now() - timedelta(minutes=minutes)
        start_time_str = start_time.strftime("%Y-%m-%d %H:%M:%S")

        sql = """
        SELECT r.*, s.name as station_name, s.location
        FROM readings r
        JOIN stations s ON r.station_id = s.station_id
        WHERE r.station_id = %s AND r.timestamp >= %s
        ORDER BY r.timestamp ASC
        """

        results = query(sql, (station_id, start_time_str))

        # Translate to frontend format
        translated_results = [translate_reading_to_frontend(row) for row in results]

        return {
            "station_id": station_id,
            "start_time": start_time.isoformat(),
            "minutes": minutes,
            "data": translated_results,
            "count": len(translated_results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/stream")
async def stream_data(station_id: Optional[str] = Query(None, description="Filter by station ID")):
    """Server-Sent Events stream for real-time data updates."""

    async def event_generator():
        """Generate SSE events every 3 seconds."""
        while True:
            try:
                # Get latest readings
                if station_id:
                    sql = """
                    SELECT r.*, s.name as station_name, s.location
                    FROM readings r
                    JOIN stations s ON r.station_id = s.station_id
                    WHERE r.station_id = %s
                    ORDER BY r.timestamp DESC
                    LIMIT 1
                    """
                    results = query(sql, (station_id,))
                else:
                    sql = """
                    SELECT r.*, s.name as station_name, s.location
                    FROM readings r
                    JOIN stations s ON r.station_id = s.station_id
                    JOIN (
                        SELECT station_id, MAX(timestamp) AS max_ts
                        FROM readings
                        GROUP BY station_id
                    ) t ON t.station_id = r.station_id AND t.max_ts = r.timestamp
                    ORDER BY r.station_id
                    """
                    results = query(sql)

                # Translate to frontend format
                translated_results = [translate_reading_to_frontend(row) for row in results]

                # Send SSE event
                event_data = {
                    "timestamp": datetime.now().isoformat(),
                    "data": translated_results,
                    "count": len(translated_results)
                }

                yield f"data: {json.dumps(event_data)}\n\n"

            except Exception as e:
                error_data = {
                    "timestamp": datetime.now().isoformat(),
                    "error": str(e),
                    "data": []
                }
                yield f"data: {json.dumps(error_data)}\n\n"

            # Wait 3 seconds before next update
            await asyncio.sleep(3)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

@app.get("/observatories")
async def get_observatories():
    """Get list of all stations."""
    try:
        sql = "SELECT station_id, name, location, created_at FROM stations ORDER BY station_id"
        results = query(sql)

        # Translate to frontend format
        translated_results = [translate_station_to_frontend(row) for row in results]

        return {"observatories": translated_results, "count": len(translated_results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Weather Stations API is running",
        "version": "1.0.0",
        "description": "API for real-time weather data from multiple stations",
        "endpoints": {
            "health": "/health",
            "latest": "/latest",
            "range": "/range?station_id=1&start=2025-01-01T00:00:00&end=2025-01-02T00:00:00",
            "series": "/series?station_id=1&minutes=60",
            "stream": "/stream",
            "observatories": "/observatories",
            "docs": "/docs"
        },
        "stations": {
            "1": "Udaipur",
            "2": "Ahmedabad",
            "3": "Mount Abu"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
