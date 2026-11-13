import { SymbolView, type SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, tabularNums, type } from '@/constants/theme';

interface StatTileProps {
  label: string;
  value: string | number;
  /** Secondary line, e.g. "+12.4% vs 2024" */
  caption?: string;
  /** Colors the caption (e.g. green for gains, red for losses). */
  captionTint?: ColorValue;
  icon?: SFSymbol;
  tint?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

/** Single metric: small label, large number, optional caption. Used in Home, Library metrics, Finances hero. */
export function StatTile({ label, value, caption, captionTint, icon, tint = colors.secondaryLabel, style }: StatTileProps) {
  return (
    <View
      style={[styles.tile, style]}
      accessible
      accessibilityLabel={`${label}: ${value}${caption ? `, ${caption}` : ''}`}>
      <View style={styles.labelRow}>
        {icon && <SymbolView name={icon} size={13} tintColor={tint} weight="semibold" />}
        <Text style={[type.footnote, styles.label]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[type.title2, tabularNums, styles.value]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {caption ? (
        <Text style={[type.caption1, tabularNums, { color: captionTint ?? colors.secondaryLabel }]} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.tertiaryFill,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { color: colors.secondaryLabel, flexShrink: 1 },
  value: { color: colors.label },
});
