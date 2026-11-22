import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { ActionSheetIOS, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PosterThumb } from '@/components/mcu/poster-card';
import { MCU_BORDER } from '@/components/mcu/tracker-parts';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ScreenScrollView } from '@/components/ui/screen-scroll-view';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accentHex, mcuColors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { haptics } from '@/lib/haptics';
import { useMcuTracker } from '@/lib/mcu/context';
import { useDeleteEpisode, useDeleteMcuItem, useMcuTrackerData } from '@/lib/mcu/hooks';
import { parseGlobalId } from '@/lib/mcu/utils/editing';
import type { Episode, McuItem, MovieItem, TvItem, WatchStatus } from '@/lib/mcu/types';
import { useChangeStatus } from '@/lib/mcu/useChangeStatus';
import { MODAL_LABELS, MODAL_TITLE, STATUS_LABELS, TYPE_META } from '@/lib/mcu/utils/constants';
import { normalizeTrackerData } from '@/lib/mcu/utils/normalizeTrackerData';
import { findItem } from '@/lib/mcu/utils/sections';
import { getStatus, nextStatus } from '@/lib/mcu/utils/stats';
import { LoadError } from '@/components/ui/load-error';
import { SkeletonCard, SkeletonTheme } from '@/components/ui/skeleton';

const STATUSES: WatchStatus[] = ['UNWATCHED', 'IN_PROGRESS', 'WATCHED'];

function Panel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelLabel}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

/** Movie / special / TV-season details (ported from McuDetailModal). */
export default function McuItemDetail() {
  const { globalId } = useLocalSearchParams<{ globalId: string }>();
  const { data, isError, error, refetch } = useMcuTrackerData();
  const found = useMemo(() => {
    const { phases, expandedCategories } = normalizeTrackerData(data);
    return findItem(phases, expandedCategories, globalId);
  }, [data, globalId]);

  if (!found) {
    return (
      <>
        <Stack.Screen options={{ title: 'Details' }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          {data ? (
            <Text style={[type.subheadline, styles.muted]}>Item not found.</Text>
          ) : isError ? (
            <LoadError what="MCU details" error={error} onRetry={() => refetch()} tint={accentHex.mcu} dark />
          ) : (
            <SkeletonTheme dark>
              <SkeletonCard lines={3} tall={160} />
            </SkeletonTheme>
          )}
        </View>
      </>
    );
  }

  const { item, color } = found;
  return (
    <>
      {/* The hero already shows title/type/year; the sheet's light glass header would mute a title on this dark sheet. */}
      <Stack.Screen options={{ title: MODAL_TITLE[item.type === 'tv' ? 'tv' : 'movie'], headerTitle: '' }} />
      <SheetCloseButton />
      <ItemMenu item={item} />
      <ScreenScrollView
        sideInsets={false}
        grouped={false}
        style={styles.screen}
        indicatorStyle="white"
        contentContainerStyle={styles.content}>
        <Hero item={item} color={color} />
        {item.type === 'tv' ? <SeasonBody item={item} color={color} /> : <MovieBody item={item} color={color} />}
      </ScreenScrollView>
    </>
  );
}

/** "⋯" menu: Edit, (seasons) Add Episode / Add Next Season, Delete. */
function ItemMenu({ item }: { item: McuItem }) {
  const remove = useDeleteMcuItem();
  const addToast = useToast();
  const isTv = item.type === 'tv';
  const label = isTv ? `${item.title} Season ${item.seasonNumber}` : item.title;
  const showId = isTv ? parseGlobalId(item.globalId)?.id : undefined;

  const confirmDelete = () => {
    const count = isTv ? item.episodes.length : 0;
    Alert.alert(
      `Delete ${label}?`,
      count > 0 ? `Its ${count} episode${count === 1 ? '' : 's'} will be deleted too. This can't be undone.` : "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            remove.mutate(item.globalId, {
              onSuccess: () => {
                haptics.success();
                addToast(`Deleted ${label}`, 'success');
                router.back();
              },
              onError: (e) => addToast(e.message || 'Failed to delete', 'error'),
            }),
        },
      ],
    );
  };

  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="More">
        <Stack.Toolbar.MenuAction
          icon="pencil"
          onPress={() => router.push({ pathname: '/mcu/edit/item', params: { globalId: item.globalId } })}>
          Edit
        </Stack.Toolbar.MenuAction>
        {isTv && showId ? (
          <Stack.Toolbar.MenuAction
            icon="plus"
            onPress={() => router.push({ pathname: '/mcu/edit/episode', params: { showId: String(showId) } })}>
            Add Episode
          </Stack.Toolbar.MenuAction>
        ) : null}
        {isTv ? (
          <Stack.Toolbar.MenuAction
            icon="plus.square.on.square"
            onPress={() => router.push({ pathname: '/mcu/edit/item', params: { nextSeasonOf: item.globalId } })}>
            Add Next Season
          </Stack.Toolbar.MenuAction>
        ) : null}
        <Stack.Toolbar.MenuAction icon="trash" destructive disabled={remove.isPending} onPress={confirmDelete}>
          Delete
        </Stack.Toolbar.MenuAction>
      </Stack.Toolbar.Menu>
    </Stack.Toolbar>
  );
}

function Hero({ item, color }: { item: McuItem; color: string }) {
  const meta = TYPE_META[item.type];
  const runtime =
    item.type === 'tv' ? item.episodes.reduce((s, e) => s + (e.runtime || 0), 0) : (item.runtime ?? 0);
  return (
    <View style={styles.hero}>
      <PosterThumb item={item} color={color} width={104} />
      <View style={styles.heroText}>
        <View style={styles.inline}>
          <SymbolView name={meta.icon} size={14} tintColor={mcuColors.secondaryLabel} />
          <Text style={[type.caption1, styles.muted]}>{meta.label}</Text>
        </View>
        <Text style={[type.title3, styles.light]} selectable>
          {item.title}
        </Text>
        <Text style={[type.subheadline, styles.muted]}>
          {item.type === 'tv' ? `${MODAL_LABELS.SEASON} ${item.seasonNumber}` : item.premiereDate || ''}
        </Text>
        {runtime > 0 && (
          <View style={styles.runtime}>
            <Text style={[type.caption1, styles.muted]}>{item.type === 'tv' ? 'Total Runtime' : 'Runtime'}</Text>
            <Text style={[type.subheadline, tabularNums, styles.light, { fontWeight: '600' }]}>{runtime} min</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Synopsis({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <Panel label="Synopsis">
      <Text style={[type.subheadline, { color: '#cbd5e1', lineHeight: 21 }]} selectable>
        {text}
      </Text>
    </Panel>
  );
}

function MovieBody({ item, color }: { item: MovieItem; color: string }) {
  const { watched } = useMcuTracker();
  const { change, isPending } = useChangeStatus();
  const current = getStatus(watched, item.id);

  return (
    <>
      <Synopsis text={item.synopsis} />
      <Panel label="Status">
        <SegmentedControl
          values={STATUSES.map((s) => STATUS_LABELS[s])}
          selectedIndex={STATUSES.indexOf(current)}
          enabled={!isPending}
          appearance="dark"
          tintColor={color}
          onChange={(e) => {
            const next = STATUSES[e.nativeEvent.selectedSegmentIndex];
            if (!next || next === current) return;
            haptics.tap();
            change(item.id, next);
          }}
          accessibilityLabel="Watch status"
        />
      </Panel>
    </>
  );
}

function EpisodeCheck({ status, color }: { status: WatchStatus; color: string }) {
  return (
    <View
      style={[
        styles.check,
        status === 'WATCHED' && { backgroundColor: color, borderColor: color },
        status === 'IN_PROGRESS' && { backgroundColor: `${color}33`, borderColor: color },
      ]}>
      {status === 'WATCHED' && <SymbolView name="checkmark" size={11} weight="heavy" tintColor="#0f172a" />}
      {status === 'IN_PROGRESS' && <View style={[styles.halfDot, { backgroundColor: color }]} />}
    </View>
  );
}

function SeasonBody({ item, color }: { item: TvItem; color: string }) {
  const { watched } = useMcuTracker();
  const { change, isPending, pendingId } = useChangeStatus();
  const removeEpisode = useDeleteEpisode();
  const addToast = useToast();
  const showId = parseGlobalId(item.globalId)?.id;

  const addEpisode = () =>
    showId && router.push({ pathname: '/mcu/edit/episode', params: { showId: String(showId) } });

  // Long press: Edit / Delete. A plain tap still cycles the watch status.
  const episodeActions = (ep: Episode) => {
    const episodeId = parseGlobalId(ep.globalId)?.id;
    if (!showId || !episodeId) return;
    haptics.tap();
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: `${ep.episodeNumber}. ${ep.title}`,
        options: ['Edit Episode', 'Delete Episode', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      (index) => {
        if (index === 0) {
          router.push({ pathname: '/mcu/edit/episode', params: { showId: String(showId), episodeId: String(episodeId) } });
        } else if (index === 1) {
          Alert.alert(`Delete episode ${ep.episodeNumber}?`, `"${ep.title}" will be removed. This can't be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () =>
                removeEpisode.mutate(episodeId, {
                  onSuccess: () => addToast(`Deleted episode ${ep.episodeNumber}`, 'success'),
                  onError: (e) => addToast(e.message || 'Failed to delete episode', 'error'),
                }),
            },
          ]);
        }
      },
    );
  };
  const watchedCount = item.episodes.filter((e) => getStatus(watched, e.globalId) === 'WATCHED').length;

  const cycle = (ep: Episode) => {
    haptics.tap();
    change(ep.globalId, nextStatus(getStatus(watched, ep.globalId)), { episode: true });
  };

  return (
    <>
      {item.episodes.length > 0 && (
        <Panel label="Progress">
          <View style={styles.rowBetween}>
            <Text style={[type.footnote, tabularNums, { color: '#cbd5e1' }]}>
              {watchedCount}/{item.episodes.length} watched
            </Text>
          </View>
          <ProgressBar value={watchedCount / item.episodes.length} tint={color} trackColor={MCU_BORDER} height={8} />
        </Panel>
      )}
      <Synopsis text={item.synopsis} />
      <Panel label="Episodes">
        <View style={styles.episodes}>
          {item.episodes.length === 0 && (
            <Text style={[type.subheadline, styles.muted, { paddingVertical: 6 }]}>No episodes yet.</Text>
          )}
          {item.episodes.map((ep, i) => {
            const status = getStatus(watched, ep.globalId);
            const busy = isPending && pendingId === ep.globalId;
            return (
              <Pressable
                key={ep.globalId ?? i}
                onPress={() => cycle(ep)}
                onLongPress={() => episodeActions(ep)}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel={`Episode ${ep.episodeNumber ?? i + 1}, ${ep.title}, ${STATUS_LABELS[status]}`}
                accessibilityHint="Cycles unwatched, in progress, watched. Long press to edit or delete."
                accessibilityActions={[{ name: 'longpress', label: 'Edit or delete' }]}
                onAccessibilityAction={(e) => e.nativeEvent.actionName === 'longpress' && episodeActions(ep)}
                style={({ pressed }) => [styles.episode, pressed && styles.episodePressed, busy && { opacity: 0.5 }]}>
                <EpisodeCheck status={status} color={color} />
                <Text style={[type.caption1, tabularNums, styles.epNum]}>{ep.episodeNumber ?? i + 1}</Text>
                <Text
                  style={[type.subheadline, { flex: 1, color: status === 'WATCHED' ? mcuColors.secondaryLabel : mcuColors.label }]}
                  numberOfLines={2}>
                  {ep.title}
                </Text>
                {ep.runtime ? <Text style={[type.caption1, tabularNums, styles.muted]}>{ep.runtime} min</Text> : null}
              </Pressable>
            );
          })}
          <Pressable
            onPress={addEpisode}
            accessibilityRole="button"
            accessibilityLabel="Add episode"
            style={({ pressed }) => [styles.episode, pressed && styles.episodePressed]}>
            <SymbolView name="plus.circle.fill" size={22} tintColor={color} />
            <Text style={[type.subheadline, { color, fontWeight: '600' }]}>Add Episode</Text>
          </Pressable>
        </View>
        </Panel>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: mcuColors.surface },
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  light: { color: mcuColors.label },
  muted: { color: mcuColors.secondaryLabel },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  hero: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  heroText: { flex: 1, minWidth: 0, gap: 3 },
  runtime: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  panel: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MCU_BORDER,
  },
  panelLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: mcuColors.secondaryLabel },
  episodes: { gap: 2 },
  episode: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 9, paddingHorizontal: 4, borderRadius: radius.sm },
  episodePressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  epNum: { width: 18, color: mcuColors.secondaryLabel, textAlign: 'right' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halfDot: { width: 8, height: 8, borderRadius: 4 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: mcuColors.surface },
});
