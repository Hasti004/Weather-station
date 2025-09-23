# Weather Landing Page

A modern, polished landing page for the Weather weather monitoring system, matching the reference design exactly.

## Features

- **Sticky Top Bar**: Brand block with logo and organization name, plus navigation links
- **Hero Section**: Large "Weather" title with soft blue gradient background and ghost menu button
- **Station Cards**: Three weather station cards in a responsive row layout
- **Live Data Integration**: Automatically fetches and displays real weather data
- **Responsive Design**: Mobile-friendly with horizontal scrolling on smaller screens
- **Accessibility**: Full keyboard navigation, ARIA labels, and reduced motion support

## Components

### TopBar.jsx
- Sticky header with scroll-based shadow effect
- Brand logo and organization information
- Navigation links (Dashboard, Reports, Contact)

### Hero.jsx
- Large gradient title "Weather"
- Subtitle "Your Weather, Visualized Smarter"
- Ghost menu button (top-right)

### StationCard.jsx
- Presentational component for individual weather stations
- Circular weather avatar with gradient background
- Temperature display, station name, condition, and location
- Mini floating chip with temperature
- Clickable link to station detail page

### StationRow.jsx
- Container for station cards
- Responsive grid layout (3 columns on desktop, horizontal scroll on mobile)

### Landing.jsx
- Main page assembly
- Integrates with existing `useLiveLatest` and `useObservatories` hooks
- Transforms live API data to match component expectations
- Fallback to placeholder data if live data unavailable

## Data Integration

The landing page automatically integrates with your existing weather data:

```javascript
// Uses your existing hooks
const { data: liveData, isLoading, error } = useLiveLatest();
const { getStationName, getStationLocation } = useObservatories();

// Transforms live data to component format
const stations = liveData.map(reading => ({
  id: reading.station_id.toString(),
  name: getStationName(reading.station_id),
  tempC: Math.round(reading.temperature_c),
  condition: determineCondition(reading), // Based on rainfall, humidity, etc.
  area: getStationLocation(reading.station_id)
}));
```

## Styling

All styles are in `src/styles/landing.css` using CSS custom properties:

```css
:root {
  --ink-900: #1f2937;  /* title text */
  --ink-700: #334155;  /* headings */
  --ink-500: #64748b;  /* subtext */
  --primary-700: #1e40af;
  --primary-600: #2563eb;
  --primary-500: #3b82f6;
  --primary-400: #60a5fa;
  /* ... more tokens */
}
```

## Routing

The landing page is now the default route (`/`). Your existing routes remain unchanged:

- `/` - Landing page (new)
- `/home` - Original home page
- `/dashboard` - Dashboard
- `/station/:id` - Station detail pages
- `/live` - Live dashboard

## Responsive Behavior

- **Desktop**: Three equal-width cards in a row
- **Tablet/Mobile**: Horizontal scrolling with snap points
- **Top bar**: Stacks vertically on very small screens
- **Hero**: Scales title size appropriately

## Accessibility

- All interactive elements have focus rings
- Images have proper alt text
- Cards have ARIA labels
- Respects `prefers-reduced-motion` for animations
- Semantic HTML structure

## Customization

To customize the landing page:

1. **Station Data**: Modify the data transformation logic in `Landing.jsx`
2. **Styling**: Update CSS custom properties in `landing.css`
3. **Navigation**: Change links in `TopBar.jsx`
4. **Hero Content**: Update title/subtitle in `Hero.jsx`
5. **Weather Icons**: Add new icons in `icons/weather.tsx`

## No Tailwind CSS

This implementation uses pure CSS with custom properties instead of Tailwind, maintaining the exact visual design while being framework-agnostic.

