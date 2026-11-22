import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { PosterGrid, SagaSectionView, TrackerOverview } from '@/components/mcu/tracker-parts';
import { LoadError } from '@/components/ui/load-error';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { accentHex, accents, mcuColors, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useMcuTracker } from '@/lib/mcu/context';
import { useMcuTrackerData } from '@/lib/mcu/hooks';
import type { McuItem, WatchStatus } from '@/lib/mcu/types';
import { useChangeStatus } from '@/lib/mcu/useChangeStatus';
import type { TrackerView } from '@/lib/mcu/utils/constants';
import type { DraftKind } from '@/lib/mcu/utils/editing';
import { categorySections, defaultExpanded, sagaSections, searchItems, unfinishedOnly } from '@/lib/mcu/utils/sections';
import { Skeleton, SkeletonCard, SkeletonSurface, SkeletonTheme, SkeletonTiles } from '@/components/ui/skeleton';
import { combineStats } from '@/lib/mcu/utils/stats';

const isView = (v: unknown): v is TrackerView => v === 'phases' || v === 'categories';

type Filter = 'all' | 'unfinished';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All Titles' },
  { value: 'unfinished', label: 'Not Finished' },
];

export default function Tracker() {
  const params = useLocalSearchParams<{ view?: string }>();
  const { view, setView } = useMcuTracker();
  const { isPending, isError, error, refetch, isRefetching } = useMcuTrackerData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

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

  const add = (kind: DraftKind) => router.push({ pathname: '/mcu/edit/item', params: { kind } });

  return (
    <>
      <Stack.SearchBar
        placeholder="Search titles and episodes"
        onChangeText={(e) => setSearch(e.nativeEvent.text)}
        onCancelButtonPress={() => setSearch('')}
        hideWhenScrolling={false}
        textColor={mcuColors.label}
        tintColor={accents.mcu}
      />
      <Stack.Toolbar placement="right">
        {/* Off while searching: results always include every match, like the view switch. */}
        <Stack.Toolbar.Menu
          disabled={search.trim() !== ''}
          icon={filter === 'all' ? 'line.3.horizontal.decrease.circle' : 'line.3.horizontal.decrease.circle.fill'}
          accessibilityLabel={`Filter, ${FILTERS.find((f) => f.value === filter)!.label}`}>
          <Stack.Toolbar.Menu inline title="Show">
            {FILTERS.map((f) => (
              <Stack.Toolbar.MenuAction
                key={f.value}
                isOn={filter === f.value}
                onPress={() => {
                  haptics.selection();
                  setFilter(f.value);
                }}>
                {f.label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Menu icon="plus" accessibilityLabel="Add">
          <Stack.Toolbar.MenuAction icon="film" onPress={() => add('movie')}>
            Movie
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="sparkles" onPress={() => add('special')}>
            Special
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="tv" onPress={() => add('show')}>
            Show Season
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
      <ScreenScrollView
        grouped={false}
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
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
          <LoadError what="the MCU tracker" error={error} onRetry={() => refetch()} tint={accentHex.mcu} dark />
        ) : (
          // Mounts once data exists, so its default expansion is computed exactly once.
          <TrackerBody view={view} onChangeView={changeView} search={search} filter={filter} />
        )}
      </ScreenScrollView>
    </>
  );
}

function TrackerBody({ view, onChangeView, search, filter }: {
  view: TrackerView;
  onChangeView: (v: TrackerView) => void;
  search: string;
  filter: Filter;
}) {
  const { watched, phases, expandedCategories } = useMcuTracker();
  const { change } = useChangeStatus();

  const sagas = useMemo(() => sagaSections(phases, watched), [phases, watched]);
  const categories = useMemo(() => categorySections(expandedCategories, watched), [expandedCategories, watched]);
  const sections = view === 'phases' ? sagas : categories;
  const overall = useMemo(() => combineStats(sections.map((s) => s.stats)), [sections]);

  // Unfinished sections start open (web behavior), computed once — later status changes don't
  // re-open things you collapsed.
  const [expanded, setExpanded] = useState(() => ({ ...defaultExpanded(sagas), ...defaultExpanded(categories) }));
  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const onChangeStatus = (item: McuItem, status: WatchStatus) => change(item.id, status);
  const onSelectItem = (item: McuItem) => router.push({ pathname: '/mcu/item/[globalId]', params: { globalId: item.globalId } });

  // Search spans both views, so a show isn't "missing" because it's in the other one.
  const results = useMemo(
    () => searchItems(phases, expandedCategories, search),
    [phases, expandedCategories, search],
  );
  const shown = useMemo(
    () => (filter === 'unfinished' ? unfinishedOnly(sections, watched) : sections),
    [filter, sections, watched],
  );

  if (search.trim()) {
    return (
      <>
        <TrackerOverview view={view} onChangeView={onChangeView} stats={overall} viewSwitchDisabled />
        <Text style={[type.footnote, tabularNums, styles.count]}>
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
        {results.length > 0 ? (
          <PosterGrid results={results} watched={watched} onChangeStatus={onChangeStatus} onSelectItem={onSelectItem} />
        ) : (
          <Text style={[type.subheadline, styles.empty]}>No titles match “{search.trim()}”.</Text>
        )}
      </>
    );
  }

  return (
    <>
      <TrackerOverview view={view} onChangeView={onChangeView} stats={overall} />
      {shown.map((section) => (
        <SagaSectionView
          key={section.key}
          section={section}
          expanded={expanded}
          onToggle={toggle}
          watched={watched}
          onChangeStatus={onChangeStatus}
          onSelectItem={onSelectItem}
        />
      ))}
      {shown.length === 0 && (
        <Text style={[type.subheadline, styles.empty]}>
          {sections.length > 0 && filter === 'unfinished' ? 'All caught up. Everything here is watched.' : 'Nothing here yet.'}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: mcuColors.background },
  content: { paddingBottom: spacing.xxl },
  skeleton: { gap: spacing.md },
  posterSkeleton: { flexDirection: 'row', gap: 10, padding: spacing.md, overflow: 'hidden' },
  count: { color: mcuColors.secondaryLabel, marginBottom: spacing.sm },
  empty: { color: mcuColors.secondaryLabel, textAlign: 'center', paddingVertical: 48 },
});
