-- New MySQL schema for multi-station weather system
DROP DATABASE IF EXISTS weather_stations;
CREATE DATABASE weather_stations CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE weather_stations;

-- Stations table
CREATE TABLE stations (
    station_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    location VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Readings table with all 16 parameters
CREATE TABLE readings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    barometer_hpa FLOAT,
    battery_status VARCHAR(20),
    battery_volts FLOAT,
    hum_in FLOAT,
    hum_out FLOAT,
    rain_day_mm FLOAT,
    rain_rate_mm_hr FLOAT,
    solar_rad FLOAT,
    sunrise TIME,
    sunset TIME,
    temp_in_c FLOAT,
    temp_out_c FLOAT,
    wind_dir VARCHAR(10),
    wind_speed_ms FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES stations(station_id),
    INDEX idx_station_timestamp (station_id, timestamp),
    INDEX idx_timestamp (timestamp)
);

-- Insert the three stations
INSERT INTO stations (name, location) VALUES
('Udaipur', 'Udaipur, Rajasthan'),
('Ahmedabad', 'Ahmedabad, Gujarat'),
('Mount Abu', 'Mount Abu, Rajasthan');

-- Create a view for latest readings
CREATE VIEW v_latest_readings AS
SELECT s.name as station_name, s.location, r.*
FROM readings r
JOIN stations s ON r.station_id = s.station_id
WHERE r.timestamp = (
    SELECT MAX(timestamp)
    FROM readings r2
    WHERE r2.station_id = r.station_id
);
