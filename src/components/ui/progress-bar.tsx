import { useEffect } from 'react';
import { StyleSheet, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors } from '@/constants/theme';

interface ProgressBarProps {
  /** 0–1 */
  value: number;
  tint: ColorValue;
  trackColor?: ColorValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Thin capsule progress bar (replaces the web's `bg-slate-100 rounded-full h-1.5` bars). Animates on change. */
export function ProgressBar({
  value,
  tint,
  trackColor = colors.tertiaryFill,
  height = 6,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value || 0));
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(clamped);

  useEffect(() => {
    progress.set(reduceMotion ? clamped : withTiming(clamped, { duration: 450 }));
  }, [clamped, reduceMotion, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}>
      <Animated.View style={[styles.fill, { borderRadius: height / 2, backgroundColor: tint }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
