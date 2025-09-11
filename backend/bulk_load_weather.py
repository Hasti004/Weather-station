import csv
import hashlib
import os
from pathlib import Path
from typing import Iterable, List, Tuple

import pymysql
from dotenv import load_dotenv


# Ensure we load backend/.env as UTF-8 (Windows-safe)
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
        pressure_hpa, windspeed_ms, visibility_km,
        fields_json, raw_line, line_checksum
    ) VALUES (
        %s, %s, %s, %s, %s,
        %s, %s, %s,
        NULL, %s, %s
    )
    """
)


def parse_file_rows(file_path: Path, obs_id: str) -> Iterable[Tuple]:
    with file_path.open("r", encoding="utf-8", errors="replace") as f:
        # Try to sniff delimiter (comma by default)
        sample = f.read(2048)
        f.seek(0)
        dialect = csv.Sniffer().sniff(sample, delimiters=",\t;") if sample else csv.get_dialect("excel")
        reader = csv.DictReader(f, dialect=dialect)
        required = [
            "date",
            "time",
            "temperature_c",
            "humidity_pct",
            "rainfall_mm",
            "pressure_hpa",
            "windspeed_ms",
            "visibility_km",
        ]
        missing = [k for k in required if k not in reader.fieldnames]
        if missing:
            raise SystemExit(f"Missing required columns in {file_path.name}: {missing}; found={reader.fieldnames}")

        for row in reader:
            # Preserve raw line for checksum and storage
            raw_line = ",".join([row.get(k, "") for k in reader.fieldnames])
            checksum = hashlib.sha256(raw_line.encode("utf-8", errors="ignore")).hexdigest()

            reading_ts = f"{row['date']} {row['time']}"

            def parse_num(val: str):
                v = (val or "").strip()
                if v == "":
                    return None
                try:
                    return float(v)
                except Exception:
                    return None

            yield (
                obs_id,
                reading_ts,
                parse_num(row.get("temperature_c")),
                parse_num(row.get("humidity_pct")),
                parse_num(row.get("rainfall_mm")),
                parse_num(row.get("pressure_hpa")),
                parse_num(row.get("windspeed_ms")),
                parse_num(row.get("visibility_km")),
                raw_line,
                checksum,
            )


def chunked(iterable: Iterable[Tuple], size: int) -> Iterable[List[Tuple]]:
    buf: List[Tuple] = []
    for item in iterable:
        buf.append(item)
        if len(buf) >= size:
            yield buf
            buf = []
    if buf:
        yield buf


def ingest(file_path: Path, obs_id: str) -> int:
    rows = parse_file_rows(file_path, obs_id)
    total = 0
    cn = pymysql.connect(**DB)
    try:
        with cn.cursor() as cur:
            for batch in chunked(rows, 1000):
                cur.executemany(INSERT_SQL, batch)
                total += cur.rowcount  # inserted rows (duplicates ignored)
        cn.commit()
    finally:
        cn.close()
    return total


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Bulk load weather history TXT/CSV into MySQL readings table")
    parser.add_argument("file", type=str, help="Path to TXT/CSV with header: date,time,temperature_c,...")
    parser.add_argument("--obs_id", required=True, help="Observatory id, e.g., ahm | mtabu | udi")
    args = parser.parse_args()

    path = Path(args.file)
    if not path.exists():
        raise SystemExit(f"File not found: {path}")

    inserted = ingest(path, args.obs_id)
    print(f"Inserted ~{inserted} rows (duplicates ignored) from {path.name} for obs_id={args.obs_id}")


if __name__ == "__main__":
    main()


