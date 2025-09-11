# Live Weather Dashboard

A React component that displays real-time weather data from multiple stations with automatic refresh every 30 seconds.

## Features

- **Auto-refresh**: Polls the FastAPI `/latest` endpoint every 30 seconds
- **Configurable interval**: Set `VITE_LIVE_INTERVAL_MS` environment variable
- **Error handling**: Graceful error states with retry functionality
- **Loading states**: Visual feedback during data fetching
- **Responsive design**: Works on desktop and mobile devices
- **AbortController**: Properly cancels ongoing requests when component unmounts

## Components

### `useLiveLatest.ts` Hook

Custom React hook that handles:
- Polling the API every 30 seconds (configurable)
- Managing loading, error, and data states
- Request cancellation with AbortController
- Manual refresh functionality

**Returns:**
```typescript
{
  data: WeatherReading[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}
```

### `LiveDashboard.tsx` Component

Main dashboard component that:
- Displays weather data from all stations in card format
- Shows key metrics: temperature, humidity, wind speed, pressure, etc.
- Handles empty, loading, and error states
- Provides manual refresh button
- Formats data with proper null handling

## Environment Variables

Create a `.env.local` file in the frontend directory:

```env
# API Base URL (default: http://localhost:8000)
VITE_API_BASE_URL=http://localhost:8000

# Live data refresh interval in milliseconds (default: 30000 = 30 seconds)
VITE_LIVE_INTERVAL_MS=30000
```

## Usage

### Basic Usage

```tsx
import LiveDashboard from './components/LiveDashboard';

function App() {
  return (
    <div>
      <LiveDashboard />
    </div>
  );
}
```

### With Custom Hook

```tsx
import { useLiveLatest } from './hooks/useLiveLatest';

function CustomDashboard() {
  const { data, isLoading, error, refresh } = useLiveLatest();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.map(station => (
        <div key={station.station_id}>
          <h3>{station.station_name}</h3>
          <p>Temperature: {station.temperature_c}°C</p>
        </div>
      ))}
    </div>
  );
}
```

## API Requirements

The component expects the FastAPI `/latest` endpoint to return:

```json
{
  "data": [
    {
      "station_id": 1,
      "reading_ts": "2025-01-15T10:30:00Z",
      "temperature_c": 25.5,
      "humidity_pct": 60.0,
      "rainfall_mm": 0.0,
      "pressure_hpa": 1013.25,
      "windspeed_ms": 5.2,
      "battery_voltage_v": 12.4,
      "station_name": "Udaipur",
      "location": "Udaipur, Rajasthan"
    }
  ],
  "count": 1
}
```

## Styling

The component uses Tailwind CSS classes. If Tailwind is not available, include the `LiveDashboard.css` file for fallback styles.

### Tailwind Classes Used

- `bg-gray-50`, `bg-white` - Background colors
- `text-gray-800`, `text-gray-600` - Text colors
- `rounded-lg`, `shadow-md` - Card styling
- `grid`, `grid-cols-1`, `md:grid-cols-2` - Responsive grid
- `animate-spin` - Loading animation
- `hover:bg-blue-700` - Hover effects

## Error Handling

The component handles various error scenarios:

1. **Network errors**: Shows error message with retry button
2. **API errors**: Displays HTTP status and error details
3. **Empty data**: Shows empty state with refresh option
4. **Loading states**: Shows spinner during data fetching

## Performance Considerations

- Uses `AbortController` to cancel ongoing requests
- Implements proper cleanup in `useEffect`
- Debounces rapid refresh button clicks
- Only re-renders when data actually changes

## Browser Support

- Modern browsers with ES6+ support
- Requires `fetch` API (polyfill available for older browsers)
- Uses `AbortController` (polyfill available for older browsers)

## Development

### Testing the Component

1. Start the FastAPI backend:
   ```bash
   cd backend
   uvicorn api:app --reload
   ```

2. Start the React frontend:
   ```bash
   cd frontend
   npm start
   ```

3. Navigate to the live dashboard page

### Customizing the Refresh Interval

Set the `VITE_LIVE_INTERVAL_MS` environment variable:

```env
# Refresh every 10 seconds
VITE_LIVE_INTERVAL_MS=10000

# Refresh every 2 minutes
VITE_LIVE_INTERVAL_MS=120000
```

### Adding New Weather Fields

1. Update the `WeatherReading` interface in `useLiveLatest.ts`
2. Add the field to the `renderStationCard` function in `LiveDashboard.tsx`
3. Update the API response format if needed

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure the FastAPI backend has CORS enabled
2. **API not responding**: Check that the backend is running on the correct port
3. **Data not updating**: Verify the API endpoint is returning fresh data
4. **Styling issues**: Ensure Tailwind CSS is properly configured

### Debug Mode

Add console logging to the hook for debugging:

```typescript
const fetchData = useCallback(async (signal?: AbortSignal) => {
  console.log('Fetching data from:', `${API_BASE_URL}/latest`);
  // ... rest of the function
}, []);
```
