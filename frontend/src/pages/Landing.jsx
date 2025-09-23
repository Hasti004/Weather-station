import React from 'react';
import '../styles/landing.css';
import TopBar from '../components/TopBar';
import { Hero } from '../components/Hero';
import { StationRow } from '../components/StationRow';
import { UpdatesRail } from '../components/UpdatesRail';
import { Footer } from '../components/Footer';
import ahmedabadImage from '../data/Ahmedabad_weather.jpg';
import udaipurImage from '../data/udaipur_weather.jpeg';
import abuImage from '../data/Abu_weather.png';

export default function Landing() {
  // Use static data first to ensure the page renders
  const stations = [
    {
      id: "ahm",
      name: "Ahmedabad Station",
      tempC: 24,
      condition: "Sunny",
      area: "Ahmedabad, Gujarat",
      image: ahmedabadImage,
      metrics: {
        humidity_pct: 65,
        rainfall_mm: 0,
        pressure_hpa: 1013,
        windspeed_ms: 3.2
      }
    },
    {
      id: "udi",
      name: "Udaipur Station",
      tempC: 18,
      condition: "Cloudy",
      area: "Udaipur, Rajasthan",
      image: udaipurImage,
      metrics: {
        humidity_pct: 78,
        rainfall_mm: 2.5,
        pressure_hpa: 1008,
        windspeed_ms: 2.1
      }
    },
    {
      id: "mtabu",
      name: "Mt Abu Station",
      tempC: 15,
      condition: "Rainy",
      area: "Mount Abu, Rajasthan",
      image: abuImage,
      metrics: {
        humidity_pct: 85,
        rainfall_mm: 8.2,
        pressure_hpa: 1005,
        windspeed_ms: 4.1
      }
    }
  ];

  return (
    <div className="landing-page">
      <TopBar />
      <Hero />
      <StationRow stations={stations} />
      <UpdatesRail />
      <Footer />
    </div>
  );
}
