import { router, type ErrorBoundaryProps } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { accents, colors, radius, spacing, type } from '@/constants/theme';

/**
 * Route-level error UI (replaces the web's `RouteError` + `ErrorBoundary`).
 * Re-export from a layout: `export { RouteError as ErrorBoundary } from '@/components/route-error';`
 */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.container}>
      <SymbolView name="exclamationmark.triangle" size={44} tintColor={colors.warning} />
      <Text style={[type.title3, { color: colors.label }]}>Something went wrong</Text>
      <Text style={[type.subheadline, styles.message]} selectable>
        {error.message}
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={retry} style={[styles.button, { backgroundColor: accents.home }]}>
          <Text style={[type.headline, { color: colors.white }]}>Try Again</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/')} style={[styles.button, { backgroundColor: colors.fill }]}>
          <Text style={[type.headline, { color: colors.label }]}>Go Home</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
    backgroundColor: colors.background,
  },
  message: { color: colors.secondaryLabel, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
});
