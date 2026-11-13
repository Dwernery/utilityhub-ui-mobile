import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, mcuColors, radius, spacing } from '@/constants/theme';

/**
 * Loading placeholders shaped like the content they stand in for, used on every screen while its
 * first fetch is in flight (replacing bare spinners). They pulse gently, and hold still with
 * Reduce Motion on.
 */

const DarkContext = createContext(false);

/** Wrap a skeleton tree for dark surfaces (MCU). */
export function SkeletonTheme({ dark, children }: { dark?: boolean; children: ReactNode }) {
  return <DarkContext.Provider value={!!dark}>{children}</DarkContext.Provider>;
}

function usePulse() {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(0.45, { duration: 750 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);
  return useAnimatedStyle(() => ({ opacity: opacity.get() }));
}

export function Skeleton({
  width = '100%',
  height = 14,
  r = radius.sm / 1.5,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  r?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const dark = useContext(DarkContext);
  const pulse = usePulse();
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: r, backgroundColor: dark ? '#334155' : (colors.tertiaryFill as string) },
        pulse,
        style,
      ]}
    />
  );
}

/** Container with the card surface (grouped background, or the MCU slate on dark). */
export function SkeletonSurface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const dark = useContext(DarkContext);
  return (
    <View
      style={[styles.surface, { backgroundColor: dark ? mcuColors.surface : colors.secondaryGroupedBackground }, style]}>
      {children}
    </View>
  );
}

/** Card with a title bar and a few text lines. */
export function SkeletonCard({ lines = 3, tall = 0, style }: { lines?: number; tall?: number; style?: StyleProp<ViewStyle> }) {
  const widths: DimensionValue[] = ['85%', '60%', '72%', '50%', '66%'];
  return (
    <SkeletonSurface style={[styles.card, style]}>
      <Skeleton width="40%" height={18} />
      {tall > 0 && <Skeleton height={tall} r={radius.md} />}
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={widths[i % widths.length]} />
      ))}
    </SkeletonSurface>
  );
}

/** Row of stat tiles (label + number). */
export function SkeletonTiles({ count = 4, perRow = 2 }: { count?: number; perRow?: number }) {
  const rows = Math.ceil(count / perRow);
  return (
    <View style={styles.stack}>
      {Array.from({ length: rows }, (_, r) => (
        <View key={r} style={styles.row}>
          {Array.from({ length: Math.min(perRow, count - r * perRow) }, (_, i) => (
            <SkeletonSurface key={i} style={styles.tile}>
              <Skeleton width="45%" height={11} />
              <Skeleton width="60%" height={24} />
            </SkeletonSurface>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Grouped list section: heading + rows with a cover and two lines (books, transactions…). */
export function SkeletonListGroup({ rows = 4, cover = true }: { rows?: number; cover?: boolean }) {
  return (
    <View style={styles.stack}>
      <Skeleton width="35%" height={16} style={{ marginLeft: spacing.xs }} />
      <SkeletonSurface style={{ paddingVertical: spacing.xs }}>
        {Array.from({ length: rows }, (_, i) => (
          <View key={i} style={styles.listRow}>
            {cover && <Skeleton width={40} height={60} r={4} />}
            <View style={styles.flex}>
              <Skeleton width={i % 2 ? '55%' : '70%'} height={15} />
              <Skeleton width="35%" height={12} />
            </View>
            <Skeleton width={56} height={12} />
          </View>
        ))}
      </SkeletonSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: spacing.sm },
  stack: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  surface: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  card: { padding: spacing.lg, gap: spacing.md },
  tile: { flex: 1, padding: spacing.md, gap: spacing.sm },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
