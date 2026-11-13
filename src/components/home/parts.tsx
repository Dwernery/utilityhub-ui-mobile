import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import { BookCover } from '@/components/library/book-cover';
import { ProgressBar } from '@/components/ui/progress-bar';
import { colors, radius, spacing, tabularNums, type } from '@/constants/theme';

/** Small uppercase-ish section label with an icon: "All-Time", "MCU Phases", "Currently reading"… */
export function SectionLabel({ icon, children }: { icon: SFSymbol; children: ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      <SymbolView name={icon} size={12} tintColor={colors.secondaryLabel} weight="semibold" />
      <Text style={[type.footnote, styles.sectionLabelText]}>{children}</Text>
    </View>
  );
}

export { MetricRow, type Metric } from '@/components/ui/metric-row';

/** Hairline between sections inside a card. */
export function CardDivider() {
  return <View style={styles.cardDivider} />;
}

/** Cover + title + progress bar + meta line ("currently reading / watching"). */
export function ProgressItemRow({
  title,
  coverUrl,
  trailing,
  progress,
  meta,
  metaTrailing,
  tint,
}: {
  title: string;
  coverUrl?: string | null;
  trailing?: string;
  /** 0–1 */
  progress: number;
  meta?: string;
  metaTrailing?: string;
  tint: ColorValue;
}) {
  return (
    <View style={styles.itemRow} accessible accessibilityLabel={[title, meta, trailing, metaTrailing].filter(Boolean).join(', ')}>
      <BookCover book={{ s3Url: coverUrl, title }} width={36} />
      <View style={styles.itemBody}>
        <View style={styles.itemLine}>
          <Text style={[type.subheadline, styles.itemTitle]} numberOfLines={1}>
            {title}
          </Text>
          {trailing ? <Text style={[type.caption1, tabularNums, styles.muted]}>{trailing}</Text> : null}
        </View>
        <ProgressBar value={progress} tint={tint} height={5} />
        {(meta || metaTrailing) && (
          <View style={styles.itemLine}>
            <Text style={[type.caption1, styles.muted, styles.flex]} numberOfLines={1}>
              {meta}
            </Text>
            {metaTrailing ? (
              <Text style={[type.caption1, tabularNums, styles.muted, { fontWeight: '600' }]}>{metaTrailing}</Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <Text style={[type.subheadline, styles.muted]}>{children}</Text>;
}

/** Placeholder blocks while a card's data loads (the web's `animate-pulse` bars). */
export function CardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <View style={styles.skeleton} accessibilityLabel="Loading" accessibilityRole="progressbar">
      <View style={[styles.skeletonBlock, { height: tall ? 120 : 44 }]} />
      <View style={[styles.skeletonBlock, { width: '75%' }]} />
      <View style={[styles.skeletonBlock, { width: '50%' }]} />
    </View>
  );
}

export function CardError({ what, error, onRetry }: { what: string; error: Error | null; onRetry: () => void }) {
  return (
    <View style={styles.error}>
      <Text style={[type.subheadline, { color: colors.negative }]}>
        Failed to load {what}
        {error?.message ? `: ${error.message}` : '.'}
      </Text>
      <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
        <Text style={[type.subheadline, { color: colors.label, fontWeight: '600' }]}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.sm },
  sectionLabelText: { color: colors.secondaryLabel, fontWeight: '600' },
  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginVertical: spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemBody: { flex: 1, minWidth: 0, gap: 5 },
  itemLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  itemTitle: { flex: 1, color: colors.label, fontWeight: '500' },
  muted: { color: colors.secondaryLabel },
  flex: { flex: 1 },
  skeleton: { gap: spacing.sm, marginTop: spacing.md },
  skeletonBlock: { height: 14, borderRadius: radius.sm, backgroundColor: colors.tertiaryFill },
  error: { marginTop: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
});
