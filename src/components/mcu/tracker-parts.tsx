import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { SymbolView } from 'expo-symbols';
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { ProgressBar } from '@/components/ui/progress-bar';
import { mcuColors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { McuItem, WatchedMap, WatchStats } from '@/lib/mcu/types';
import { BREAKDOWN, VIEWS, type TrackerView } from '@/lib/mcu/utils/constants';
import type { PhaseCard, TrackerSection } from '@/lib/mcu/utils/sections';
import { percentage } from '@/lib/mcu/utils/stats';

import { PosterCard } from './poster-card';

export const MCU_BORDER = '#334155'; // slate-700

/** View switcher + overall progress + per-type breakdown (the web tracker Header). */
export function TrackerOverview({ view, onChangeView, stats }: {
  view: TrackerView;
  onChangeView: (v: TrackerView) => void;
  stats: WatchStats;
}) {
  const pct = percentage(stats.done, stats.total);
  return (
    <View style={styles.overview}>
      <SegmentedControl
        values={VIEWS.map((v) => v.label)}
        selectedIndex={VIEWS.findIndex((v) => v.key === view)}
        appearance="dark"
        onChange={(e) => {
          const next = VIEWS[e.nativeEvent.selectedSegmentIndex]?.key;
          if (next && next !== view) {
            haptics.selection();
            onChangeView(next);
          }
        }}
        accessibilityLabel="Tracker view"
      />
      <View style={styles.panel} accessible accessibilityLabel={`Overall ${pct} percent watched`}>
        <View style={styles.rowBetween}>
          <Text style={[type.footnote, styles.muted]}>Overall</Text>
          <Text style={[type.headline, tabularNums, styles.light]}>{pct}%</Text>
        </View>
        <ProgressBar value={pct / 100} tint="#ef4444" trackColor={MCU_BORDER} height={6} />
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

function PosterRow({ items, color, watched, onToggleItem, onSelectItem }: {
  items: McuItem[];
  color: string;
  watched: WatchedMap;
  onToggleItem: (item: McuItem) => void;
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
          onToggleItem={onToggleItem}
          onSelectItem={onSelectItem}
        />
      ))}
    </ScrollView>
  );
}

function PhaseCardView({ card, color, expanded, onToggle, ...row }: {
  card: PhaseCard;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  watched: WatchedMap;
  onToggleItem: (item: McuItem) => void;
  onSelectItem: (item: McuItem) => void;
}) {
  const reduceMotion = useReducedMotion();
  const summary = `${card.stats.movies} movies · ${card.stats.episodes} episodes · ${card.stats.specials} specials`;
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
export function SagaSectionView({ section, expanded, onToggle, watched, onToggleItem, onSelectItem }: {
  section: TrackerSection;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  watched: WatchedMap;
  onToggleItem: (item: McuItem) => void;
  onSelectItem: (item: McuItem) => void;
}) {
  const open = !!expanded[section.key];
  const pct = percentage(section.stats.done, section.stats.total);
  const { color } = section;
  const row = { watched, onToggleItem, onSelectItem };

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
});
