import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { ScreenScrollView } from '@/components/ui/screen-scroll-view';

import { colors, spacing, type } from '@/constants/theme';

/** Temporary body for routes that haven't been migrated yet (tracked in migration-progress.md). */
export function PlaceholderScreen({
  title,
  phase,
  icon = 'hammer',
  dark = false,
}: {
  title: string;
  phase: number;
  icon?: SFSymbol;
  dark?: boolean;
}) {
  const fg = dark ? '#f8fafc' : colors.label;
  const fg2 = dark ? '#94a3b8' : colors.secondaryLabel;

  return (
    <ScreenScrollView grouped={false} contentContainerStyle={styles.content}>
      <View style={styles.center}>
        <SymbolView name={icon} size={44} tintColor={fg2} />
        <Text style={[type.title3, { color: fg }]}>{title}</Text>
        <Text style={[type.subheadline, { color: fg2 }]}>Migrating in Phase {phase}</Text>
      </View>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingVertical: spacing.lg },
  center: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
