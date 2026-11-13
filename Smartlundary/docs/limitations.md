# Technical Limitations

## 1. Forecast Accuracy
The engine is only as good as the Open-Meteo forecast data. Sudden, unpredicted tropical showers (common in Lagos) will bypass the algorithm if they are not in the forecast model.

## 2. Approximate Drying Times
The drying time mathematical model is a heuristic approximation based on relative evaporation rates. It cannot account for variables like fabric thickness variations, direct sunlight exposure vs shade, indoor ventilation quality, or exact machine spin RPMs.

## 3. Storage Volatility
`localStorage` is browser and device specific. If a user clears their browser cache or switches from mobile to desktop, their laundry history and preferences will not sync. A backend database would be required for persistence across devices.

## 4. Notifications
Web Notifications require explicit user permission. Furthermore, background notifications (when the browser is closed) rely on Service Worker push events which are not fully implemented across all mobile OS environments (e.g., iOS Safari has strict limitations without adding to home screen).
