import React from 'react';
import './styles/theme.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QueryProvider from './providers/QueryProvider';
import Landing from './pages/Landing';
import HomePage from './pages/HomePage';
import StationPage from './pages/StationPage';
import TestPage from './pages/TestPage.js';
import ContactPage from './pages/ContactPage';
// ErrorBoundary is now applied globally in index.js. Do not wrap here to avoid duplication.

function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/station/:id" element={<StationPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

export default App;
