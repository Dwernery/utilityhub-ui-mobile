import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormSection, FormTextField } from '@/components/ui/form';
import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { haptics } from '@/lib/haptics';
import { useDeleteEpisode, useMcuTrackerData, useSaveEpisode } from '@/lib/mcu/hooks';
import type { ApiEpisode } from '@/lib/mcu/types';
import { episodeToRequest, findRaw, nextEpisodeNumber } from '@/lib/mcu/utils/editing';
import { parseIdParam } from '@/lib/routeParams';

/**
 * Add an episode to a season (`?showId=3`) or edit/delete one (`?showId=3&episodeId=40`).
 * Episodes are added one at a time.
 */
export default function EpisodeSheet() {
  const params = useLocalSearchParams<{ showId: string; episodeId?: string }>();
  const showId = parseIdParam(params.showId);
  const episodeId = parseIdParam(params.episodeId);
  const { data } = useMcuTrackerData();
  const raw = showId ? findRaw(data, `show:${showId}`) : null;
  const season = raw?.kind === 'show' ? raw : null;
  const episode = episodeId ? season?.episodes.find((e) => e.id === episodeId) : undefined;

  if (!season || !showId || (episodeId && !episode)) {
    return (
      <>
        <Stack.Screen options={{ title: 'Episode', headerTitleStyle: { color: colors.label as string } }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>
            {data ? 'This episode no longer exists.' : 'Loading…'}
          </Text>
        </View>
      </>
    );
  }

  return (
    <EpisodeForm
      key={episode?.id ?? 'new'}
      showId={showId}
      subtitle={`${season.show.title} · Season ${season.seasonNumber}`}
      episode={episode}
      nextNumber={nextEpisodeNumber(season.episodes)}
    />
  );
}

function EpisodeForm({ showId, subtitle, episode, nextNumber }: {
  showId: number;
  subtitle: string;
  episode?: ApiEpisode;
  nextNumber: number;
}) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const save = useSaveEpisode();
  const remove = useDeleteEpisode();
  const addToast = useToast();
  const initial = {
    episodeNumber: String(episode?.episodeNumber ?? nextNumber),
    title: episode?.title ?? '',
    runtime: episode?.runtime != null ? String(episode.runtime) : '',
  };
  const [form, setForm] = useState(initial);
  const set = (key: keyof typeof initial, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const busy = save.isPending || remove.isPending;
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const onSave = () => {
    const checked = episodeToRequest(form);
    if (!checked.ok) return addToast(checked.error, 'error');
    save.mutate(
      { showId, episodeId: episode?.id, body: checked.body },
      {
        onSuccess: () => {
          haptics.success();
          addToast(`Episode ${checked.body.episodeNumber} ${episode ? 'updated' : 'added'}`, 'success');
          router.back();
        },
        onError: (e) => addToast(e.message || 'Failed to save episode', 'error'),
      },
    );
  };

  const onDelete = () =>
    Alert.alert(`Delete episode ${episode!.episodeNumber}?`, `"${episode!.title}" will be removed. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          remove.mutate(episode!.id, {
            onSuccess: () => {
              addToast(`Deleted episode ${episode!.episodeNumber}`, 'success');
              router.back();
            },
            onError: (e) => addToast(e.message || 'Failed to delete episode', 'error'),
          }),
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{ title: episode ? 'Edit Episode' : 'Add Episode', headerTitleStyle: { color: colors.label as string } }}
      />
      <FormSheetToolbar
        dirty={dirty}
        busy={busy}
        onSave={onSave}
        tint={accents.mcu}
        onDelete={episode ? onDelete : undefined}
        deleteLabel="Delete episode"
      />
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{ bottom: keyboardInset }}
        scrollIndicatorInsets={{ bottom: keyboardInset }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
        <FormSection title={subtitle}>
          <FormTextField
            label="Episode"
            required
            value={form.episodeNumber}
            onChangeText={(t) => set('episodeNumber', t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            editable={!busy}
          />
          <FormTextField
            label="Title"
            required
            value={form.title}
            onChangeText={(t) => set('title', t)}
            placeholder="Episode title"
            maxLength={255}
            editable={!busy}
          />
          <FormTextField
            label="Runtime"
            required
            value={form.runtime}
            onChangeText={(t) => set('runtime', t.replace(/[^0-9]/g, ''))}
            placeholder="Minutes"
            keyboardType="number-pad"
            editable={!busy}
          />
        </FormSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.groupedBackground },
});
