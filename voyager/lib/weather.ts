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
    
    // Create date objects at midnight in local timezone to avoid timezone issues
    const startDateObj = new Date(startYear, startMonth - 1, startDay);
    const endDateObj = new Date(endYear, endMonth - 1, endDay);
    
    // Calculate number of days
    const diffTime = endDateObj.getTime() - startDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
    
    // Generate all dates in the range
    for (let i = 0; i < diffDays; i++) {
      const currentDate = new Date(startDateObj);
      currentDate.setDate(startDateObj.getDate() + i);
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }

    // Group forecast data by date
    // The API returns forecast data in 3-hour intervals
    // We extract the date from each forecast timestamp and match it to the user's selected trip dates
    data.list.forEach((item: any) => {
      const itemDate = new Date(item.dt * 1000); // Convert Unix timestamp to Date (in local timezone)
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
        } else if (Math.abs(hour - 12) < Math.abs(existing.temp - 12)) {
          // If we don't have a noon forecast, prefer the one closest to noon
          // (This is a fallback - we'll use the hour difference as a proxy)
          // Actually, let's keep the existing logic but ensure we always get at least one forecast per day
        }
      }
    });
    
    // Log for debugging: check which dates we're looking for vs what we found
    const foundDates = Array.from(forecastMap.keys());
    const missingDates = dates.filter(d => !forecastMap.has(d));
    
    if (missingDates.length > 0) {
      console.log('Weather forecast: Missing dates:', missingDates);
      console.log('Weather forecast: Found dates:', foundDates);
      console.log('Weather forecast: Total dates requested:', dates.length);
      
      // For missing dates, try to use the closest available forecast
      // This handles cases where the API might not have data for all dates
      missingDates.forEach((dateStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day, 12, 0, 0); // Noon for comparison
        
        // Find the closest forecast by time
        let closestForecast: any = null;
        let minTimeDiff = Infinity;
        
        data.list.forEach((item: any) => {
          const itemDate = new Date(item.dt * 1000);
          const timeDiff = Math.abs(itemDate.getTime() - targetDate.getTime());
          
          // Only consider forecasts within 36 hours (to avoid using very distant forecasts)
          if (timeDiff < 36 * 60 * 60 * 1000 && timeDiff < minTimeDiff) {
            minTimeDiff = timeDiff;
            closestForecast = item;
          }
        });
        
        // Use the closest forecast if found
        if (closestForecast) {
          forecastMap.set(dateStr, {
            date: dateStr,
            temp: Math.round(closestForecast.main.temp),
            description: closestForecast.weather[0].description,
            icon: closestForecast.weather[0].icon,
            main: closestForecast.weather[0].main,
          });
        }
      });
    }

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


