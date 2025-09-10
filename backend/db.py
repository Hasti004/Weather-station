from pathlib import Path
import os
from dotenv import load_dotenv
import mysql.connector
from typing import Iterable, Tuple

BASE_DIR = Path(__file__).resolve().parent
DOTENV = BASE_DIR / ".env"

def _load_env_safely():
    enc = "utf-8"
    try:
        if DOTENV.exists():
            with open(DOTENV, "rb") as fh:
                head = fh.read(4)
            if head.startswith(b"\xff\xfe") or head.startswith(b"\xfe\xff"):
                enc = "utf-16"           # handle UTF-16 BOM
        load_dotenv(dotenv_path=str(DOTENV), override=True, encoding=enc)
    except Exception as e:
        print(f"[env] failed to load .env ({enc}): {e}. Falling back to defaults.")
        load_dotenv(override=True, encoding="utf-8")

_load_env_safely()

DB = dict(
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "observatory"),
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
