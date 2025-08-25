import { Tabs } from 'expo-router';
import { Home, Plus, Moon, Sun } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { colors, theme, updateTheme, isDark } = useTheme();

  const toggleTheme = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarShowLabel: false,
        tabBarIconStyle: {
          marginTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color, size }) => <Home color={color} size={28} />,
          headerRight: () => (
            <TouchableOpacity
              onPress={toggleTheme}
              style={{ marginRight: 16, padding: 4 }}
              testID="theme-toggle"
            >
              {isDark ? (
                <Sun color={colors.text} size={24} />
              ) : (
                <Moon color={colors.text} size={24} />
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Sites',
          tabBarIcon: ({ color, size }) => <Plus color={color} size={28} />,
        }}
      />
    </Tabs>
  );
}