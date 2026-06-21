import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeContextType = {
  isLightMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isLightMode: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Defer AsyncStorage access to after the native module is guaranteed to be ready
    const loadTheme = async () => {
      try {
        const theme = await AsyncStorage.getItem('app_theme');
        if (theme === 'light') {
          setIsLightMode(true);
        }
      } catch (e) {
        // AsyncStorage not ready yet — default to dark mode, silently ignore
        console.warn('ThemeContext: AsyncStorage not available yet', e);
      }
    };

    // Small defer to ensure native modules are fully initialized
    const timer = setTimeout(loadTheme, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = async () => {
    const newMode = !isLightMode;
    setIsLightMode(newMode);
    try {
      await AsyncStorage.setItem('app_theme', newMode ? 'light' : 'dark');
    } catch (e) {
      console.warn('ThemeContext: Could not save theme', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ isLightMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
