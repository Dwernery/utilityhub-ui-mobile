import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  /** `grouped` = Settings-style surface on grouped background; `glass` = liquid glass over content. */
  variant?: 'grouped' | 'glass';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** Base surface. Replaces the web's `bg-white rounded-xl border shadow-sm` boxes (UtilityCard, SectionCard…). */
export function Card({ children, variant = 'grouped', onPress, accessibilityLabel, style, padded = true }: CardProps) {
  const surface = [styles.card, padded && styles.padded, style];

  const body =
    variant === 'glass' && isLiquidGlassAvailable() ? (
      <GlassView style={surface} isInteractive={!!onPress}>
        {children}
      </GlassView>
    ) : (
      <View style={[surface, styles.grouped]}>{children}</View>
    );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

interface CardHeaderProps {
  title: string;
  icon?: SFSymbol;
  tint?: string;
  /** Right-aligned accessory (badge, value, chevron is added automatically when `chevron`). */
  accessory?: ReactNode;
  chevron?: boolean;
}

/** Icon tile + title row used at the top of Home cards (replaces UtilityCard's header). */
export function CardHeader({ title, icon, tint = colors.label as string, accessory, chevron }: CardHeaderProps) {
  return (
    <View style={styles.header}>
      {icon && (
        <View style={[styles.iconTile, { backgroundColor: colors.tertiaryFill }]}>
          <SymbolView name={icon} size={18} tintColor={tint} weight="semibold" />
        </View>
      )}
      <Text style={[type.headline, styles.headerTitle]} numberOfLines={1}>
        {title}
      </Text>
      {accessory}
      {chevron && <SymbolView name="chevron.right" size={13} tintColor={colors.tertiaryLabel} weight="semibold" />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  grouped: {
    backgroundColor: colors.secondaryGroupedBackground,
  },
  padded: {
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: colors.label,
  },
});
