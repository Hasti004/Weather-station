-- MySQL 8+ schema setup for 'observatory'
DROP DATABASE IF EXISTS observatory;
CREATE DATABASE observatory CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE observatory;

CREATE TABLE IF NOT EXISTS observatories (
  obs_id      VARCHAR(64)  NOT NULL PRIMARY KEY,
  name        VARCHAR(128) NOT NULL,
  location    VARCHAR(128) NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS readings (
  id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  obs_id             VARCHAR(64)     NOT NULL,
  reading_ts         DATETIME(6)     NOT NULL,
  temperature_c      DECIMAL(5,2)    NULL,
  humidity_pct       DECIMAL(5,2)    NULL,
  rainfall_mm        DECIMAL(7,2)    NULL,
  pressure_hpa       DECIMAL(7,2)    NULL,
  windspeed_ms       DECIMAL(6,2)    NULL,
  visibility_km      DECIMAL(6,2)    NULL,
  battery_pct        DECIMAL(5,2)    NULL,
  battery_voltage_v  DECIMAL(5,2)    NULL,
  fields_json        JSON            NULL,
  raw_line           TEXT            NOT NULL,
  line_checksum      CHAR(64)        NOT NULL,
  created_at         TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY u_obs_ts (obs_id, reading_ts),
  UNIQUE KEY u_checksum (line_checksum),
  KEY ix_obs_ts (obs_id, reading_ts),
  KEY ix_ts (reading_ts)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS archive_files (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  obs_id        VARCHAR(64)     NOT NULL,
  file_name     VARCHAR(255)    NOT NULL,
  file_checksum CHAR(64)        NOT NULL,
  size_bytes    BIGINT UNSIGNED NOT NULL,
  status        ENUM('queued','processing','done','failed') NOT NULL DEFAULT 'queued',
  error_text    TEXT            NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at   TIMESTAMP       NULL,
  UNIQUE KEY u_obs_file (obs_id, file_name),
  KEY ix_status (status)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW v_latest AS
SELECT r.*
FROM readings r
JOIN (
  SELECT obs_id, MAX(reading_ts) AS max_ts
  FROM readings
  GROUP BY obs_id
) t
  ON t.obs_id = r.obs_id
 AND t.max_ts = r.reading_ts;

INSERT INTO observatories (obs_id, name, location, created_at)
VALUES
  ('ahm',   'Observatory AHM',   'Ahmedabad',  NOW()),
  ('mtabu', 'Observatory MTABU', 'Mount Abu',  NOW()),
  ('udi',   'Observatory UDI',   'Udaipur',    NOW())
AS new
ON DUPLICATE KEY UPDATE
  name       = new.name,
  location   = new.location,
  created_at = new.created_at;

-- Verification
SHOW TABLES;
DESCRIBE observatories;
DESCRIBE readings;
SELECT obs_id, name, location, created_at FROM observatories ORDER BY obs_id;
SHOW CREATE VIEW v_latest;

-- Sample UPSERT snippet (reference only)
/*
INSERT INTO readings (
  obs_id, reading_ts, temperature_c, humidity_pct, rainfall_mm,
  pressure_hpa, windspeed_ms, visibility_km, battery_pct, battery_voltage_v,
  fields_json, raw_line, line_checksum
) VALUES (
  'ahm', '2025-07-01 00:05:00.000000', 30.25, 70.5, 0.00,
  1004.10, 2.50, 8.00, NULL, NULL,
  JSON_OBJECT('source','loader','v',1), 'raw,csv,line,here', 'abc123...sha256...'
) AS new
ON DUPLICATE KEY UPDATE
  temperature_c     = new.temperature_c,
  humidity_pct      = new.humidity_pct,
  rainfall_mm       = new.rainfall_mm,
  pressure_hpa      = new.pressure_hpa,
  windspeed_ms      = new.windspeed_ms,
  visibility_km     = new.visibility_km,
  battery_pct       = new.battery_pct,
  battery_voltage_v = new.battery_voltage_v,
  fields_json       = new.fields_json,
  raw_line          = new.raw_line,
  line_checksum     = new.line_checksum;
*/


