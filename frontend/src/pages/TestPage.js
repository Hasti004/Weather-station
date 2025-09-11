/**
 * Test page to verify environment variables and API connectivity
 */

import React, { useState, useEffect } from 'react';

const TestPage = () => {
  const [apiStatus, setApiStatus] = useState('Testing...');
  const [envVars, setEnvVars] = useState({});

  useEffect(() => {
    const vars = {
      REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
      REACT_APP_LIVE_INTERVAL_MS: process.env.REACT_APP_LIVE_INTERVAL_MS,
    };
    setEnvVars(vars);

    const testApi = async () => {
      try {
        const apiBase = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBase}/health`);
        if (response.ok) {
          const data = await response.json();
          setApiStatus(`✅ API Connected: ${JSON.stringify(data)}`);
        } else {
          setApiStatus(`❌ API Error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        setApiStatus(`❌ API Failed: ${error && error.message ? error.message : 'Unknown error'}`);
      }
    };

    testApi();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Frontend Test Page</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Environment Variables</h2>
            <div className="space-y-2">
              {Object.entries(envVars).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-mono text-sm text-gray-600">{key}:</span>
                  <span className="font-mono text-sm text-gray-900">{value === undefined ? 'undefined' : `"${value}"`}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">API Status</h2>
            <div className="p-4 bg-gray-100 rounded">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">{apiStatus}</pre>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a href="/live" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">Go to Live Dashboard</a>
        </div>
      </div>
    </div>
  );
};

export default TestPage;


