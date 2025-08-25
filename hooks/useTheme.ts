import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  success: string;
  error: string;
  overlay: string;
}

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#000000',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  primary: '#000000',
  success: '#10B981',
  error: '#EF4444',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

const darkColors: ThemeColors = {
  background: '#000000',
  surface: '#1F2937',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#374151',
  primary: '#FFFFFF',
  success: '#10B981',
  error: '#EF4444',
  overlay: 'rgba(255, 255, 255, 0.1)',
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>('system');
  
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setTheme(savedTheme as Theme);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  const updateTheme = async (newTheme: Theme) => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  return {
    theme,
    isDark,
    colors,
    updateTheme,
  };
});