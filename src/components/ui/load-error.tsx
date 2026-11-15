import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import { accents, colors, mcuColors, spacing, type } from '@/constants/theme';

interface LoadErrorProps {
  /** What failed to load, in lowercase: "books", "MCU details". */
  what: string;
  error?: Error | null;
  onRetry: () => void;
  /** The section's accent for the retry button. */
  tint?: ColorValue;
  /** For the always-dark MCU screens. */
  dark?: boolean;
}

/**
 * The "couldn't load" state: what failed, why, and a way to retry.
 * Show it only when there is no data at all; if a background refresh fails,
 * keep showing the data you already have.
 */
export function LoadError({ what, error, onRetry, tint = accents.home, dark = false }: LoadErrorProps) {
  const primary = dark ? mcuColors.label : colors.label;
  const secondary = dark ? mcuColors.secondaryLabel : colors.secondaryLabel;

  return (
    <View style={styles.container} accessibilityRole="alert">
      <SymbolView name="wifi.exclamationmark" size={32} tintColor={secondary} />
      <Text style={[type.headline, styles.center, { color: primary }]}>Couldn’t load {what}</Text>
      {error?.message ? (
        <Text style={[type.footnote, styles.center, { color: secondary }]} selectable>
          {error.message}
        </Text>
      ) : null}
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={`Try loading ${what} again`}
        hitSlop={8}
        style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
        <Text style={[type.headline, { color: tint }]}>Try Again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  center: { textAlign: 'center' },
  retry: { marginTop: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  pressed: { opacity: 0.6 },
});
