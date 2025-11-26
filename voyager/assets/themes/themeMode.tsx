import React, { createContext, useContext, useState, ReactNode } from 'react';
import Themes from './themes';

type ThemeMode = 'light' | 'dark';
type ColorScheme = 'blue' | 'grey';

interface ThemeContextType {
  theme: typeof Themes.lightBlue | typeof Themes.darkBlue | typeof Themes.lightGrey | typeof Themes.darkGrey;
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('grey');
  
  const getTheme = () => {
    if (themeMode === 'light') {
      return colorScheme === 'blue' ? Themes.lightBlue : Themes.lightGrey;
    } else {
      return colorScheme === 'blue' ? Themes.darkBlue : Themes.darkGrey;
    }
  };
  
  const toggleTheme = () => {
    setThemeMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
  };

  const toggleColorScheme = () => {
    setColorScheme(prevScheme => prevScheme === 'blue' ? 'grey' : 'blue');
  };

  return (
    <ThemeContext.Provider value={{ 
      theme: getTheme(), 
      themeMode, 
      colorScheme, 
      toggleTheme, 
      toggleColorScheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};