import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Card, CardHeader } from '@/components/ui/card';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useMcuTracker } from '@/lib/mcu/context';
import { useMcuTrackerData } from '@/lib/mcu/hooks';
import type { WatchStats } from '@/lib/mcu/types';
import { BREAKDOWN } from '@/lib/mcu/utils/constants';
import { getInProgress } from '@/lib/mcu/utils/inProgress';
import { normalizeTrackerData } from '@/lib/mcu/utils/normalizeTrackerData';
import { combineStats, computeStats } from '@/lib/mcu/utils/stats';

import { CardDivider, CardError, CardSkeleton, EmptyLine, MetricRow, ProgressItemRow, SectionLabel } from './parts';

const breakdownMetrics = (stats: WatchStats) =>
  BREAKDOWN.map(({ key, doneKey, label, icon }) => ({ value: `${stats[doneKey]}/${stats[key]}`, label, icon }));

export function McuHomeCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { watched } = useMcuTracker();
  const { data, isPending, isError, error, refetch } = useMcuTrackerData();

  const { phases, expandedCategories } = useMemo(() => normalizeTrackerData(data), [data]);
  const mcuStats = useMemo(() => combineStats(phases.map((p) => computeStats(p.items, watched))), [phases, watched]);
  const expandedStats = useMemo(
    () => combineStats(expandedCategories.map((c) => computeStats(c.items, watched))),
    [expandedCategories, watched],
  );
  const inProgress = useMemo(() => getInProgress(data), [data]);

  return (
    <Card style={style}>
      <CardHeader title="MCU" icon="film.stack" tint={accents.mcu as string} />
      {isPending ? (
        <CardSkeleton />
      ) : isError ? (
        <CardError what="MCU data" error={error} onRetry={refetch} />
      ) : (
        <View style={styles.body}>
          <SectionLabel icon="sparkles">MCU Phases</SectionLabel>
          <MetricRow metrics={breakdownMetrics(mcuStats)} />
          <CardDivider />
          <SectionLabel icon="sparkles">Expanded Universe</SectionLabel>
          <MetricRow metrics={breakdownMetrics(expandedStats)} />
          <CardDivider />
          <SectionLabel icon="play.tv">Currently Watching</SectionLabel>
          {inProgress.length > 0 ? (
            <View style={styles.list}>
              {inProgress.slice(0, 4).map((item) => (
                <ProgressItemRow
                  key={item.key}
                  title={item.title}
                  coverUrl={item.s3Url}
                  // The API has no partial-progress value; the web shows a fixed half bar.
                  progress={0.5}
                  meta={item.subtitle}
                  tint={accents.mcu}
                />
              ))}
              {inProgress.length > 4 && (
                <Text style={[type.caption1, { color: colors.secondaryLabel }]}>
                  +{inProgress.length - 4} more in progress
                </Text>
              )}
            </View>
          ) : (
            <EmptyLine>Nothing in progress right now.</EmptyLine>
          )}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: spacing.lg },
  list: { gap: spacing.md },
});
