import React from 'react';
import './styles/theme.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import StationPage from './pages/StationPage';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/station/:id" element={<StationPage />} />
        {/* Legacy single-station dashboard (kept for compatibility) */}
        <Route path="/legacy" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
