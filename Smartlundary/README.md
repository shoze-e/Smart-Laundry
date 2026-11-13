# Smart Weather Laundry Scheduler

A deterministic weather-to-laundry recommendation engine built for a Computer Science Diploma II project at Lagos State University.

## Problem Statement
Residents of Lagos struggle with unpredictable weather patterns affecting their laundry. Traditional weather apps provide meteorological data (e.g., "30°C", "20% Rain") but do not answer the core question: **"Can my clothes dry today, and how long will it take?"**

## Solution
This application bridges that gap by implementing a custom logic engine that processes Open-Meteo forecast data and translates it into a 0-100 "Drying Score", estimating drying times based on fabric types, load sizes, and machine spin settings.

## Features
- **Laundry Decision Engine:** Translates raw weather data into an actionable recommendation.
- **Detailed Forecast Analysis:** Hourly and daily forecast breakdown.
- **Lagos Location Comparison:** Compares conditions across all 20 Local Government Areas in Lagos State.
- **Personalized Planner:** Accounts for Fabric Type, Wash Method, and Load Size.
- **What-If Simulator:** Let's you manipulate weather inputs manually.
- **Progressive Web App (PWA):** Works offline with cached fallback data.
- **Browser Notifications:** Alerts on rain risk.

## Technology Stack
**Strictly NO Frameworks or Build Tools.**
- HTML5
- CSS3 (Vanilla, custom properties)
- Vanilla JavaScript (ES6 Modules)
- `localStorage` API for state
- Service Workers for offline PWA
- Open-Meteo REST API

## How to Run
Since this project uses native ES Modules (`import/export`), you must serve it over a local HTTP server to bypass CORS file restrictions in modern browsers.
Do not open `index.html` directly from the file system (`file:///...`).

### Using Python (recommended)
1. Open a terminal in the project directory.
2. Run `python -m http.server 8000`
3. Navigate to `http://localhost:8000` in your browser.

## Documentation
See the `/docs` directory for complete academic documentation:
- `requirements.md`
- `architecture.md`
- `algorithms.md`
- `testing.md`
- `use-cases.md`
- `limitations.md`
