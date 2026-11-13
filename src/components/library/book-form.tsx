import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { ScrollView, StyleSheet } from 'react-native';

import { FormControlRow, FormSection, FormTextField, FormValueRow } from '@/components/ui/form';
import { accents, colors, spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useLibrary } from '@/lib/library/context';
import type { BookStatus } from '@/lib/library/types';
import { parseLocalDate, todayLocalIso, toIsoDate } from '@/lib/library/utils/dateUtils';
import type { PickedFile } from '@/lib/library/utils/s3Upload';

import { FilePickerButton } from './file-picker-button';

export interface BookDraft {
  title: string;
  authorName: string;
  seriesName: string;
  pages: string;
  isbn13: string;
  status: BookStatus;
  startDate: string | null;
  endDate: string | null;
}

const STATUSES: { value: BookStatus; label: string }[] = [
  { value: 'UNREAD', label: 'Unread' },
  { value: 'IN_PROGRESS', label: 'Reading' },
  { value: 'READ', label: 'Read' },
];

/**
 * Status change rules from the web form, plus sensible defaults: Unread clears both dates,
 * Reading clears the end date. When a now-required date is empty it defaults to today
 * (the web left it blank and then failed validation on save).
 */
export function applyStatus(draft: BookDraft, status: BookStatus): BookDraft {
  const next = { ...draft, status };
  if (status === 'UNREAD') {
    next.startDate = null;
    next.endDate = null;
  } else if (status === 'IN_PROGRESS') {
    next.endDate = null;
    next.startDate ??= todayLocalIso();
  } else {
    next.startDate ??= todayLocalIso();
    next.endDate ??= todayLocalIso();
  }
  return next;
}

function DateRow({ label, value, onChange, disabled, minimumDate }: {
  label: string;
  value: string | null;
  onChange: (iso: string) => void;
  disabled?: boolean;
  minimumDate?: Date;
}) {
  return (
    <FormControlRow label={label}>
      <DateTimePicker
        value={parseLocalDate(value) ?? new Date()}
        mode="date"
        display="compact"
        accentColor={accents.library as string}
        disabled={disabled}
        minimumDate={minimumDate}
        maximumDate={new Date()}
        onValueChange={(_, date) => onChange(toIsoDate(date))}
      />
    </FormControlRow>
  );
}

interface BookFormProps {
  mode: 'add' | 'edit';
  draft: BookDraft;
  setDraft: (update: (d: BookDraft) => BookDraft) => void;
  busy: boolean;
  file: PickedFile | null;
  setFile: (f: PickedFile | null) => void;
  isUploading: boolean;
  uploadProgress: number;
}

/** Shared Add/Edit book form (the web's AddBookForm + EditBookForm). Edit also shows status and dates. */
export function BookForm({ mode, draft, setDraft, busy, file, setFile, isUploading, uploadProgress }: BookFormProps) {
  const { openPicker } = useLibrary();
  // Full-height sheets reach the top of the screen, where side chrome (e.g. the iPhone Duo's
  // status bar and the sheet's own toolbar rail) sits, so keep clear of the side insets here.
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const set = <K extends keyof BookDraft>(key: K, value: BookDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
      <ScrollView
        style={styles.flex}
        contentInsetAdjustmentBehavior="automatic"
        contentInset={{ bottom: keyboardInset }}
        scrollIndicatorInsets={{ bottom: keyboardInset }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
        <FormSection title="Book">
          <FormTextField
            label="Title"
            required
            value={draft.title}
            onChangeText={(t) => set('title', t)}
            placeholder="Title"
            editable={!busy}
            returnKeyType="next"
          />
          <FormValueRow
            label="Author"
            required
            value={draft.authorName}
            placeholder="Choose"
            disabled={busy}
            onPress={() =>
              openPicker({ field: 'author', value: draft.authorName, onSelect: (v) => set('authorName', v) })
            }
          />
          <FormValueRow
            label="Series"
            value={draft.seriesName}
            placeholder="None"
            disabled={busy}
            onPress={() =>
              openPicker({ field: 'series', value: draft.seriesName, onSelect: (v) => set('seriesName', v) })
            }
          />
          <FormTextField
            label="Pages"
            required
            value={draft.pages}
            onChangeText={(t) => set('pages', t.replace(/[^0-9]/g, ''))}
            placeholder="0"
            keyboardType="number-pad"
            editable={!busy}
          />
          <FormTextField
            label="ISBN"
            required
            value={draft.isbn13}
            onChangeText={(t) => set('isbn13', t)}
            placeholder="978…"
            keyboardType="number-pad"
            editable={!busy}
          />
        </FormSection>

        {mode === 'edit' && (
          <FormSection title="Reading">
            <FormControlRow label="Status" stacked>
              <SegmentedControl
                values={STATUSES.map((s) => s.label)}
                selectedIndex={STATUSES.findIndex((s) => s.value === draft.status)}
                enabled={!busy}
                onChange={(e) => {
                  const next = STATUSES[e.nativeEvent.selectedSegmentIndex]?.value;
                  if (!next || next === draft.status) return;
                  haptics.selection();
                  setDraft((d) => applyStatus(d, next));
                }}
                accessibilityLabel="Status"
              />
            </FormControlRow>
            {draft.status !== 'UNREAD' && (
              <DateRow label="Started" value={draft.startDate} disabled={busy} onChange={(v) => set('startDate', v)} />
            )}
            {draft.status === 'READ' && (
              <DateRow
                label="Finished"
                value={draft.endDate}
                disabled={busy}
                minimumDate={parseLocalDate(draft.startDate) ?? undefined}
                onChange={(v) => set('endDate', v)}
              />
            )}
          </FormSection>
        )}

        <FormSection
            title={mode === 'add' ? 'Cover (optional)' : 'Update cover (optional)'}
            footer="JPG, PNG, WebP, GIF, PDF or Word, up to 10 MB.">
            <FilePickerButton
              selectedFile={file}
              onFileSelected={setFile}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              disabled={busy}
            />
        </FormSection>
      </ScrollView>
  );
}

export { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.groupedBackground },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
});
