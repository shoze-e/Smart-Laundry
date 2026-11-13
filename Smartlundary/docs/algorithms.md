# Algorithm Explanations

## 1. Drying Score Algorithm (0-100)
The score is a sum of weighted weather factors:
- **Temperature (20%)**: Peak efficiency > 30°C.
- **Humidity (25%)**: Peak efficiency < 50%. Zero contribution if > 85%.
- **Wind (20%)**: Peak efficiency between 15-30 km/h.
- **Rain Probability (30%)**: Peak efficiency < 5%.
- **Precipitation (5%)**: Peak efficiency at 0mm.

*Edge Case Override*: If Precipitation > 1.0mm or Rain Prob >= 70%, the total score is hard-capped at 40 (Poor category) regardless of temperature or wind.

## 2. Drying Time Estimator
A heuristic mathematical model based on evaporation principles.
Formula:
`Estimated Hours = BASE_TIME(3.5) × FabricFactor × WashMultiplier × LoadMultiplier × TempAdjustment × HumAdjustment × WindAdjustment`

**Adjustments:**
- `TempAdjustment`: `25 / Temp`. As temperature increases beyond 25C, the multiplier drops below 1 (faster drying).
- `HumAdjustment`: Rises exponentially as humidity approaches 100%, vastly increasing the estimated time.
- `WindAdjustment`: Inverse relationship to wind speed above 10km/h.

## 3. Best Drying Window Scanner
The algorithm scans the next 24 hours of forecast data with a sliding window matching the `Estimated Hours`.
It evaluates each window by:
1. Ensuring daylight hours (`isDay = true`).
2. Ensuring no heavy rain in any hour of the window slice.
3. Calculating the average drying score of the hours within the slice.
The slice with the highest adjusted average score is returned.
