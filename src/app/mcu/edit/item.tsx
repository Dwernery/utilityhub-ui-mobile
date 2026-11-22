import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilePickerButton } from '@/components/library/file-picker-button';
import { FormControlRow, FormSection, FormTextField, FormValueRow } from '@/components/ui/form';
import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, spacing, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { parseLocalDate, toIsoDate } from '@/lib/dates';
import { haptics } from '@/lib/haptics';
import type { PickedFile } from '@/lib/library/utils/s3Upload';
import { useMcuTrackerData, useSaveMcuItem } from '@/lib/mcu/hooks';
import {
  domainOptions,
  draftFromRaw,
  draftToRequest,
  emptyDraft,
  findRaw,
  isDraftKind,
  KIND_LABELS,
  nextSeasonDraft,
  type ItemDraft,
  type MovieBody,
  type ShowSeasonBody,
} from '@/lib/mcu/utils/editing';

/**
 * Add or edit a movie, special or show season (the web's McuItemForm).
 * - `?kind=movie|special|show`: add a new one
 * - `?globalId=movie:12` or `show:3`: edit it
 * - `?nextSeasonOf=show:3`: add the next season of that show, prefilled
 */
export default function McuItemSheet() {
  const params = useLocalSearchParams<{ kind?: string; globalId?: string; nextSeasonOf?: string }>();
  const { data } = useMcuTrackerData();

  if (params.globalId || params.nextSeasonOf) {
    const raw = findRaw(data, (params.globalId ?? params.nextSeasonOf)!);
    if (!raw || (params.nextSeasonOf && raw.kind !== 'show')) {
      return (
        <>
          <Stack.Screen options={{ title: 'Edit', headerTitleStyle: { color: colors.label as string } }} />
          <SheetCloseButton />
          <View style={styles.missing}>
            <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>
              {data ? 'This item no longer exists.' : 'Loading…'}
            </Text>
          </View>
        </>
      );
    }
    if (params.nextSeasonOf && raw.kind === 'show') {
      return <ItemForm key={`next-${raw.show.globalId}`} initial={nextSeasonDraft(raw)} />;
    }
    return (
      <ItemForm
        key={params.globalId}
        initial={draftFromRaw(raw)}
        id={raw.kind === 'movie' ? raw.movie.id : raw.show.id}
        hasPoster={!!(raw.kind === 'movie' ? raw.movie.s3Url : raw.show.s3Url)}
      />
    );
  }
  return <ItemForm key={params.kind} initial={emptyDraft(isDraftKind(params.kind) ? params.kind : 'movie')} />;
}

const KINDS = ['movie', 'special'] as const;

function ItemForm({ initial, id, hasPoster }: { initial: ItemDraft; id?: number; hasPoster?: boolean }) {
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const { data } = useMcuTrackerData();
  const options = useMemo(() => domainOptions(data), [data]);
  const save = useSaveMcuItem();
  const addToast = useToast();
  const [draft, setDraft] = useState(initial);
  const [poster, setPoster] = useState<PickedFile | null>(null);
  const set = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const isShow = draft.kind === 'show';
  const busy = save.isPending;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || !!poster;
  const isNextSeason = !id && isShow && !!initial.title;
  const title = id ? `Edit ${KIND_LABELS[draft.kind]}` : isNextSeason ? `${initial.title} · Season ${initial.season}` : `Add ${KIND_LABELS[draft.kind]}`;

  const chooseDomain = () => {
    const choices = [...options, 'New Category…', 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Phase or Category', options: choices, cancelButtonIndex: choices.length - 1 },
      (index) => {
        if (index < options.length) return set('domain', options[index]);
        if (index === options.length) {
          Alert.prompt('New Category', 'Shown under Expanded Universe.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Use', onPress: (name?: string) => name?.trim() && set('domain', name.trim()) },
          ]);
        }
      },
    );
  };

  const onSave = () => {
    const checked = draftToRequest(draft);
    if (!checked.ok) return addToast(checked.error, 'error');
    const input = isShow
      ? { kind: 'show' as const, id, body: checked.body as ShowSeasonBody, posterFile: poster }
      : { kind: 'movie' as const, id, body: checked.body as MovieBody, posterFile: poster };
    const what = isShow ? `${checked.body.title} season ${(checked.body as ShowSeasonBody).season}` : checked.body.title;
    save.mutate(input, {
      onSuccess: ({ globalId, posterError }) => {
        if (posterError) {
          addToast(`${what} saved, but the poster upload failed: ${posterError.message}`, 'warning');
        } else {
          haptics.success();
          addToast(`${what} ${id ? 'updated' : 'added'}`, 'success');
        }
        if (id) return router.back();
        // Show the new item, so a new season can get its episodes right away.
        router.replace({ pathname: '/mcu/item/[globalId]', params: { globalId } });
      },
      onError: (e) => addToast(e.message || `Failed to save ${KIND_LABELS[draft.kind].toLowerCase()}`, 'error'),
    });
  };

  return (
    <>
      <Stack.Screen options={{ title, headerTitleStyle: { color: colors.label as string } }} />
      <FormSheetToolbar dirty={dirty} busy={busy} onSave={onSave} tint={accents.mcu} />
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{ bottom: keyboardInset }}
        scrollIndicatorInsets={{ bottom: keyboardInset }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
        {!isShow && (
          <FormSection>
            <FormControlRow label="Type" stacked>
              <SegmentedControl
                values={KINDS.map((k) => KIND_LABELS[k])}
                selectedIndex={KINDS.indexOf(draft.kind as (typeof KINDS)[number])}
                enabled={!busy}
                onChange={(e) => {
                  const next = KINDS[e.nativeEvent.selectedSegmentIndex];
                  if (!next || next === draft.kind) return;
                  haptics.selection();
                  set('kind', next);
                }}
                accessibilityLabel="Type"
              />
            </FormControlRow>
          </FormSection>
        )}

        <FormSection>
          <FormTextField
            label="Title"
            required
            value={draft.title}
            onChangeText={(t) => set('title', t)}
            placeholder={isShow ? 'e.g. Loki' : 'e.g. Thunderbolts*'}
            maxLength={255}
            editable={!busy}
          />
          {isShow && (
            <FormTextField
              label="Season"
              required
              value={draft.season}
              onChangeText={(t) => set('season', t.replace(/[^0-9]/g, ''))}
              placeholder="1"
              keyboardType="number-pad"
              editable={!busy}
            />
          )}
          <FormControlRow label="Premiere Date">
            {draft.premiereDate ? (
              <DateTimePicker
                value={parseLocalDate(draft.premiereDate) ?? new Date()}
                mode="date"
                display="compact"
                accentColor={accents.mcu as string}
                disabled={busy}
                onValueChange={(_, date) => set('premiereDate', toIsoDate(date))}
              />
            ) : (
              <Text
                onPress={() => !busy && set('premiereDate', toIsoDate(new Date()))}
                accessibilityRole="button"
                style={[type.body, { color: accents.mcu }]}>
                Set Date
              </Text>
            )}
          </FormControlRow>
          {!isShow && (
            <FormTextField
              label="Runtime"
              required
              value={draft.runtime}
              onChangeText={(t) => set('runtime', t.replace(/[^0-9]/g, ''))}
              placeholder="Minutes"
              keyboardType="number-pad"
              editable={!busy}
            />
          )}
          <FormValueRow label="Phase or Category" required value={draft.domain} placeholder="Choose" disabled={busy} onPress={chooseDomain} />
        </FormSection>

        <FormSection title="Synopsis">
          <TextInput
            value={draft.synopsis}
            onChangeText={(t) => set('synopsis', t)}
            placeholder="Required"
            placeholderTextColor={colors.tertiaryLabel}
            multiline
            editable={!busy}
            accessibilityLabel="Synopsis"
            style={[type.body, styles.synopsis]}
          />
        </FormSection>

        <FormSection title="Poster" footer={hasPoster ? 'Choosing an image replaces the current poster.' : 'Optional. JPG, PNG, WebP or GIF, up to 10 MB.'}>
          <FilePickerButton
            label="Poster"
            selectedFile={poster}
            onFileSelected={setPoster}
            isUploading={save.isPending && !!poster && save.uploadProgress > 0}
            uploadProgress={save.uploadProgress}
            disabled={busy}
            tint={accents.mcu}
            imagesOnly
          />
        </FormSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  synopsis: { color: colors.label, minHeight: 110, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, textAlignVertical: 'top' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.groupedBackground },
});
