import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'checking';
  size?: number;
}

export default function StatusIndicator({ status, size = 12 }: StatusIndicatorProps) {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let animation: Animated.CompositeAnimation;
    
    if (status === 'checking') {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    } else {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
    }
    
    animation.start();
    return () => {
      animation.stop();
      pulseAnim.setValue(1);
    };
  }, [status, pulseAnim]);

  const getColor = () => {
    switch (status) {
      case 'online':
        return colors.success;
      case 'offline':
        return colors.error;
      case 'checking':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.indicator,
        {
          width: size,
          height: size,
          backgroundColor: getColor(),
          opacity: pulseAnim,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  indicator: {
    borderRadius: 50,
  },
});