import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';

import { BookCover } from '@/components/library/book-cover';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { accents, colors, radius, spacing, tabularNums, type } from '@/constants/theme';

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
  cover,
}: {
  title: string;
  coverUrl?: string | null;
  /** Replaces the book cover (e.g. a course's 16:9 cover). */
  cover?: ReactNode;
  trailing?: string;
  /** 0–1 */
  progress: number;
  meta?: string;
  metaTrailing?: string;
  tint: ColorValue;
}) {
  return (
    <View style={styles.itemRow} accessible accessibilityLabel={[title, meta, trailing, metaTrailing].filter(Boolean).join(', ')}>
      {cover ?? <BookCover book={{ s3Url: coverUrl ?? null, title }} width={36} />}
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
      <Skeleton height={tall ? 120 : 44} r={radius.sm} />
      <Skeleton width="75%" />
      <Skeleton width="50%" />
    </View>
  );
}

export function CardError({ what, error, onRetry }: { what: string; error: Error | null; onRetry: () => void }) {
  return (
    <View style={styles.error}>
      <Text style={[type.subheadline, { color: colors.label, fontWeight: '600' }]}>Couldn’t load {what}</Text>
      {error?.message ? (
        <Text style={[type.caption1, styles.muted]} selectable>
          {error.message}
        </Text>
      ) : null}
      <Pressable
        onPress={onRetry}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Try loading ${what} again`}>
        <Text style={[type.subheadline, { color: accents.home, fontWeight: '600' }]}>Retry</Text>
      </Pressable>
    </View>
  );
}

/**
 * A failed background refresh: the card keeps the data it has and says so.
 * Mirrors the web's RefreshNotice in domains/home/components/UtilityCard.jsx.
 */
export function RefreshNotice({
  message = 'Couldn’t refresh. Showing earlier data.',
  onRetry,
  retrying = false,
}: {
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <View style={styles.notice} accessibilityRole="alert">
      <SymbolView name="wifi.exclamationmark" size={13} tintColor={colors.warning} weight="semibold" />
      <Text style={[type.footnote, styles.noticeText]}>{message}</Text>
      <Pressable
        onPress={onRetry}
        disabled={retrying}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        style={({ pressed }) => (pressed || retrying) && styles.dim}>
        <Text style={[type.footnote, { color: accents.home, fontWeight: '600' }]}>{retrying ? 'Retrying…' : 'Retry'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    backgroundColor: colors.noticeBackground,
  },
  noticeText: { flex: 1, color: colors.label },
  dim: { opacity: 0.5 },
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
  error: { marginTop: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
});
