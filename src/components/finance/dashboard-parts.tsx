import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';

import { Card } from '@/components/ui/card';
import { colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { Currencyformatter } from '@/lib/finance/utils/currency';
import { getYearMetrics, getYearStats } from '@/lib/finance/utils/metrics';
import type { MonthRow } from '@/lib/finance/utils/monthly';
import type { NetWorthEntry } from '@/lib/finance/types';

const fmt = (n: number) => Currencyformatter.format(n);
const POS = '#6ee7b7'; // emerald-300 on blue, as on the web hero
const NEG = '#fda4af'; // rose-300

function HeroStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.heroStat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.heroStatLabel}>{label.toUpperCase()}</Text>
      <Text style={[type.subheadline, tabularNums, { color: tone ?? '#fff', fontWeight: '600' }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

/** Net worth for the selected year with YoY change; year stats behind "Show details" (web HeroCard). */
/** Duration of the hero details expand/collapse; the dashboard chart eases over the same time. */
export const DETAILS_MS = 250;

export function HeroCard({ history, year }: { history: NetWorthEntry[] | undefined; year: number | null }) {
  const [open, setOpen] = useState(false);
  const { currentNetWorth, yoyChange, yoyPercentage } = getYearMetrics(history, year);
  const s = getYearStats(history, year);
  const up = yoyChange >= 0;
  const reduceMotion = useReducedMotion();

  return (
    // The card animates its height when the details open/close (in step with the chart below).
    <Animated.View style={styles.hero} layout={reduceMotion ? undefined : LinearTransition.duration(DETAILS_MS)}>
      <View style={styles.inline}>
        <SymbolView name="dollarsign.circle.fill" size={16} tintColor="#dbeafe" />
        <Text style={styles.heroLabel}>NET WORTH {year ?? ''}</Text>
      </View>
      <Text style={[styles.heroValue, tabularNums]} numberOfLines={1} adjustsFontSizeToFit selectable>
        {fmt(currentNetWorth)}
      </Text>
      <View style={styles.inline}>
        <SymbolView name={up ? 'chart.line.uptrend.xyaxis' : 'chart.line.downtrend.xyaxis'} size={14} tintColor={up ? POS : NEG} />
        <Text style={[type.subheadline, tabularNums, { color: up ? POS : NEG, fontWeight: '600' }]}>
          {fmt(yoyChange)} ({up ? '+' : '-'}
          {Math.abs(yoyPercentage).toFixed(1)}%)
        </Text>
      </View>

      <View style={styles.heroDivider} />
      <Pressable
        onPress={() => {
          haptics.selection();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={8}
        style={styles.detailsToggle}>
        <Text style={styles.heroStatLabel}>{open ? 'HIDE DETAILS' : 'SHOW DETAILS'}</Text>
        <SymbolView name={open ? 'chevron.up' : 'chevron.down'} size={12} weight="semibold" tintColor="#bfdbfe" />
      </Pressable>
      {open && (
        <Animated.View
          style={styles.heroGrid}
          entering={reduceMotion ? undefined : FadeIn.duration(DETAILS_MS)}
          exiting={reduceMotion ? undefined : FadeOut.duration(DETAILS_MS / 2)}>
          <HeroStat label="Year High" value={fmt(s.highest)} />
          <HeroStat label="Year Low" value={fmt(s.lowest)} />
          <HeroStat label="Best Month" value={s.bestMonth ? `${s.bestMonth.month.slice(0, 3)} +${fmt(s.bestMonth.change)}` : '—'} tone={POS} />
          <HeroStat label="Worst Month" value={s.worstMonth ? `${s.worstMonth.month.slice(0, 3)} ${fmt(s.worstMonth.change)}` : '—'} tone={NEG} />
          <HeroStat label="Avg Monthly Change" value={fmt(s.avgChange)} tone={s.avgChange >= 0 ? POS : NEG} />
          <HeroStat
            label="Avg Monthly %"
            value={`${s.avgChangePercent >= 0 ? '+' : '-'}${Math.abs(s.avgChangePercent).toFixed(1)}%`}
            tone={s.avgChangePercent >= 0 ? POS : NEG}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** 12-month list; months with data (and the current month) open the month sheet. */
export function MonthlyList({ rows, onOpen }: { rows: MonthRow[]; onOpen: (row: MonthRow) => void }) {
  return (
    <Card padded={false}>
      <View style={styles.listHeader}>
        <Text style={[styles.colLabel, { flex: 1 }]}>MONTH</Text>
        <Text style={[styles.colLabel, styles.right, { flex: 1.3 }]}>NET WORTH</Text>
        <Text style={[styles.colLabel, styles.right, { flex: 1.3 }]}>CHANGE</Text>
        <View style={{ width: 14 }} />
      </View>
      {rows.map((m) => {
        const tappable = m.hasData || m.isCurrentMonth;
        const up = (m.change ?? 0) >= 0;
        const tone = up ? colors.positive : colors.negative;
        return (
          <Pressable
            key={m.key}
            disabled={!tappable}
            onPress={() => onOpen(m)}
            accessibilityRole={tappable ? 'button' : undefined}
            accessibilityLabel={
              m.hasData
                ? `${m.month}${m.isCurrentMonth ? ', current month' : ''}: ${fmt(m.netWorth ?? 0)}, ${up ? 'up' : 'down'} ${fmt(Math.abs(m.change ?? 0))}`
                : `${m.month}: no data${m.isCurrentMonth ? ', tap to add' : ''}`
            }
            style={({ pressed }) => [
              styles.row,
              m.isCurrentMonth && styles.currentRow,
              pressed && { backgroundColor: colors.fill },
            ]}>
            <View style={[styles.inline, { flex: 1 }]}>
              <Text style={[type.subheadline, { color: colors.label, fontWeight: '600' }]}>{m.month.slice(0, 3)}</Text>
              {m.isCurrentMonth && <View style={styles.nowDot} />}
            </View>
            {m.hasData ? (
              <>
                <Text style={[type.subheadline, tabularNums, styles.right, { flex: 1.3, color: colors.label, fontWeight: '700' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {fmt(m.netWorth ?? 0)}
                </Text>
                <View style={{ flex: 1.3, alignItems: 'flex-end' }}>
                  <Text style={[type.footnote, tabularNums, { color: tone, fontWeight: '600' }]} numberOfLines={1} adjustsFontSizeToFit>
                    {up ? '+' : ''}
                    {fmt(m.change ?? 0)}
                  </Text>
                  <Text style={[type.caption2, tabularNums, { color: tone, opacity: 0.8 }]}>
                    ({up ? '+' : '-'}
                    {Math.abs(m.changePercent ?? 0).toFixed(1)}%)
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={[type.subheadline, styles.right, styles.dash, { flex: 1.3 }]}>—</Text>
                <Text style={[type.subheadline, styles.right, styles.dash, { flex: 1.3 }]}>
                  {m.isCurrentMonth ? 'Add' : '—'}
                </Text>
              </>
            )}
            <View style={{ width: 14, alignItems: 'flex-end' }}>
              {tappable && <SymbolView name="chevron.right" size={11} weight="semibold" tintColor={colors.tertiaryLabel} />}
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  right: { textAlign: 'right' },
  hero: {
    padding: spacing.lg,
    gap: 6,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    backgroundImage: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    boxShadow: '0 10px 24px rgba(37,99,235,0.28)',
  },
  heroLabel: { color: '#dbeafe', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  heroValue: { color: '#fff', fontSize: 38, lineHeight: 44, fontWeight: '700' },
  heroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(191,219,254,0.4)', marginTop: spacing.md },
  detailsToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  heroGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md, marginTop: spacing.sm },
  heroStat: { width: '50%', paddingRight: spacing.md, gap: 2 },
  heroStatLabel: { color: '#bfdbfe', fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  colLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: colors.secondaryLabel },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  currentRow: { backgroundColor: 'rgba(250, 204, 21, 0.16)' },
  nowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#eab308' },
  dash: { color: colors.tertiaryLabel },
});

