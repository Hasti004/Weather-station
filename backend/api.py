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
import zipfile
import tempfile
import os
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from dotenv import load_dotenv

from db import query, get_conn

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

# -------------------- Live TXT ingestion background task --------------------
import asyncio
import os

STATION_ALIAS_SHORT = {"udi": 1, "ahm": 2, "mtabu": 3}

INGEST_HEALTH = {
    "interval": 30,
    "last_run": None,
    "stations": {
        "udi": {"file": None, "last_file_mtime": None, "last_insert_timestamp": None},
        "ahm": {"file": None, "last_file_mtime": None, "last_insert_timestamp": None},
        "mtabu": {"file": None, "last_file_mtime": None, "last_insert_timestamp": None},
    },
}

MISSING_VALUES = {"", "NA", "NAN", "-999", "null", "None"}

def _to_num(x: str):
    if x is None: return None
    s = str(x).strip()
    if s.upper() in MISSING_VALUES: return None
    try:
        v = float(s)
        return round(v, 1)
    except Exception:
        return None

def read_last_line(path: Path) -> str:
    try:
        with path.open('r', encoding='utf-8') as f:
            data = f.read().strip()
        if not data:
            return ""
        # last non-empty line
        lines = [ln for ln in data.splitlines() if ln.strip()]
        return lines[-1] if lines else ""
    except Exception:
        return ""

def parse_live_line(alias: str, line: str) -> dict:
    # Expected simple CSV: temp,humidity,wind,pressure,rainfall,(extra)
    parts = [p.strip() for p in line.split(',')]
    if len(parts) < 5:
        return {}
    return {
        'temp_out_c': _to_num(parts[0]),
        'hum_out': _to_num(parts[1]),
        'wind_speed_ms': _to_num(parts[2]),
        'barometer_hpa': _to_num(parts[3]),
        'rain_day_mm': _to_num(parts[4])
    }

async def live_ingest_loop():
    interval = int(os.getenv('LIVE_POLL_SECONDS', '30'))
    base = Path(__file__).resolve().parent / 'data'
    files = {
        'udi': Path(os.getenv('LIVE_FILE_UDI', str(base / 'udi.txt'))),
        'ahm': Path(os.getenv('LIVE_FILE_AHM', str(base / 'ahm.txt'))),
        'mtabu': Path(os.getenv('LIVE_FILE_MTABU', str(base / 'mtabu.txt'))),
    }
    INGEST_HEALTH['interval'] = interval
    for k, p in files.items():
        INGEST_HEALTH['stations'][k]['file'] = str(p)

    logger.info(f"live_ingest_loop started interval={interval}s files={ {k:str(v) for k,v in files.items()} }")
    while True:
        try:
            now = datetime.now()
            for alias, path in files.items():
                try:
                    if not path.exists():
                        continue
                    mtime = datetime.fromtimestamp(path.stat().st_mtime).isoformat()
                    INGEST_HEALTH['stations'][alias]['last_file_mtime'] = mtime
                    line = read_last_line(path)
                    if not line:
                        continue
                    payload = parse_live_line(alias, line)
                    if not payload:
                        continue
                    sid = STATION_ALIAS_SHORT[alias]
                    ts_str = now.strftime('%Y-%m-%d %H:%M:%S')

                    # Upsert
                    cols = ['station_id', 'timestamp', 'temp_out_c', 'hum_out', 'rain_day_mm', 'barometer_hpa', 'wind_speed_ms']
                    values = [sid, ts_str, payload.get('temp_out_c'), payload.get('hum_out'), payload.get('rain_day_mm'), payload.get('barometer_hpa'), payload.get('wind_speed_ms')]
                    placeholders = ','.join(['%s'] * len(values))
                    insert_sql = f"""
                    INSERT INTO readings ({', '.join(cols)})
                    VALUES ({placeholders})
                    ON DUPLICATE KEY UPDATE
                      temp_out_c=VALUES(temp_out_c),
                      hum_out=VALUES(hum_out),
                      rain_day_mm=VALUES(rain_day_mm),
                      barometer_hpa=VALUES(barometer_hpa),
                      wind_speed_ms=VALUES(wind_speed_ms)
                    """
                    conn = get_conn(); cur = conn.cursor()
                    cur.execute(insert_sql, values)
                    conn.commit(); cur.close(); conn.close()
                    INGEST_HEALTH['stations'][alias]['last_insert_timestamp'] = ts_str
                    logger.info(f"live_ingest upsert alias={alias} ts={ts_str} vals={payload}")
                except Exception as e:
                    logger.warning(f"live_ingest station={alias} error={e}")
                    # continue with other stations
                    continue
            INGEST_HEALTH['last_run'] = now.isoformat()
        except Exception as e:
            logger.exception(f"live_ingest loop error: {e}")
        await asyncio.sleep(interval)

@app.on_event("startup")
async def _start_live_task():
    try:
        app.state._live_task = asyncio.create_task(live_ingest_loop())
    except Exception as e:
        logger.warning(f"failed to start live_ingest_loop: {e}")

@app.on_event("shutdown")
async def _stop_live_task():
    task = getattr(app.state, '_live_task', None)
    if task:
        task.cancel()
        try:
            await task
        except Exception:
            pass

@app.get("/live_health")
async def live_health():
    return INGEST_HEALTH

@app.get("/latest_one")
async def latest_one(station_id: str = Query(..., description="Station ID (1,2,3) or alias (udi|ahm|mtabu|udaipur|ahmedabad|mountabu)")):
    """Return the latest reading for a single station, translated for the frontend."""
    try:
        # Accept short aliases as well
        short_alias = {"udi": 1, "ahm": 2, "mtabu": 3}
        try:
            sid = resolve_station_id(station_id)
        except ValueError:
            sid = short_alias.get(str(station_id).strip().lower())
            if not sid:
                return JSONResponse(status_code=400, content={"detail": "Unknown station_id. Use 1/2/3 or udi/ahm/mtabu"})

        sql = f"""
        SELECT r.*
        FROM readings r
        WHERE r.station_id = %s
        ORDER BY r.{TIME_COL} DESC
        LIMIT 1
        """
        rows = query(sql, (sid,))
        if not rows:
            return JSONResponse(status_code=404, content={"detail": "No data for station"})

        translated = translate_reading_to_frontend(rows[0])
        return {
            "station_id": sid,
            "data": translated,
            "ts": datetime.now().isoformat()
        }
    except Exception:
        logger.exception("/latest_one failed")
        return JSONResponse(status_code=500, content={"detail": "Failed to fetch latest row"})

@app.get("/latest_file")
async def latest_from_file(station_id: str = Query(..., description="Station alias or id: udi|ahm|mtabu or 1|2|3")):
    """Read live TXT file for a station and return a synthetic latest row for quick demos.

    Format expected: "temp,humidity,windspeed,pressure,rainfall,extra" on one line.
    """
    try:
        # Resolve alias to filename
        alias = str(station_id).strip().lower()
        if alias.isdigit():
            alias = {"1": "udi", "2": "ahm", "3": "mtabu"}.get(alias, alias)

        base = Path(__file__).resolve().parent / 'data'
        file_map = {
            'udi': base / 'udi.txt',
            'ahm': base / 'ahm.txt',
            'mtabu': base / 'mtabu.txt',
            'ahmedabad': base / 'ahm.txt',
            'udaipur': base / 'udi.txt',
            'mountabu': base / 'mtabu.txt',
        }
        fp = file_map.get(alias)
        if not fp:
            return JSONResponse(status_code=400, content={"detail": "Unknown station alias. Use udi/ahm/mtabu"})
        if not fp.exists():
            return JSONResponse(status_code=404, content={"detail": f"File not found: {fp}"})

        with fp.open('r', encoding='utf-8') as f:
            line = f.read().strip()
        parts = [p.strip() for p in line.split(',')]
        if len(parts) < 5:
            return JSONResponse(status_code=400, content={"detail": f"Malformed line in {fp}: {line}"})

        # Map to frontend fields (numbers where possible)
        def to_num(x):
            try:
                return float(x)
            except Exception:
                return None

        data = {
            'station_id': {'udi': 1, 'ahm': 2, 'mtabu': 3}.get(alias, None),
            'reading_ts': datetime.now().isoformat(),
            'temperature_c': to_num(parts[0]),
            'humidity_pct': to_num(parts[1]),
            'windspeed_ms': to_num(parts[2]),
            'pressure_hpa': to_num(parts[3]),
            'rainfall_mm': to_num(parts[4]),
        }

        return { 'station_id': data['station_id'], 'data': data, 'ts': data['reading_ts'] }
    except Exception:
        logger.exception("/latest_file failed")
        return JSONResponse(status_code=500, content={"detail": "Failed to read live file"})

def serialize_datetime(obj):
    """Serialize datetime objects to ISO format strings."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif hasattr(obj, 'isoformat'):  # Handle other datetime-like objects
        return obj.isoformat()
    else:
        return obj

def translate_reading_to_frontend(row: Dict[str, Any]) -> Dict[str, Any]:
    """
    Translate database reading row to frontend-friendly format.
    Maps ingestion schema columns to user-friendly frontend keys.
    Handles both weather_stations schema and observatory schema.
    """
    if not row:
        return row

    # Create a copy to avoid modifying the original
    translated = dict(row)

    # Detect which schema we're using
    has_obs_id = 'obs_id' in translated
    has_station_id = 'station_id' in translated

    # Map database columns to frontend-friendly keys
    # Handle both weather_stations schema and observatory schema
    column_mapping = {
        'station_id': 'station_id',  # Keep as-is (weather_stations schema)
        'obs_id': 'obs_id',          # Keep as-is (observatory schema)
        'timestamp': 'reading_ts',   # weather_stations schema
        'reading_ts': 'reading_ts', # observatory schema (already correct)
        'temp_out_c': 'temperature_c',  # weather_stations
        'temperature_c': 'temperature_c', # observatory (already correct)
        'hum_out': 'humidity_pct',      # weather_stations
        'humidity_pct': 'humidity_pct', # observatory (already correct)
        'rain_day_mm': 'rainfall_mm',   # weather_stations
        'rainfall_mm': 'rainfall_mm',   # observatory (already correct)
        'barometer_hpa': 'pressure_hpa', # weather_stations
        'pressure_hpa': 'pressure_hpa',  # observatory (already correct)
        'wind_speed_ms': 'windspeed_ms', # weather_stations
        'windspeed_ms': 'windspeed_ms',  # observatory (already correct)
        'battery_status': 'battery_pct',  # weather_stations
        'battery_pct': 'battery_pct',    # observatory (already correct)
        'battery_volts': 'battery_voltage_v',
        'battery_voltage_v': 'battery_voltage_v', # observatory (already correct)
        'temp_in_c': 'temp_in_c',    # Keep as-is
        'hum_in': 'hum_in',          # Keep as-is
        'rain_rate_mm_hr': 'rain_rate_mm_hr',  # Keep as-is
        'solar_rad': 'solar_rad',    # Keep as-is
        'sunrise': 'sunrise',        # Keep as-is
        'sunset': 'sunset',          # Keep as-is
        'wind_dir': 'wind_dir',      # Keep as-is (both schemas)
    }

    # Apply translations
    for db_key, frontend_key in column_mapping.items():
        if db_key in translated and db_key != frontend_key:
            translated[frontend_key] = translated.pop(db_key)

    # Ensure wind_dir is always included (even if NULL) for wind rose compatibility
    if 'wind_dir' not in translated:
        translated['wind_dir'] = None

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
    """Get latest readings for all stations with no-cache headers."""
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

        # Translate to frontend format and add slug mapping
        translated_results = []
        max_ts = None

        for row in results:
            translated = translate_reading_to_frontend(row)

            # Add slug mapping (1->udi, 2->ahm, 3->mtabu)
            station_id = translated.get('station_id')
            if station_id == 1:
                translated['slug'] = 'udi'
            elif station_id == 2:
                translated['slug'] = 'ahm'
            elif station_id == 3:
                translated['slug'] = 'mtabu'
            else:
                translated['slug'] = f'station_{station_id}'

            # Track max timestamp
            reading_ts = translated.get('reading_ts')
            if reading_ts and (max_ts is None or reading_ts > max_ts):
                max_ts = reading_ts

            translated_results.append(translated)

        # Add INFO logging
        logger.info(f"/latest endpoint hit: {len(translated_results)} stations, max_ts={max_ts}")

        response_data = {
            "data": translated_results,
            "count": len(translated_results),
            "last_updated": max_ts
        }

        # Create response with no-cache headers
        from fastapi import Response
        response = Response(
            content=json.dumps(response_data, default=serialize_datetime),
            media_type="application/json"
        )
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        return response

    except Exception as e:
        logger.exception("/latest endpoint failed")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/range")
def range_obs(
    station_id: str = Query(..., description="Station ID (1, 2, 3) or 'all'"),
    start: str = Query(..., description="YYYY-MM-DDTHH:MM:SS"),
    end: str = Query(..., description="YYYY-MM-DDTHH:MM:SS"),
    limit: int = Query(10000, description="Maximum number of records to return"),
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
            LIMIT %s
            """
            results = query(sql, (start_ts, end_ts, limit))
        else:
            # Check which database schema we're using and adjust query accordingly
            # Try weather_stations schema first (has stations table), fallback to observatory schema
            try:
                sql = """
                SELECT r.*, s.name as station_name, s.location
                FROM readings r
                JOIN stations s ON r.station_id = s.station_id
                WHERE r.station_id = %s AND r.timestamp >= %s AND r.timestamp < %s
                ORDER BY r.timestamp
                LIMIT %s
                """
                results = query(sql, (station_id, start_ts, end_ts, limit))
            except Exception as e:
                # Fallback to observatory schema (uses obs_id instead of station_id)
                logger.warning(f"Trying observatory schema fallback: {e}")
                # Map station_id to obs_id
                obs_id_map = {1: 'udi', 2: 'ahm', 3: 'mtabu'}
                obs_id = obs_id_map.get(int(station_id))
                if obs_id:
                    sql = """
                    SELECT r.*, o.name as station_name, o.location
                    FROM readings r
                    JOIN observatories o ON r.obs_id = o.obs_id
                    WHERE r.obs_id = %s AND r.reading_ts >= %s AND r.reading_ts < %s
                    ORDER BY r.reading_ts
                    LIMIT %s
                    """
                    results = query(sql, (obs_id, start_ts, end_ts, limit))
                else:
                    raise

            # Log wind_dir data availability for debugging
            if results:
                wind_dir_count = sum(1 for row in results if row.get('wind_dir') is not None and row.get('wind_dir') != '')
                logger.info(f"Wind direction data: {wind_dir_count}/{len(results)} rows have wind_dir values")

        # Translate to frontend format
        translated_results = []
        for i, row in enumerate(results):
            try:
                translated = translate_reading_to_frontend(row)
                translated_results.append(translated)
            except Exception as e:
                logger.error(f"Error translating row {i}: {e}")
                # Skip problematic rows
                continue

        # Add INFO logging
        logger.info(f"/range endpoint hit: station_id={station_id}, start={start_ts}, end={end_ts}, rows={len(translated_results)}")

        response_data = {"data": translated_results, "count": len(translated_results)}

        # Create response with no-cache headers
        from fastapi import Response
        try:
            # Use a more robust JSON serialization
            import json
            response = Response(
                content=json.dumps(response_data, default=str),
                media_type="application/json"
            )
        except (TypeError, ValueError) as e:
            logger.error(f"JSON serialization error in /range: {e}")
            # Fallback: return minimal data
            fallback_data = {"data": [], "count": 0, "error": "Data serialization error"}
            response = Response(
                content=json.dumps(fallback_data),
                media_type="application/json"
            )

        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        return response

    except Exception as e:
        logger.exception("/range endpoint failed")
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

        # Add INFO logging
        logger.info(f"/series endpoint hit: station_id={station_id}, minutes={minutes}, rows={len(translated_results)}")

        response_data = {
            "station_id": station_id,
            "start_time": start_time.isoformat(),
            "minutes": minutes,
            "data": translated_results,
            "count": len(translated_results)
        }

        # Create response with no-cache headers
        from fastapi import Response
        response = Response(
            content=json.dumps(response_data, default=serialize_datetime),
            media_type="application/json"
        )
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        return response

    except Exception as e:
        logger.exception("/series endpoint failed")
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

@app.get("/download/xlsx-zip")
async def download_xlsx_zip(
    station_id: str = Query(..., description="Station ID (1,2,3) or alias: udaipur/ahmedabad/mountabu"),
    start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end: str = Query(..., description="End date (YYYY-MM-DD)"),
    row_limit_per_xlsx: int = Query(1048576, description="Max rows per XLSX file (Excel limit)"),
    batch_size: int = Query(50000, description="DB fetch batch size")
):
    logger.info(f"/download/xlsx-zip params station_id={station_id}, start={start}, end={end}, row_limit={row_limit_per_xlsx}, batch={batch_size}")
    try:
        try:
            station_norm = resolve_station_id(station_id)
        except ValueError as ve:
            return JSONResponse(status_code=400, content={"detail": str(ve)})

        try:
            start_dt = datetime.strptime(start, '%Y-%m-%d')
            end_dt = datetime.strptime(end, '%Y-%m-%d')
        except ValueError:
            return JSONResponse(status_code=400, content={"detail": "Invalid date format (expected YYYY-MM-DD)"})

        if start_dt > end_dt:
            return JSONResponse(status_code=400, content={"detail": "start must be <= end"})

        start_ts = f"{start} 00:00:00"
        end_ts = f"{end} 23:59:59"

        exists = query("SELECT COUNT(1) AS cnt FROM stations WHERE station_id=%s", (station_norm,)) or []
        if not exists or not exists[0].get('cnt'):
            return JSONResponse(status_code=400, content={"detail": f"Unknown station_id: {station_id}"})

        time_column = TIME_COL

        # Column order consistent with /range translation target
        column_order = [
            'station_id', time_column,
            'temperature_c', 'humidity_pct', 'rainfall_mm', 'pressure_hpa', 'windspeed_ms', 'wind_dir', 'battery_pct', 'battery_voltage_v',
            'temp_in_c', 'temp_out_c', 'hum_in', 'hum_out', 'rain_day_mm', 'rain_rate_mm_hr', 'solar_rad', 'sunrise', 'sunset', 'created_at'
        ]

        # Determine available columns from a probe
        probe = query(
            f"SELECT * FROM readings WHERE station_id=%s AND {time_column} BETWEEN %s AND %s ORDER BY {time_column} ASC LIMIT 1",
            (station_norm, start_ts, end_ts)
        ) or []
        available = set(probe[0].keys()) if probe else set()
        select_cols = [c for c in column_order if c in available] if available else [
            'station_id', time_column, 'temp_out_c', 'hum_out', 'rain_day_mm', 'barometer_hpa', 'wind_speed_ms', 'wind_dir', 'battery_status', 'battery_volts'
        ]

        logger.info(f"/download/xlsx-zip resolved station_id={station_norm}, start_ts={start_ts}, end_ts={end_ts}, time_col={time_column}")
        logger.info(f"/download/xlsx-zip columns: {select_cols}")

        from decimal import Decimal
        import json as pyjson
        from openpyxl import Workbook

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
                    return pyjson.dumps(v, ensure_ascii=False)
                except Exception:
                    return str(v)
            return v

        tempdir = tempfile.TemporaryDirectory()
        part_files = []
        total_rows = 0
        part_idx = 1
        rows_in_current = 0
        wb = None
        ws = None
        current_path = None

        def new_part():
            nonlocal wb, ws, current_path, rows_in_current, part_idx
            if wb is not None:
                wb.save(current_path)
                wb.close()
                logger.info(f"/download/xlsx-zip wrote part {current_path} rows={rows_in_current}")
            filename = f"station_{station_id}_{start}_to_{end}_part{part_idx}.xlsx"
            current_path = os.path.join(tempdir.name, filename)
            wb = Workbook(write_only=True)
            ws = wb.create_sheet("data")
            # header
            ws.append(select_cols)
            rows_in_current = 0
            part_files.append(current_path)
            part_idx += 1

        new_part()

        offset = 0
        while True:
            rows = query(
                f"SELECT {', '.join(select_cols)} FROM readings WHERE station_id=%s AND {time_column} BETWEEN %s AND %s ORDER BY {time_column} ASC LIMIT %s OFFSET %s",
                (station_norm, start_ts, end_ts, batch_size, offset)
            )
            if not rows:
                break
            for r in rows:
                ws.append([norm(r.get(c)) for c in select_cols])
                rows_in_current += 1
                total_rows += 1
                if rows_in_current >= row_limit_per_xlsx:
                    new_part()
            offset += batch_size

        # finalize last workbook
        if wb is not None:
            wb.save(current_path)
            wb.close()
            logger.info(f"/download/xlsx-zip wrote part {current_path} rows={rows_in_current}")

        # Build ZIP into a NamedTemporaryFile
        zip_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        zip_path = zip_tmp.name
        zip_tmp.close()
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            for p in part_files:
                zf.write(p, arcname=os.path.basename(p))

        logger.info(f"/download/xlsx-zip done total_rows={total_rows} parts={len(part_files)}")

        def cleanup_and_stream():
            try:
                with open(zip_path, 'rb') as f:
                    while True:
                        chunk = f.read(1024 * 1024)
                        if not chunk:
                            break
                        yield chunk
            finally:
                try:
                    os.remove(zip_path)
                except Exception:
                    pass
                try:
                    tempdir.cleanup()
                except Exception:
                    pass

        zip_name = f"station_{station_id}_{start}_to_{end}.zip"
        return StreamingResponse(cleanup_and_stream(), media_type='application/zip', headers={
            'Content-Disposition': f"attachment; filename=\"{zip_name}\""
        })
    except Exception:
        logger.exception("/download/xlsx-zip failed")
        return JSONResponse(status_code=500, content={"detail": "Export failed"})

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

@app.get("/stations")
async def get_stations():
    """Get list of all stations."""
    try:
        sql = "SELECT station_id, name, location, created_at FROM stations ORDER BY station_id"
        results = query(sql)

        # Translate to frontend format
        translated_results = [translate_station_to_frontend(row) for row in results]

        return {"stations": translated_results, "count": len(translated_results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

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
