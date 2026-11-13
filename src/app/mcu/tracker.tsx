import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { SagaSectionView, TrackerOverview } from '@/components/mcu/tracker-parts';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { mcuColors, spacing, type } from '@/constants/theme';
import { useMcuTracker } from '@/lib/mcu/context';
import { useMcuTrackerData } from '@/lib/mcu/hooks';
import type { McuItem } from '@/lib/mcu/types';
import { useChangeStatus } from '@/lib/mcu/useChangeStatus';
import type { TrackerView } from '@/lib/mcu/utils/constants';
import { normalizeTrackerData } from '@/lib/mcu/utils/normalizeTrackerData';
import { categorySections, defaultExpanded, sagaSections } from '@/lib/mcu/utils/sections';
import { Skeleton, SkeletonCard, SkeletonSurface, SkeletonTheme, SkeletonTiles } from '@/components/ui/skeleton';
import { combineStats, nextStatus } from '@/lib/mcu/utils/stats';

const isView = (v: unknown): v is TrackerView => v === 'phases' || v === 'categories';

export default function Tracker() {
  const params = useLocalSearchParams<{ view?: string }>();
  const { view, setView } = useMcuTracker();
  const { data, isPending, isError, refetch, isRefetching } = useMcuTrackerData();

  // `?view=` deep links pick the initial view (web parity); the param then follows the toggle.
  useEffect(() => {
    if (isView(params.view) && params.view !== view) setView(params.view);
    // Only on mount, like the web.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Light status bar only while this (always-dark) screen is focused. Native tabs keep every tab
  // mounted, so a <StatusBar style="light" /> here would leak into the other tabs.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light', true);
      return () => setStatusBarStyle('auto', true);
    }, []),
  );

  const changeView = (v: TrackerView) => {
    setView(v);
    router.setParams({ view: v });
  };

  return (
    <>
      <ScreenScrollView
        grouped={false}
        style={styles.screen}
        contentContainerStyle={styles.content}
        indicatorStyle="white"
        refreshControl={<RefreshControl tintColor={mcuColors.secondaryLabel} refreshing={isRefetching} onRefresh={() => void refetch()} />}>
        {isPending ? (
          <SkeletonTheme dark>
            <View style={styles.skeleton} accessibilityLabel="Loading" accessibilityRole="progressbar">
              <Skeleton height={32} r={9} />
              <SkeletonCard lines={0} tall={8} />
              <SkeletonTiles count={3} perRow={3} />
              <Skeleton width="55%" height={22} />
              <SkeletonSurface style={styles.posterSkeleton}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} width={112} height={168} r={12} />
                ))}
              </SkeletonSurface>
            </View>
          </SkeletonTheme>
        ) : isError ? (
          <View style={styles.state}>
            <Text style={[type.subheadline, { color: '#f87171' }]}>Failed to load MCU tracker data.</Text>
            <Pressable onPress={() => refetch()} accessibilityRole="button">
              <Text style={[type.headline, { color: mcuColors.label }]}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          // Mounts once data exists, so its default expansion is computed exactly once.
          <TrackerBody data={data} view={view} onChangeView={changeView} />
        )}
      </ScreenScrollView>
    </>
  );
}

function TrackerBody({ data, view, onChangeView }: {
  data: ReturnType<typeof useMcuTrackerData>['data'];
  view: TrackerView;
  onChangeView: (v: TrackerView) => void;
}) {
  const { watched } = useMcuTracker();
  const { change } = useChangeStatus();
  const { phases, expandedCategories } = useMemo(() => normalizeTrackerData(data), [data]);

  const sagas = useMemo(() => sagaSections(phases, watched), [phases, watched]);
  const categories = useMemo(() => categorySections(expandedCategories, watched), [expandedCategories, watched]);
  const sections = view === 'phases' ? sagas : categories;
  const overall = useMemo(() => combineStats(sections.map((s) => s.stats)), [sections]);

  // Unfinished sections start open (web behavior), computed once — later status changes don't
  // re-open things you collapsed.
  const [expanded, setExpanded] = useState(() => ({ ...defaultExpanded(sagas), ...defaultExpanded(categories) }));
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const onToggleItem = (item: McuItem) => change(item.id, nextStatus(watched[item.id]));
  const onSelectItem = (item: McuItem) => router.push({ pathname: '/mcu/item/[globalId]', params: { globalId: item.id } });

  return (
    <>
      <TrackerOverview view={view} onChangeView={onChangeView} stats={overall} />
      {sections.map((section) => (
        <SagaSectionView
          key={section.key}
          section={section}
          expanded={expanded}
          onToggle={toggle}
          watched={watched}
          onToggleItem={onToggleItem}
          onSelectItem={onSelectItem}
        />
      ))}
      {sections.length === 0 && (
        <Text style={[type.subheadline, styles.empty]}>Nothing here yet.</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: mcuColors.background },
  content: { paddingBottom: spacing.xxl },
  state: { alignItems: 'center', gap: spacing.sm, paddingVertical: 64 },
  skeleton: { gap: spacing.md },
  posterSkeleton: { flexDirection: 'row', gap: 10, padding: spacing.md, overflow: 'hidden' },
  empty: { color: mcuColors.secondaryLabel, textAlign: 'center', paddingVertical: 48 },
});
