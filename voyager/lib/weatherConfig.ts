export const WEATHER_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_WEATHER_API_KEY || '',
  baseUrl: 'https://api.openweathermap.org',
};

if (!WEATHER_CONFIG.apiKey) {
  console.warn(
    'OpenWeatherMap API key is missing. Please set EXPO_PUBLIC_WEATHER_API_KEY in your .env file.'
  );
}

