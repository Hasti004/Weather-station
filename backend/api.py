"""
FastAPI application for real-time weather data API.
Provides REST endpoints and Server-Sent Events for live data.
"""
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

from db import query

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Observatory API",
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
    """Get latest readings for all observatories."""
    try:
        sql = """
        SELECT r.* FROM readings r
        JOIN (
            SELECT obs_id, MAX(reading_ts) AS max_ts
        FROM readings
            GROUP BY obs_id
        ) t ON t.obs_id = r.obs_id AND t.max_ts = r.reading_ts
        ORDER BY r.obs_id
        """

        results = query(sql)

        # Serialize datetime objects
        for row in results:
            for key, value in row.items():
                if isinstance(value, datetime):
                    row[key] = value.isoformat()

        return {"data": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/range")
def range_obs(
    obs_id: str = Query(..., description="'ahm' | 'mtabu' | 'udi' | 'all'"),
    start: str = Query(..., description="YYYY-MM-DDTHH:MM:SS"),
    end: str = Query(..., description="YYYY-MM-DDTHH:MM:SS"),
):
    """Get readings within a time range."""
    start_ts = start.replace("T", " ")
    end_ts = end.replace("T", " ")
    if obs_id == "all":
        return query(
            """
            SELECT obs_id, reading_ts, temperature_c, humidity_pct, rainfall_mm,
                   pressure_hpa, windspeed_ms, visibility_km
            FROM readings
            WHERE reading_ts >= %s AND reading_ts < %s
            ORDER BY obs_id, reading_ts
            """,
            (start_ts, end_ts),
        )
    else:
        return query(
            """
            SELECT obs_id, reading_ts, temperature_c, humidity_pct, rainfall_mm,
                   pressure_hpa, windspeed_ms, visibility_km
            FROM readings
            WHERE obs_id=%s AND reading_ts >= %s AND reading_ts < %s
            ORDER BY reading_ts
            """,
            (obs_id, start_ts, end_ts),
        )

@app.get("/series")
async def get_series(
    obs_id: str = Query(..., description="Observatory ID (e.g., 'ahm', 'mtabu', 'udi')"),
    minutes: int = Query(60, description="Number of minutes to look back")
):
    """Get time series data for a specific observatory."""
    try:
        # Calculate start time
        start_time = datetime.now() - timedelta(minutes=minutes)
        start_time_str = start_time.strftime("%Y-%m-%d %H:%M:%S")

        sql = """
        SELECT obs_id, reading_ts, temperature_c, humidity_pct, rainfall_mm,
               pressure_hpa, windspeed_ms, visibility_km, battery_pct, battery_voltage_v,
               fields_json, created_at
        FROM readings
        WHERE obs_id = %s AND reading_ts >= %s
        ORDER BY reading_ts ASC
        """

        results = query(sql, (obs_id, start_time_str))

        # Serialize datetime objects
        for row in results:
            for key, value in row.items():
                if isinstance(value, datetime):
                    row[key] = value.isoformat()
                elif key == 'fields_json' and value:
                    try:
                        row[key] = json.loads(value)
                    except json.JSONDecodeError:
                        pass  # Keep as string if not valid JSON

        return {
            "obs_id": obs_id,
            "start_time": start_time.isoformat(),
            "minutes": minutes,
            "data": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/stream")
async def stream_data(obs_id: Optional[str] = Query(None, description="Filter by observatory ID")):
    """Server-Sent Events stream for real-time data updates."""

    async def event_generator():
        """Generate SSE events every 3 seconds."""
        while True:
            try:
                # Get latest readings
                if obs_id:
                    sql = """
                    SELECT r.* FROM readings r
                    WHERE r.obs_id = %s
                    ORDER BY r.reading_ts DESC
                    LIMIT 1
                    """
                    results = query(sql, (obs_id,))
                else:
                    sql = """
                    SELECT r.* FROM readings r
                    JOIN (
                        SELECT obs_id, MAX(reading_ts) AS max_ts
                        FROM readings
                        GROUP BY obs_id
                    ) t ON t.obs_id = r.obs_id AND t.max_ts = r.reading_ts
                    ORDER BY r.obs_id
                    """
                    results = query(sql)

                # Serialize datetime objects
                for row in results:
                    for key, value in row.items():
                        if isinstance(value, datetime):
                            row[key] = value.isoformat()
                        elif key == 'fields_json' and value:
                            try:
                                row[key] = json.loads(value)
                            except json.JSONDecodeError:
                                pass

                # Send SSE event
                event_data = {
                    "timestamp": datetime.now().isoformat(),
                    "data": results,
                    "count": len(results)
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
    """Get list of all observatories."""
    try:
        sql = "SELECT obs_id, name, location, created_at FROM observatories ORDER BY obs_id"
        results = query(sql)

        # Serialize datetime objects
        for row in results:
            for key, value in row.items():
                if isinstance(value, datetime):
                    row[key] = value.isoformat()

        return {"observatories": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Observatory API is running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "latest": "/latest",
            "range": "/range?obs_id=ahm&start=2025-01-01T00:00:00&end=2025-01-02T00:00:00",
            "series": "/series?obs_id=ahm&minutes=60",
            "stream": "/stream",
            "observatories": "/observatories",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
