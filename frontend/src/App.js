import React from 'react';
import './styles/theme.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QueryProvider from './providers/QueryProvider';
import HomePage from './pages/HomePage';
import StationPage from './pages/StationPage';
import Dashboard from './pages/Dashboard';
import LivePage from './pages/LivePage.js';
import TestPage from './pages/TestPage.js';
// ErrorBoundary is now applied globally in index.js. Do not wrap here to avoid duplication.

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/station/:id" element={<StationPage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/test" element={<TestPage />} />
          {/* Legacy single-station dashboard (kept for compatibility) */}
          <Route path="/legacy" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
