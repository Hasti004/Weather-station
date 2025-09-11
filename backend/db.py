from pathlib import Path
import os
from dotenv import load_dotenv
import mysql.connector
from typing import Iterable, Tuple

BASE_DIR = Path(__file__).resolve().parent
DOTENV = BASE_DIR / ".env"

def _load_env_safely():
    """Load environment variables with BOM handling."""
    try:
        # Try UTF-8 with BOM first (most common issue)
        load_dotenv(dotenv_path=str(DOTENV), override=True, encoding="utf-8-sig")
    except Exception as e:
        try:
            # Fallback to regular UTF-8
            load_dotenv(dotenv_path=str(DOTENV), override=True, encoding="utf-8")
        except Exception as e2:
            try:
                # Last resort: UTF-16 with BOM
                load_dotenv(dotenv_path=str(DOTENV), override=True, encoding="utf-16")
            except Exception as e3:
                print(f"[env] failed to load .env: {e3}. Using defaults.")
                # Load with no file to use defaults
                load_dotenv(override=True)

_load_env_safely()

DB = dict(
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "weather_stations"),
)

def get_conn():
    return mysql.connector.connect(**DB)

def query(sql: str, args=None, one: bool=False, dict_rows: bool=True):
    conn = get_conn()
    cur = conn.cursor(dictionary=dict_rows)
    cur.execute(sql, args or ())
    rows = cur.fetchone() if one else cur.fetchall()
    cur.close(); conn.close()
    return rows

def get_latest_reading_ts(obs_id: str):
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT MAX(reading_ts) FROM readings WHERE obs_id=%s", (obs_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    return row[0] if row and row[0] is not None else None

INSERT_SQL = """
INSERT IGNORE INTO readings
(obs_id, reading_ts, temperature_c, humidity_pct, rainfall_mm, pressure_hpa, windspeed_ms,
 visibility_km, battery_pct, battery_voltage_v, fields_json, raw_line, line_checksum)
VALUES
(%s, %s, %s, %s, %s, %s, %s,
 NULL, NULL, %s, %s, %s, %s)
"""

def batch_insert_readings(rows: Iterable[Tuple]) -> int:
    rows = list(rows)
    if not rows: return 0
    conn = get_conn(); cur = conn.cursor()
    cur.executemany(INSERT_SQL, rows)
    conn.commit()
    n = cur.rowcount
    cur.close(); conn.close()
    return n
