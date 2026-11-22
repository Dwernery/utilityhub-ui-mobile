import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { SymbolView } from 'expo-symbols';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { ProgressBar } from '@/components/ui/progress-bar';
import { mcuColors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { McuItem, WatchedMap, WatchStats, WatchStatus } from '@/lib/mcu/types';
import { BREAKDOWN, VIEWS, type TrackerView } from '@/lib/mcu/utils/constants';
import type { PhaseCard, SearchResult, TrackerSection } from '@/lib/mcu/utils/sections';
import { formatMinutes, percentage, typeSummary } from '@/lib/mcu/utils/stats';

import { PosterCard } from './poster-card';

export const MCU_BORDER = '#334155'; // slate-700

/**
 * View switcher + overall progress + per-type breakdown (the web tracker Header).
 * `viewSwitchDisabled` while searching: results cover both views, so the switch is turned off.
 */
export function TrackerOverview({ view, onChangeView, stats, viewSwitchDisabled = false }: {
  view: TrackerView;
  onChangeView: (v: TrackerView) => void;
  stats: WatchStats;
  viewSwitchDisabled?: boolean;
}) {
  // Weighted by runtime, so a 3-hour movie moves the bar more than a 30-minute episode.
  const pct = percentage(stats.minutesDone, stats.minutes);
  const left = stats.minutes - stats.minutesDone;
  return (
    <View style={styles.overview}>
      <SegmentedControl
        values={VIEWS.map((v) => v.label)}
        selectedIndex={VIEWS.findIndex((v) => v.key === view)}
        appearance="dark"
        enabled={!viewSwitchDisabled}
        onChange={(e) => {
          const next = VIEWS[e.nativeEvent.selectedSegmentIndex]?.key;
          if (next && next !== view) {
            haptics.selection();
            onChangeView(next);
          }
        }}
        accessibilityLabel="Tracker view"
      />
      <View
        style={styles.panel}
        accessible
        accessibilityLabel={`Overall ${pct} percent watched, ${formatMinutes(stats.minutesDone)} of ${formatMinutes(stats.minutes)}`}>
        <View style={styles.rowBetween}>
          <Text style={[type.footnote, styles.muted]}>Overall</Text>
          <Text style={[type.headline, tabularNums, styles.light]}>{pct}%</Text>
        </View>
        <ProgressBar value={pct / 100} tint="#ef4444" trackColor={MCU_BORDER} height={6} />
        <View style={styles.rowBetween}>
          <Text style={[type.caption1, tabularNums, styles.muted]}>
            {formatMinutes(stats.minutesDone)} of {formatMinutes(stats.minutes)}
          </Text>
          <Text style={[type.caption1, tabularNums, styles.muted]}>{left > 0 ? `${formatMinutes(left)} to go` : 'All caught up'}</Text>
        </View>
      </View>
      <View style={styles.breakdown}>
        {BREAKDOWN.map(({ key, doneKey, label, icon }) => (
          <View
            key={key}
            style={[styles.panel, styles.breakdownTile]}
            accessible
            accessibilityLabel={`${label}: ${stats[doneKey]} of ${stats[key]}`}>
            <SymbolView name={icon} size={15} tintColor={mcuColors.secondaryLabel} />
            <View style={styles.flex}>
              <Text style={[type.caption1, styles.muted]} numberOfLines={1}>
                {label}
              </Text>
              <Text style={[type.subheadline, tabularNums, styles.light, { fontWeight: '700' }]}>
                {stats[key] > 0 ? `${stats[doneKey]}/${stats[key]}` : '—'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PosterRow({ items, color, watched, onChangeStatus, onSelectItem }: {
  items: McuItem[];
  color: string;
  watched: WatchedMap;
  onChangeStatus: (item: McuItem, status: WatchStatus) => void;
  onSelectItem: (item: McuItem) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.posterRow}
      decelerationRate="fast"
      snapToInterval={112 + 10}
      snapToAlignment="start">
      {items.map((item) => (
        <PosterCard
          key={item.id}
          item={item}
          color={color}
          watched={watched}
          onChangeStatus={onChangeStatus}
          onSelectItem={onSelectItem}
        />
      ))}
    </ScrollView>
  );
}

/** Search results: posters in a wrapping grid, each keeping its phase/category color. */
export function PosterGrid({ results, watched, onChangeStatus, onSelectItem }: {
  results: SearchResult[];
  watched: WatchedMap;
  onChangeStatus: (item: McuItem, status: WatchStatus) => void;
  onSelectItem: (item: McuItem) => void;
}) {
  return (
    <View style={styles.grid}>
      {results.map(({ item, color }) => (
        <PosterCard
          key={item.globalId}
          item={item}
          color={color}
          watched={watched}
          onChangeStatus={onChangeStatus}
          onSelectItem={onSelectItem}
          showTitle
        />
      ))}
    </View>
  );
}

function PhaseCardView({ card, color, expanded, onToggle, ...row }: {
  card: PhaseCard;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  watched: WatchedMap;
  onChangeStatus: (item: McuItem, status: WatchStatus) => void;
  onSelectItem: (item: McuItem) => void;
}) {
  const reduceMotion = useReducedMotion();
  const summary = typeSummary(card.stats);
  return (
    <View style={styles.phaseCard}>
      <Pressable
        onPress={() => {
          haptics.selection();
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${card.label}, ${summary}`}
        style={({ pressed }) => [styles.phaseHeader, pressed && { opacity: 0.7 }]}>
        <SymbolView name={expanded ? 'chevron.down' : 'chevron.right'} size={13} weight="bold" tintColor={color} />
        <Text style={[styles.phaseLabel, { color }]}>{card.label}</Text>
        <Text style={[type.caption1, styles.muted, styles.flexRight]} numberOfLines={1}>
          {summary}
        </Text>
      </Pressable>
      {expanded && (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(160)} style={styles.phaseBody}>
          <PosterRow items={card.items} color={color} {...row} />
        </Animated.View>
      )}
    </View>
  );
}

/** A saga (or Expanded Universe category): glowing title, progress, then phase cards or posters. */
export function SagaSectionView({ section, expanded, onToggle, watched, onChangeStatus, onSelectItem }: {
  section: TrackerSection;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  watched: WatchedMap;
  onChangeStatus: (item: McuItem, status: WatchStatus) => void;
  onSelectItem: (item: McuItem) => void;
}) {
  const open = !!expanded[section.key];
  const pct = percentage(section.stats.minutesDone, section.stats.minutes);
  const { color } = section;
  const row = { watched, onChangeStatus, onSelectItem };

  return (
    <View style={styles.section}>
      <Pressable
        onPress={() => {
          haptics.selection();
          onToggle(section.key);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${section.title}, ${pct} percent watched`}
        style={({ pressed }) => [styles.sagaHeader, { borderBottomColor: color }, pressed && { opacity: 0.75 }]}>
        <SymbolView name={open ? 'chevron.down' : 'chevron.right'} size={15} weight="bold" tintColor={color} />
        <View style={styles.flex}>
          <Text style={[styles.sagaTitle, { color }]} numberOfLines={2}>
            {section.title}
          </Text>
          <Text style={[type.caption1, styles.muted]} numberOfLines={2}>
            {section.subtitle}
          </Text>
        </View>
        <ProgressBar value={pct / 100} tint={color} trackColor={MCU_BORDER} height={5} style={styles.sagaBar} />
        <Text style={[styles.sagaPct, { color }]}>{pct}%</Text>
      </Pressable>

      {open &&
        (section.isCategory ? (
          <View style={[styles.phaseCard, styles.phaseBody]}>
            <PosterRow items={section.cards[0]?.items ?? []} color={color} {...row} />
          </View>
        ) : (
          section.cards.map((card) => (
            <PhaseCardView
              key={card.key}
              card={card}
              color={color}
              expanded={!!expanded[card.key]}
              onToggle={() => onToggle(card.key)}
              {...row}
            />
          ))
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  flexRight: { flex: 1, textAlign: 'right' },
  light: { color: mcuColors.label },
  muted: { color: mcuColors.secondaryLabel },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overview: { gap: spacing.sm, marginBottom: spacing.xl },
  panel: {
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MCU_BORDER,
    backgroundColor: mcuColors.surface,
  },
  breakdown: { flexDirection: 'row', gap: spacing.sm },
  breakdownTile: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { marginBottom: spacing.xl, gap: spacing.sm },
  sagaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.xs,
    borderBottomWidth: 4,
  },
  sagaTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  sagaBar: { width: 64 },
  sagaPct: { fontSize: 18, fontWeight: '800', minWidth: 44, textAlign: 'right', fontVariant: ['tabular-nums'] },
  phaseCard: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MCU_BORDER,
    backgroundColor: mcuColors.surface,
    overflow: 'hidden',
  },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 11 },
  phaseLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.8 },
  phaseBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: MCU_BORDER, paddingVertical: spacing.md },
  posterRow: { gap: 10, paddingHorizontal: spacing.md, paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 4 },
});
