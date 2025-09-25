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
from fastapi.responses import StreamingResponse, JSONResponse
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

# CSV export helpers and constants
STATION_ALIAS = {
    "udaipur": 1,
    "ahmedabad": 2,
    "mountabu": 3,
    "abu": 3,
    "mtabu": 3,
}

# Use the same time column as /range in this repository
TIME_COL = "timestamp"

def resolve_station_id(value: Any) -> int:
    """Accept int, numeric string, or alias; return int or raise ValueError."""
    if value is None:
        raise ValueError("station_id is required")
    s = str(value).strip().lower()
    if s.isdigit():
        return int(s)
    if s in STATION_ALIAS:
        return STATION_ALIAS[s]
    raise ValueError("Unknown station_id. Use 1/2/3 or udaipur/ahmedabad/mountabu")

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

@app.get("/download/csv")
async def download_csv(
    station_id: str = Query(..., description="Station ID (1, 2, 3) or alias: udaipur/ahmedabad/mountabu"),
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Robust CSV download independent of /export/csv with strict validation and streaming."""
    # INFO: log raw inputs
    logger.info(f"/download/csv params station_id={station_id}, start={start}, end={end}")
    try:
        # Normalize station id (aliases to numeric)
        try:
            station_norm = resolve_station_id(station_id)
        except ValueError as ve:
            return JSONResponse(status_code=400, content={"detail": str(ve)})

        # Parse dates strictly as YYYY-MM-DD
        try:
            start_dt = datetime.strptime(start, '%Y-%m-%d')
            end_dt = datetime.strptime(end, '%Y-%m-%d')
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid date format (expected YYYY-MM-DD)"})

        # Build bounds and validate ordering
        start_ts = f"{start} 00:00:00"
        end_ts = f"{end} 23:59:59"
        if start_dt > end_dt:
            return JSONResponse(status_code=400, content={"detail": "start must be <= end"})

        # Ensure station exists (robust COUNT check)
        exists_rows = query("SELECT COUNT(1) AS cnt FROM stations WHERE station_id=%s", (station_norm,))
        try:
            exists_cnt = (exists_rows or [{}])[0].get('cnt', 0)
        except Exception:
            exists_cnt = 0
        logger.info(f"/download/csv station existence check id={station_norm} count={exists_cnt}")
        if not exists_cnt:
            return JSONResponse(status_code=400, content={"detail": f"Unknown station_id: {station_id}"})

        # Use same time column as /range
        time_column = TIME_COL

        # Preferred column order; will intersect with actual columns
        preferred_columns = [
            'station_id',
            time_column,
            'temperature_c', 'humidity_pct', 'rainfall_mm', 'pressure_hpa', 'windspeed_ms', 'wind_dir', 'battery_pct', 'battery_voltage_v',
            'temp_in_c', 'temp_out_c', 'hum_in', 'hum_out', 'rain_day_mm', 'rain_rate_mm_hr',
            'solar_rad', 'sunrise', 'sunset', 'created_at'
        ]

        # Probe a single row to detect available keys
        probe_sql = (
            f"SELECT * FROM readings WHERE station_id=%s AND {time_column} BETWEEN %s AND %s ORDER BY {time_column} ASC LIMIT 1"
        )
        probe = query(probe_sql, (station_norm, start_ts, end_ts)) or []
        available_keys = set(probe[0].keys()) if probe else set()
        # Select final column list by intersection, preserving order
        if available_keys:
            selected_columns = [c for c in preferred_columns if c in available_keys]
        else:
            # Fallback minimal set
            selected_columns = [c for c in preferred_columns if c in { 'station_id', time_column, 'temp_out_c', 'hum_out', 'rain_day_mm', 'barometer_hpa', 'wind_speed_ms', 'wind_dir', 'battery_status', 'battery_volts', 'solar_rad' }]

        # Prepare query for streaming with LIMIT/OFFSET in chunks
        base_sql = (
            f"SELECT {', '.join(selected_columns)} FROM readings "
            f"WHERE station_id = %s AND {time_column} BETWEEN %s AND %s "
            f"ORDER BY {time_column} ASC LIMIT %s OFFSET %s"
        )

        # Normalizers for CSV
        from decimal import Decimal
        import csv
        from io import StringIO
        import math

        def norm(v):
            if v is None:
                return ''
            if isinstance(v, datetime):
                return v.strftime('%Y-%m-%d %H:%M:%S')
            if isinstance(v, Decimal):
                return str(v)
            if isinstance(v, bytes):
                try:
                    return v.decode('utf-8', errors='ignore')
                except Exception:
                    return ''
            if isinstance(v, (dict, list)):
                try:
                    return json.dumps(v, ensure_ascii=False)
                except Exception:
                    return str(v)
            return v

        # INFO log resolved bounds, time column and columns
        logger.info(f"/download/csv resolved station_id={station_norm}, start_ts={start_ts}, end_ts={end_ts}, time_column={time_column}")
        logger.info(f"/download/csv columns: {selected_columns}")

        # Stream generator
        def generate():
            output = StringIO()
            writer = csv.writer(output)
            # Header equals the selected column names
            writer.writerow(selected_columns)
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

            total = 0
            chunk = 10000
            offset = 0
            while True:
                rows = query(base_sql, (station_norm, start_ts, end_ts, chunk, offset))
                if not rows:
                    break
                for r in rows:
                    row_out = [norm(r.get(col)) for col in selected_columns]
                    writer.writerow(row_out)
                    total += 1
                yield output.getvalue()
                output.seek(0)
                output.truncate(0)
                offset += chunk

            # INFO: final count
            logger.info(f"/download/csv streamed rows={total}")

        filename = f"station_{station_id}_{start}_to_{end}.csv"
        return StreamingResponse(
            generate(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\""
            }
        )
    except Exception as e:
        logger.exception("/download/csv failed")
        return JSONResponse(status_code=500, content={"detail": "Failed to build CSV. Please try again."})

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

@app.get("/availability")
async def get_availability(
    station_id: int = Query(..., description="Station ID (1, 2, 3)"),
    year: int = Query(..., description="Year (e.g., 2025)"),
    month: int = Query(..., description="Month (1-12)")
):
    """Get daily availability for a station in a specific month."""
    try:
        # Validate inputs
        if month < 1 or month > 12:
            raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
        if year < 2020 or year > 2030:
            raise HTTPException(status_code=400, detail="Year must be between 2020 and 2030")

        # Get the number of days in the month
        import calendar
        days_in_month = calendar.monthrange(year, month)[1]

        # Query to get available dates for the month
        sql = """
        SELECT DISTINCT DATE(timestamp) as date
        FROM readings
        WHERE station_id = %s
          AND YEAR(timestamp) = %s
          AND MONTH(timestamp) = %s
        ORDER BY date
        """

        available_dates = query(sql, (station_id, year, month))
        available_date_set = {row['date'].strftime('%Y-%m-%d') for row in available_dates}

        # Build the days array
        days = []
        for day in range(1, days_in_month + 1):
            date_str = f"{year}-{month:02d}-{day:02d}"

            # Determine status
            if date_str in available_date_set:
                status = "available"
            else:
                # Check if it's a future date
                from datetime import date
                today = date.today()
                current_date = date(year, month, day)

                if current_date > today:
                    status = "out"
                else:
                    status = "missing"

            days.append({"day": day, "status": status})

        return {
            "station_id": station_id,
            "year": year,
            "month": month,
            "days": days
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching availability for station {station_id}, {year}-{month}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/export/csv")
async def export_csv(
    station_id: int = Query(..., description="Station ID (1, 2, 3)"),
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Export weather data as CSV for a date range."""
    try:
        # Validate date format
        from datetime import datetime
        try:
            start_date = datetime.strptime(start, '%Y-%m-%d')
            end_date = datetime.strptime(end, '%Y-%m-%d')
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

        # Check date range (max 1 year)
        if (end_date - start_date).days > 365:
            raise HTTPException(status_code=400, detail="Date range cannot exceed 1 year")

        # Get station name
        station_sql = "SELECT name FROM stations WHERE station_id = %s"
        station_result = query(station_sql, (station_id,))
        if not station_result:
            raise HTTPException(status_code=404, detail="Station not found")

        station_name = station_result[0]['name']

        # Query the data
        sql = """
        SELECT
            station_id,
            timestamp,
            temp_out_c as temperature_c,
            hum_out as humidity_pct,
            rain_day_mm as rainfall_mm,
            barometer_hpa as pressure_hpa,
            wind_speed_ms as windspeed_ms,
            wind_dir,
            battery_status as battery_pct,
            battery_volts as battery_voltage_v,
            fields_json
        FROM readings
        WHERE station_id = %s
          AND timestamp >= %s
          AND timestamp <= %s
        ORDER BY timestamp
        """

        data = query(sql, (station_id, start_date, end_date))

        if not data:
            raise HTTPException(status_code=404, detail="No data found for the specified date range")

        # Generate CSV content
        import csv
        import io

        output = io.StringIO()
        writer = csv.writer(output)

        # Write header
        writer.writerow([
            'Station ID', 'Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Rainfall (mm)',
            'Pressure (hPa)', 'Wind Speed (m/s)', 'Wind Direction', 'Battery (%)', 'Battery Voltage (V)', 'Fields JSON'
        ])

        # Write data rows
        for row in data:
            writer.writerow([
                row['station_id'] or '',
                row['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
                row['temperature_c'] or '',
                row['humidity_pct'] or '',
                row['rainfall_mm'] or '',
                row['pressure_hpa'] or '',
                row['windspeed_ms'] or '',
                row['wind_dir'] or '',
                row['battery_pct'] or '',
                row['battery_voltage_v'] or '',
                row['fields_json'] or ''
            ])

        csv_content = output.getvalue()
        output.close()

        # Create filename
        filename = f"{station_name.lower().replace(' ', '_')}_{start}_to_{end}.csv"

        # Return CSV as streaming response
        from fastapi.responses import Response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting CSV for station {station_id}, {start} to {end}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
            "availability": "/availability?station_id=1&year=2025&month=1",
            "export_csv": "/export/csv?station_id=1&start=2025-01-01&end=2025-01-02",
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
