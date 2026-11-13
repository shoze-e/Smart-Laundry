# Functional and Non-Functional Requirements

## Functional Requirements
1. **Location Selection**: System shall support multiple predefined Lagos coordinates (Ikeja, Lekki, Yaba, etc.).
2. **Weather Retrieval**: System shall fetch live forecast data using Open-Meteo API.
3. **Drying Score**: System shall dynamically calculate a 0-100 score representing outdoor drying suitability.
4. **Time Estimation**: System shall calculate an estimated drying time factoring in temperature, humidity, wind, fabric type, washing method, and load size.
5. **Drying Window Identification**: System shall identify continuous hours of daylight without rain for safe outdoor drying.
6. **Recommendation Generation**: System shall output an actionable text recommendation (Excellent, Good, Moderate, Poor, Rain Likely).
7. **Offline Mode**: System shall cache the last successful forecast and serve it if the network is down.
8. **History Storage**: System shall save generated laundry plans locally for later review.

## Non-Functional Requirements
1. **Framework Restriction**: Must be implemented purely in HTML5, CSS3, and Vanilla JavaScript.
2. **Performance**: System shall render the primary dashboard recommendation within 2 seconds of API response.
3. **Responsive Design**: Interface must scale flawlessly from 320px (mobile) to 1440px (desktop).
4. **Accessibility**: Form controls must have labels, buttons must be keyboard accessible, and colors must have appropriate contrast.
5. **No Backend**: System must execute entirely on the client-side.
