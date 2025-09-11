import csv
import hashlib
import os
from pathlib import Path
from typing import Optional

import pymysql
from dotenv import load_dotenv


ENV_PATH = Path(__file__).with_name(".env")
load_dotenv(dotenv_path=ENV_PATH, encoding="utf-8")

DB = dict(
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "obs_ingest"),
    password=os.getenv("DB_PASS", "Hasti@123"),
    database=os.getenv("DB_NAME", "observatory"),
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=True,
)

INSERT_SQL = (
    """
    INSERT IGNORE INTO readings (
        obs_id, reading_ts, temperature_c, humidity_pct, rainfall_mm,
        pressure_hpa, windspeed_ms, visibility_km, fields_json, raw_line, line_checksum
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NULL, %s, %s)
    """
)


def parse_one_line(header: str, line: str, obs_id: str):
    keys = [k.strip() for k in header.split(",")]
    vals = [v.strip() for v in csv.reader([line]).__next__()]
    row = {k: (vals[i] if i < len(vals) else "") for i, k in enumerate(keys)}

    raw_line = ",".join([row.get(k, "") for k in keys])
    checksum = hashlib.sha256(raw_line.encode("utf-8", errors="ignore")).hexdigest()
    reading_ts = f"{row['date']} {row['time']}"

    def num(v: str) -> Optional[float]:
        v = (v or "").strip()
        if v == "":
            return None
        try:
            return float(v)
        except Exception:
            return None

    return (
        obs_id,
        reading_ts,
        num(row.get("temperature_c")),
        num(row.get("humidity_pct")),
        num(row.get("rainfall_mm")),
        num(row.get("pressure_hpa")),
        num(row.get("windspeed_ms")),
        num(row.get("visibility_km")),
        raw_line,
        checksum,
    )


def ingest_latest(file_path: Path, obs_id: str) -> int:
    with file_path.open("r", encoding="utf-8", errors="replace") as f:
        lines = f.read().splitlines()
        if len(lines) < 2:
            return 0
        header, last = lines[0], lines[-1]
        row = parse_one_line(header, last, obs_id)

    cn = pymysql.connect(**DB)
    try:
        with cn.cursor() as cur:
            cur.execute(INSERT_SQL, row)
        cn.commit()
        return cur.rowcount
    finally:
        cn.close()


def main():
    import argparse

    p = argparse.ArgumentParser(description="Ingest the last line of a live TXT file into readings")
    p.add_argument("file", type=str, help="Path to TXT with the expected header")
    p.add_argument("--obs_id", required=True, help="Observatory id")
    args = p.parse_args()

    inserted = ingest_latest(Path(args.file), args.obs_id)
    print(f"Inserted {inserted} row from {args.file} for obs_id={args.obs_id}")


if __name__ == "__main__":
    main()


