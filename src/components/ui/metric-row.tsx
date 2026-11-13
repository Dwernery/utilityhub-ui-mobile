import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Fragment } from 'react';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';

import { colors, tabularNums, type } from '@/constants/theme';

export interface Metric {
  value: string | number;
  label: string;
  icon?: SFSymbol;
  tint?: ColorValue;
}

/** Evenly spaced metrics with hairline dividers (the web's `grid-cols-3 divide-x`). */
export function MetricRow({ metrics }: { metrics: Metric[] }) {
  return (
    <View style={styles.metricRow}>
      {metrics.map((m, i) => (
        <Fragment key={m.label}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.metric} accessible accessibilityLabel={`${m.label}: ${m.value}`}>
            <View style={styles.metricValueRow}>
              {m.icon && <SymbolView name={m.icon} size={12} tintColor={colors.tertiaryLabel} />}
              <Text
                style={[type.headline, tabularNums, { color: m.tint ?? colors.label }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}>
                {m.value}
              </Text>
            </View>
            <Text style={[type.caption2, styles.metricLabel]} numberOfLines={1}>
              {m.label}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  metricRow: { flexDirection: 'row', alignItems: 'stretch' },
  metric: { flex: 1, alignItems: 'center', gap: 1, paddingHorizontal: 4 },
  metricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { color: colors.secondaryLabel },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
});
