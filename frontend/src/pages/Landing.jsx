import React, { useState, useEffect } from 'react';
import '../styles/landing.css';
import TopBar from '../components/TopBar';
import { Hero } from '../components/Hero';
import { StationRow } from '../components/StationRow';
import { UpdatesRail } from '../components/UpdatesRail';
import { Footer } from '../components/Footer';
import { getLatest } from '../services/api';
import ahmedabadImage from '../data/Ahmedabad_weather.jpg';
import udaipurImage from '../data/udaipur_weather.jpeg';
import abuImage from '../data/Abu_weather.png';

export default function Landing() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Map station IDs to images and areas
  const stationImages = {
    2: ahmedabadImage, // Ahmedabad
    1: udaipurImage,   // Udaipur
    3: abuImage        // Mt Abu
  };

  const stationAreas = {
    2: "Ahmedabad, Gujarat",
    1: "Udaipur, Rajasthan",
    3: "Mount Abu, Rajasthan"
  };

  const fetchLiveData = async () => {
    try {
      console.log('[Landing] Fetching live data...');
      const result = await getLatest();
      console.log('[Landing] Raw API result:', result);
      console.log('[Landing] Result type:', typeof result);
      console.log('[Landing] Result keys:', Object.keys(result || {}));

      if (result && result.data && Array.isArray(result.data)) {
        console.log('[Landing] Raw stations data:', result.data);
        console.log('[Landing] Number of stations:', result.data.length);

        const processedStations = result.data.map((station, index) => {

          return {
            id: station.slug || `station_${station.station_id}`,
            name: station.name || 'Unknown',
            tempC: station.temperature_c || 0,
            condition: getWeatherCondition(station.temperature_c, station.humidity_pct),
            area: stationAreas[station.station_id] || station.location || 'Unknown Location',
            image: stationImages[station.station_id],
            metrics: {
              humidity_pct: station.humidity_pct || 0,
              rainfall_mm: station.rainfall_mm || 0,
              pressure_hpa: station.pressure_hpa || 0,
              windspeed_ms: station.windspeed_ms || 0
            }
          };
        });

        console.log('[Landing] Processed stations:', processedStations);
        setStations(processedStations);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        console.log('[Landing] No data received from API or data is not an array');
        console.log('[Landing] Result.data:', result?.data);
        setStations([]);
      }
    } catch (error) {
      console.error('[Landing] Error fetching live data:', error);
      // Set empty stations array on error
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  const getWeatherCondition = (temp, humidity) => {
    if (temp > 30) return "Hot";
    if (temp < 15) return "Cold";
    if (humidity > 80) return "Humid";
    if (humidity < 40) return "Dry";
    return "Pleasant";
  };

  useEffect(() => {
    fetchLiveData();
    // Set up 30-second polling
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-page">
      <TopBar />
      <Hero />
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading live weather data...</p>
        </div>
      ) : (
        <>
          <StationRow stations={stations} />
          {lastUpdated && (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#666', fontSize: '0.9rem' }}>
              Last updated: {lastUpdated}
            </div>
          )}
          {stations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <p>No weather stations found. Please check the connection.</p>
            </div>
          )}
        </>
      )}
      <UpdatesRail />
      <Footer />
    </div>
  );
}
