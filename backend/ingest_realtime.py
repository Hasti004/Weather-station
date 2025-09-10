# """
# Real-time weather data ingester for append-only CSV files.
# Watches file for changes and processes new lines only.
# """
# import os
# import csv
# import hashlib
# import json
# import time
# from datetime import datetime
# from pathlib import Path
# from typing import Dict, Any, Optional, List, Tuple

# from watchdog.observers import Observer
# from watchdog.events import FileSystemEventHandler
# from dotenv import load_dotenv

# from db import batch_insert_readings

# # ---------- encoding-safe opener ----------
# def open_text(path: str):
#     for enc in ("utf-8", "utf-8-sig", "cp1252"):
#         try:
#             return open(path, "r", newline="", encoding=enc)
#         except UnicodeDecodeError:
#             continue
#     return open(path, "r", newline="", encoding="latin-1", errors="ignore")
# # ------------------------------------------

# load_dotenv()

# class WeatherFileHandler(FileSystemEventHandler):
#     """File watcher for append-only weather CSV files."""
#     def __init__(self, file_path: str, obs_id: str, has_header: bool = True):
#         self.file_path = Path(file_path)
#         self.obs_id = obs_id
#         self.has_header = has_header
#         self.header: Optional[List[str]] = None
#         self.file_position = 0
#         self._tail_buffer = ""  # hold a partial last line across writes

#         # known columns we map directly
#         self.direct_cols = {
#             'Timestamp': 'reading_ts',
#             'TempOut(C)': 'temperature_c',
#             'HumOut': 'humidity_pct',
#             'RainRate(mm/hr)': 'rainfall_mm',
#             'Barometer(hPa)': 'pressure_hpa',
#             'WindSpeed(m/s)': 'windspeed_ms',
#             'BatteryVolts': 'battery_voltage_v',
#         }

#         self.time_formats = [
#             "%Y-%m-%d %H:%M:%S.%f",
#             "%Y-%m-%d %H:%M:%S",
#             "%d/%m/%Y %H:%M",
#         ]

#         # Read header once, then seek to EOF to start tailing
#         self._load_header()
#         self._seek_to_eof()
#         print(f"[init] header={self.header} pos={self.file_position}")

#     def _load_header(self):
#         if not self.file_path.exists() or not self.has_header:
#             return
#         try:
#             with open_text(self.file_path) as f:
#                 r = csv.reader(f)
#                 hdr = next(r, None)
#                 # strip whitespace AND any BOM on the first column
#                 self.header = [ (h or "").lstrip("\ufeff").strip() for h in hdr ] if hdr else None
#         except Exception as e:
#             print(f"[warn] Could not read header: {e}")
#             self.header = None

#     def _seek_to_eof(self):
#         try:
#             if self.file_path.exists():
#                 with open_text(self.file_path) as f:
#                     f.seek(0, 2)  # EOF
#                     self.file_position = f.tell()
#         except Exception as e:
#             print(f"[warn] seek EOF failed: {e}")
#             self.file_position = 0

#     def on_modified(self, event):
#         if event.is_directory or Path(event.src_path) != self.file_path:
#             return
#         try:
#             self._process_new_bytes()
#         except Exception as e:
#             print(f"[error] processing change: {e}")

#     def _process_new_bytes(self):
#         if not self.file_path.exists():
#             return

#         # read only the new bytes since last position
#         with open_text(self.file_path) as f:
#             f.seek(self.file_position)
#             chunk = f.read()
#             if not chunk:
#                 return
#             self.file_position = f.tell()

#         # handle partial trailing line across writes
#         text = self._tail_buffer + chunk
#         lines = text.splitlines(keepends=False)
#         if text and not text.endswith(("\n", "\r")):
#             # last line is partial; keep it for next time
#             self._tail_buffer = lines.pop() if lines else text
#         else:
#             self._tail_buffer = ""

#         # turn each CSV line into a dict using cached header
#         rows_as_tuples: List[Tuple] = []
#         for line in lines:
#             if not line.strip():
#                 continue
#             try:
#                 for row in csv.reader([line]):
#                     if not row:
#                         continue
#                     # If the writer wrote the header again, skip it
#                     if self.header and row == self.header:
#                         continue
#                     d = self._row_to_dict(row)
#                     tup = self._dict_to_tuple(d)
#                     if tup:
#                         rows_as_tuples.append(tup)
#             except Exception as e:
#                 print(f"[warn] row parse error: {e}; line={line[:120]}...")
#                 continue

#         if rows_as_tuples:
#             inserted = batch_insert_readings(rows_as_tuples)
#             print(f"[append] considered={len(rows_as_tuples)} inserted={inserted}")

#     def _row_to_dict(self, row: List[str]) -> Dict[str, Any]:
#         """Zip row to header dict; if no header, synthesize keys c0,c1,..."""
#         if self.header:
#             clean_header = [h.lstrip("\ufeff").strip() for h in self.header]
#             d = {clean_header[i]: (row[i].strip() if i < len(row) else "")
#                  for i in range(len(clean_header))}
#             # fallback if a BOM sneaks in anyway
#             if "Timestamp" not in d and "\ufeffTimestamp" in d:
#                 d["Timestamp"] = d.pop("\ufeffTimestamp")
#         else:
#             d = {f"c{i}": (row[i].strip() if i < len(row) else "") for i in range(len(row))}
#         return d

#         ts = d.get("Timestamp") or d.get("time") or ""
#         reading_ts = self._parse_timestamp(ts)
#         if not reading_ts:
#             return None

#         def getf(k: str) -> Optional[float]:
#             v = d.get(k)
#             if v is None or str(v).strip() == "":
#                 return None
#             try:
#                 return float(str(v).strip())
#             except Exception:
#                 return None

#         temperature_c   = getf("TempOut(C)")
#         humidity_pct    = getf("HumOut")
#         rainfall_mm     = getf("RainRate(mm/hr)")
#         pressure_hpa    = getf("Barometer(hPa)")
#         windspeed_ms    = getf("WindSpeed(m/s)")
#         battery_voltage = getf("BatteryVolts")

#         # Keep all original columns for provenance
#         fields_json = json.dumps(d, ensure_ascii=False)

#         # raw_line and checksum (stable)
#         raw_line = ",".join(f"{k}={d.get(k, '')}" for k in d.keys())
#         line_checksum = hashlib.sha256(raw_line.encode("utf-8", errors="ignore")).hexdigest()

#         return (
#             self.obs_id,
#             reading_ts,           # DATETIME string is OK for mysql-connector
#             temperature_c,
#             humidity_pct,
#             rainfall_mm,
#             pressure_hpa,
#             windspeed_ms,
#             None,                 # visibility_km
#             None,                 # battery_pct
#             battery_voltage,
#             fields_json,
#             raw_line,
#             line_checksum,
#         )

#     def _parse_timestamp(self, s: str) -> Optional[str]:
#         if not s:
#             return None
#         s = s.strip()
#         for fmt in self.time_formats:
#             try:
#                 dt = datetime.strptime(s, fmt)
#                 return dt.strftime("%Y-%m-%d %H:%M:%S.%f")
#             except ValueError:
#                 continue
#         print(f"[warn] could not parse timestamp: {s}")
#         return None

# def main():
#     data_file = os.getenv("DATA_FILE_APPEND")
#     obs_id    = os.getenv("OBS_ID", "ahm")
#     has_header = os.getenv("CSV_HAS_HEADER", "true").lower() == "true"

#     if not data_file:
#         print("ERROR: set DATA_FILE_APPEND in backend/.env"); return
#     p = Path(data_file)
#     if not p.exists():
#         print(f"ERROR: file not found: {p}"); return

#     print(f"Starting realtime ingester (append mode) for {obs_id}")
#     print(f"Watching: {p}")
#     print(f"Has header: {has_header}")

#     handler = WeatherFileHandler(str(p), obs_id, has_header)
#     obs = Observer()
#     obs.schedule(handler, str(p.parent), recursive=False)
#     obs.start()
#     print("File watcher started. Ctrl+C to stop.")
#     try:
#         while True:
#             time.sleep(1)
#     except KeyboardInterrupt:
#         print("\nStopping...")
#         obs.stop()
#     obs.join()
#     print("Stopped.")

# if __name__ == "__main__":
#     main()
"""
Real-time weather data ingester for append-only CSV files.
Watches the file and inserts only the newly appended rows.
"""
import os
import csv
import hashlib
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple

from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from dotenv import load_dotenv

from db import batch_insert_readings

# Load env from backend/.env
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

# ---------- encoding-safe opener ----------
def open_text(path: str):
    for enc in ("utf-8", "utf-8-sig", "cp1252"):
        try:
            return open(path, "r", newline="", encoding=enc)
        except UnicodeDecodeError:
            continue
    return open(path, "r", newline="", encoding="latin-1", errors="ignore")
# ------------------------------------------


class WeatherFileHandler(FileSystemEventHandler):
    """File watcher for append-only weather CSV files."""

    def __init__(self, file_path: str, obs_id: str, has_header: bool = True):
        self.file_path = Path(file_path)
        self.obs_id = obs_id
        self.has_header = has_header
        self.header: Optional[List[str]] = None
        self.file_position = 0
        self._tail_buffer = ""  # holds a partial last line across writes

        self.time_formats = [
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%d/%m/%Y %H:%M",
        ]

        # Read header once, then seek to EOF to start tailing
        self._load_header()
        self._seek_to_eof()
        print(f"[init] header={self.header} pos={self.file_position}")

    def _load_header(self):
        if not self.file_path.exists() or not self.has_header:
            return
        try:
            with open_text(self.file_path) as f:
                r = csv.reader(f)
                hdr = next(r, None)
                # strip whitespace and any BOM on first col
                self.header = [(h or "").lstrip("\ufeff").strip() for h in hdr] if hdr else None
        except Exception as e:
            print(f"[warn] Could not read header: {e}")
            self.header = None

    def _seek_to_eof(self):
        try:
            if self.file_path.exists():
                with open_text(self.file_path) as f:
                    f.seek(0, 2)  # EOF
                    self.file_position = f.tell()
        except Exception as e:
            print(f"[warn] seek EOF failed: {e}")
            self.file_position = 0

    def on_modified(self, event):
        if event.is_directory or Path(event.src_path) != self.file_path:
            return
        try:
            self._process_new_bytes()
        except Exception as e:
            print(f"[error] processing change: {e}")

    def _process_new_bytes(self):
        if not self.file_path.exists():
            return

        # Read only the new bytes since last position
        with open_text(self.file_path) as f:
                f.seek(self.file_position)
            chunk = f.read()
            if not chunk:
                    return
                self.file_position = f.tell()

        # Handle partial trailing line across writes
        text = self._tail_buffer + chunk
        lines = text.splitlines(keepends=False)
        if text and not text.endswith(("\n", "\r")):
            self._tail_buffer = lines.pop() if lines else text
        else:
            self._tail_buffer = ""

        # Parse each new CSV line
        rows_as_tuples: List[Tuple] = []
        for line in lines:
            if not line.strip():
                continue
            try:
                for row in csv.reader([line]):
                    if not row:
                        continue
                    # If the writer wrote the header again, skip it
                    if self.header and [c.strip() for c in row] == self.header:
                        continue
                    d = self._row_to_dict(row)
                    tup = self._dict_to_tuple(d)   # <-- this method exists below
                    if tup:
                        rows_as_tuples.append(tup)
        except Exception as e:
                print(f"[warn] row parse error: {e}; line={line[:120]}...")
                continue

        if rows_as_tuples:
            print("tuple_len=", len(rows_as_tuples[0]), "sample=", rows_as_tuples[0][:3], "...")
            inserted = batch_insert_readings(rows_as_tuples)
            print(f"[append] considered={len(rows_as_tuples)} inserted={inserted}")
        else:
            inserted = 0

    def _row_to_dict(self, row: List[str]) -> Dict[str, Any]:
        """Zip row to header dict; if no header, synthesize keys c0,c1,..."""
        if self.header:
            clean_header = [h.lstrip("\ufeff").strip() for h in self.header]
            d = {clean_header[i]: (row[i].strip() if i < len(row) else "")
                 for i in range(len(clean_header))}
            # Safety: if BOM sneaks in anyway
            if "Timestamp" not in d and "\ufeffTimestamp" in d:
                d["Timestamp"] = d.pop("\ufeffTimestamp")
        else:
            d = {f"c{i}": (row[i].strip() if i < len(row) else "") for i in range(len(row))}
        return d

    def _dict_to_tuple(self, d: Dict[str, Any]) -> Optional[Tuple]:
        """Map a row-dict to the INSERT tuple expected by db.batch_insert_readings (11 values)."""
        ts = d.get("Timestamp") or d.get("time") or ""
        reading_ts = self._parse_timestamp(ts)
            if not reading_ts:
            return None

        def getf(k: str) -> Optional[float]:
            v = d.get(k)
            if v is None or str(v).strip() == "":
                return None
            try:
                return float(str(v).strip())
            except Exception:
                return None

        temperature_c   = getf("TempOut(C)")
        humidity_pct    = getf("HumOut")
        rainfall_mm     = getf("RainRate(mm/hr)")
        pressure_hpa    = getf("Barometer(hPa)")
        windspeed_ms    = getf("WindSpeed(m/s)")
        battery_voltage = getf("BatteryVolts")

        fields_json = json.dumps(d, ensure_ascii=False)
        raw_line = ",".join(f"{k}={d.get(k, '')}" for k in d.keys())
        line_checksum = hashlib.sha256(raw_line.encode("utf-8", errors="ignore")).hexdigest()

            return (
                self.obs_id,
            reading_ts,           # datetime object (mysql-connector handles this)
                temperature_c,
                humidity_pct,
                rainfall_mm,
                pressure_hpa,
                windspeed_ms,
            battery_voltage,
            fields_json,
                raw_line,
            line_checksum,
            )

    def _parse_timestamp(self, s: str) -> Optional[datetime]:
        if not s:
            return None
        s = s.strip()
        for fmt in self.time_formats:
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                continue
        print(f"[warn] could not parse timestamp: {s}")
        return None


def main():
    data_file  = os.getenv("DATA_FILE_APPEND")
    obs_id     = os.getenv("OBS_ID", "ahm")
    has_header = os.getenv("CSV_HAS_HEADER", "true").lower() == "true"

    if not data_file:
        print("ERROR: set DATA_FILE_APPEND in backend/.env"); return
    p = Path(data_file)
    if not p.exists():
        print(f"ERROR: file not found: {p}"); return

    print(f"Starting realtime ingester (append mode) for {obs_id}")
    print(f"Watching: {p}")
    print(f"Has header: {has_header}")

    handler = WeatherFileHandler(str(p), obs_id, has_header)
    obs = Observer()
    obs.schedule(handler, str(p.parent), recursive=False)
    obs.start()
    print("File watcher started. Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping...")
        obs.stop()
    finally:
        obs.join()
        print("Stopped.")


if __name__ == "__main__":
    main()
