# Testing Strategy

## 1. Automated Algorithm Sanity Checks
Since the project restricts the use of build tools like NPM and testing frameworks like Jest, testing is implemented natively via `tests.html`.

**Test Cases Covered in `tests.html`:**
- **Excellent Weather**: High temp, low humidity, low rain prob. (Expects: Excellent)
- **Heavy Rain**: High rain prob, precipitation > 1.0mm. (Expects: Poor, Score < 50)
- **High Humidity Penalty**: Ensures that 95% humidity prevents an "Excellent" score despite good temperature.
- **Fabric Physics**: Validates that silk returns a lower estimated time than towels under identical conditions.
- **Load Size Penalty**: Validates that a large load takes longer than a small load.

## 2. Manual UI Testing
- **Responsiveness**: Verify CSS flex/grid reflows on 320px and 768px breakpoints via Developer Tools.
- **Navigation**: Verify all internal links route correctly and active states apply.
- **API Failure**: Disconnect internet, load page. Verify the `localStorage` fallback handles the failure gracefully and displays the "Offline Mode" badge.

## 3. PWA Validation
- Check Chrome DevTools > Application > Manifest to ensure it is valid.
- Check Service Worker registration and verify offline fetch interceptions.
