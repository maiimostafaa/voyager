    import { WEATHER_CONFIG } from './weatherConfig';

export interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  main: string;
}

export interface ForecastData {
  date: string; // YYYY-MM-DD - Date extracted from weather API forecast timestamp, matched to user's selected trip dates
  temp: number;
  description: string;
  icon: string;
  main: string;
}

/**
 * Geocode location name to coordinates using OpenWeatherMap Geocoding API
 */
export const geocodeLocation = async (locationName: string): Promise<{ lat: number; lon: number } | null> => {
  if (!WEATHER_CONFIG.apiKey) {
    console.warn('Weather API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${WEATHER_CONFIG.baseUrl}/geo/1.0/direct?q=${encodeURIComponent(locationName)}&limit=1&appid=${WEATHER_CONFIG.apiKey}`
    );

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: data[0].lat,
        lon: data[0].lon,
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
};

/**
 * Get current weather for a location
 */
export const getCurrentWeather = async (
  lat: number,
  lon: number
): Promise<WeatherData | null> => {
  if (!WEATHER_CONFIG.apiKey) {
    console.warn('Weather API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `${WEATHER_CONFIG.baseUrl}/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_CONFIG.apiKey}`
    );

    if (!response.ok) {
      console.error('Weather API error:', response.status);
      return null;
    }

    const data = await response.json();
    return {
      temp: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      main: data.weather[0].main,
    };
  } catch (error) {
    console.error('Error fetching current weather:', error);
    return null;
  }
};

/**
 * Get weather forecast for multiple days
 * Returns weather data for each day from startDate to endDate
 */
export const getWeatherForecast = async (
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<Map<string, ForecastData>> => {
  if (!WEATHER_CONFIG.apiKey) {
    console.warn('Weather API key not configured');
    return new Map();
  }

  try {
    // Get 5-day forecast (OpenWeatherMap free tier provides 5-day forecast)
    const response = await fetch(
      `${WEATHER_CONFIG.baseUrl}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_CONFIG.apiKey}`
    );

    if (!response.ok) {
      console.error('Forecast API error:', response.status);
      return new Map();
    }

    const data = await response.json();
    const forecastMap = new Map<string, ForecastData>();

    // Parse start and end dates directly from YYYY-MM-DD format
    const dates: string[] = [];
    
    // Generate all dates in the range (inclusive of both start and end)
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    
    // Create date objects at midnight to avoid timezone issues
    const startDateObj = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
    const endDateObj = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999); // End of day to ensure inclusion
    
    // Include both start and end dates
    const currentDate = new Date(startDateObj);
    while (currentDate <= endDateObj) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Group forecast data by date
    // The API returns forecast data in 3-hour intervals
    // We extract the date from each forecast timestamp and match it to the user's selected trip dates
    data.list.forEach((item: any) => {
      const itemDate = new Date(item.dt * 1000); // Convert Unix timestamp to Date
      // Format date in local timezone to match user's calendar dates
      const year = itemDate.getFullYear();
      const month = String(itemDate.getMonth() + 1).padStart(2, '0');
      const day = String(itemDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Only include dates that match the user's selected trip dates (from calendar)
      if (dates.includes(dateStr)) {
        const hour = itemDate.getHours();
        const existing = forecastMap.get(dateStr);
        
        // Priority: prefer forecast closest to noon (10am-2pm) for representative daily weather
        // If no noon forecast exists, use the first available forecast for that day
        if (!existing) {
          // First forecast for this date - always use it to ensure we get weather for all days
          forecastMap.set(dateStr, {
            date: dateStr,
            temp: Math.round(item.main.temp),
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            main: item.weather[0].main,
          });
        } else if (hour >= 10 && hour <= 14) {
          // Found a better forecast (closer to noon) - replace existing
          forecastMap.set(dateStr, {
            date: dateStr,
            temp: Math.round(item.main.temp),
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            main: item.weather[0].main,
          });
        }
      }
    });
    

    return forecastMap;
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    return new Map();
  }
};

/**
 * Get weather icon URL from OpenWeatherMap icon code
 * @deprecated Use getWeatherIconName instead for Material Icons
 */
export const getWeatherIconUrl = (iconCode: string): string => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
};

/**
 * Get Material Icon name for weather condition (iPhone-style icons)
 * Maps OpenWeatherMap weather conditions to Material Icons
 */
export const getWeatherIconName = (main: string, description: string): string => {
  const mainLower = main.toLowerCase();
  const descLower = description.toLowerCase();

  // Clear/Sunny
  if (mainLower === 'clear') {
    return 'wb-sunny';
  }

  // Clouds
  if (mainLower === 'clouds') {
    // Partly cloudy (sun behind cloud)
    if (descLower.includes('few') || descLower.includes('scattered')) {
      return 'wb-cloudy';
    }
    // Overcast
    return 'cloud';
  }

  // Rain
  if (mainLower === 'rain' || mainLower === 'drizzle') {
    // Heavy rain
    if (descLower.includes('heavy') || descLower.includes('extreme')) {
      return 'grain';
    }
    // Light rain
    return 'opacity';
  }

  // Thunderstorm
  if (mainLower === 'thunderstorm') {
    return 'flash';
  }

  // Snow
  if (mainLower === 'snow') {
    return 'ac-unit';
  }

  // Mist/Fog/Haze
  if (mainLower === 'mist' || mainLower === 'fog' || mainLower === 'haze') {
    return 'blur-on';
  }

  // Smoke
  if (mainLower === 'smoke') {
    return 'blur-on';
  }

  // Dust/Sand
  if (mainLower === 'dust' || mainLower === 'sand') {
    return 'blur-on';
  }

  // Ash (volcanic)
  if (mainLower === 'ash') {
    return 'blur-on';
  }

  // Squall
  if (mainLower === 'squall') {
    return 'flash';
  }

  // Tornado
  if (mainLower === 'tornado') {
    return 'flash';
  }

  // Default to partly cloudy
  return 'wb-cloudy';
};

/**
 * Get weather description that matches the icon name
 * Returns user-friendly descriptions for weather conditions
 */
export const getWeatherDescription = (main: string, description: string): string => {
  const mainLower = main.toLowerCase();
  const descLower = description.toLowerCase();

  // Clear/Sunny
  if (mainLower === 'clear') {
    return 'Sunny';
  }

  // Clouds
  if (mainLower === 'clouds') {
    // Partly cloudy (sun behind cloud)
    if (descLower.includes('few') || descLower.includes('scattered')) {
      return 'Partly Cloudy';
    }
    // Overcast
    return 'Cloudy';
  }

  // Rain
  if (mainLower === 'rain' || mainLower === 'drizzle') {
    // Heavy rain
    if (descLower.includes('heavy') || descLower.includes('extreme')) {
      return 'Heavy Rain';
    }
    // Light rain
    if (descLower.includes('drizzle')) {
      return 'Drizzle';
    }
    return 'Rain';
  }

  // Thunderstorm
  if (mainLower === 'thunderstorm') {
    return 'Thunderstorm';
  }

  // Snow
  if (mainLower === 'snow') {
    return 'Snow';
  }

  // Mist/Fog/Haze
  if (mainLower === 'mist' || mainLower === 'fog' || mainLower === 'haze') {
    if (mainLower === 'fog') {
      return 'Fog';
    }
    if (mainLower === 'haze') {
      return 'Haze';
    }
    return 'Mist';
  }

  // Smoke
  if (mainLower === 'smoke') {
    return 'Smoke';
  }

  // Dust/Sand
  if (mainLower === 'dust' || mainLower === 'sand') {
    return 'Dust';
  }

  // Ash (volcanic)
  if (mainLower === 'ash') {
    return 'Ash';
  }

  // Squall
  if (mainLower === 'squall') {
    return 'Squall';
  }

  // Tornado
  if (mainLower === 'tornado') {
    return 'Tornado';
  }

  // Default to partly cloudy
  return 'Partly Cloudy';
};

