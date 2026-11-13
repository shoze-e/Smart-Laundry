# System Architecture

The Smart Weather Laundry Scheduler is designed around a strictly client-side, modular architecture.

## 1. Data Layer (`/data`)
Contains static configuration for physics heuristics:
- `locations.js`: Pre-defined GPS coordinates for Lagos areas.
- `fabrics.js`: Base drying factors, washing machine spin multipliers, and load size penalties.

## 2. Service Layer (`/js/weather.js`, `/js/storage.js`)
Handles I/O operations:
- `weather.js`: Acts as a repository pattern to fetch from Open-Meteo.
- `storage.js`: An abstraction over the native browser `localStorage` API.

## 3. Core Engine (Logic Layer)
Pure functions without DOM dependencies:
- `drying-score.js`: The algorithmic engine converting weather params to a 0-100 score.
- `drying-time.js`: The heuristic engine calculating estimated hours.
- `forecast.js`: Window analysis logic scanning arrays for consecutive dry daylight hours.
- `laundry.js`: The Facade pattern wrapping the underlying logic engines into a single `calculateLaundryRecommendation` function.

## 4. UI Layer (`/js/ui.js`, `/*.html`)
Handles all DOM updates, routing, and form submissions. It passes inputs to the Logic Layer and renders the returned objects.

## 5. PWA Layer (`sw.js`, `manifest.json`)
The service worker provides a network-first caching strategy for static assets, allowing the app frame to load while offline.
