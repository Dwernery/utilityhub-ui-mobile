import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilePickerButton } from '@/components/library/file-picker-button';
import { FormSection, FormTextField, FormValueRow } from '@/components/ui/form';
import { accents, spacing } from '@/constants/theme';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { useCoursesPicker } from '@/lib/courses/context';
import { useGroups } from '@/lib/courses/hooks';
import type { CourseDraft } from '@/lib/courses/utils/courseForm';
import type { PickedFile } from '@/lib/library/utils/s3Upload';

const wholeNumber = (text: string) => text.replace(/[^0-9]/g, '').slice(0, 5);

interface CourseFormProps {
  draft: CourseDraft;
  setDraft: (update: (d: CourseDraft) => CourseDraft) => void;
  busy: boolean;
  file: PickedFile | null;
  setFile: (f: PickedFile | null) => void;
  isUploading: boolean;
}

/** Shared Add / Edit course form (the web's CourseFormModal). */
export function CourseForm({ draft, setDraft, busy, file, setFile, isUploading }: CourseFormProps) {
  const { openPicker } = useCoursesPicker();
  const { data: groups = [] } = useGroups();
  const insets = useSafeAreaInsets();
  const keyboardInset = useKeyboardInset();
  const set = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const groupName = groups.find((g) => g.id === draft.groupId)?.name ?? '';

  return (
    <ScrollView
      style={styles.flex}
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: keyboardInset }}
      scrollIndicatorInsets={{ bottom: keyboardInset }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={[styles.content, { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right }]}>
      <FormSection title="Course">
        <FormTextField
          label="Title"
          required
          value={draft.title}
          onChangeText={(t) => set('title', t)}
          placeholder="Title"
          editable={!busy}
          maxLength={255}
        />
        <FormValueRow
          label="Creator"
          required
          value={draft.creatorName}
          placeholder="Choose"
          disabled={busy}
          onPress={() => openPicker({ field: 'creator', value: draft.creatorName, onSelect: (v) => set('creatorName', v) })}
        />
        <FormValueRow
          label="Group"
          value={groupName}
          placeholder="None"
          disabled={busy}
          onPress={() => openPicker({ field: 'group', value: draft.groupId, onSelect: (v) => set('groupId', v) })}
        />
      </FormSection>

      <FormSection title="Progress">
        <FormTextField
          label="Lessons"
          required
          value={draft.totalLessons}
          onChangeText={(t) => set('totalLessons', wholeNumber(t))}
          placeholder="0"
          keyboardType="number-pad"
          editable={!busy}
        />
        <FormTextField
          label="Lessons done"
          value={draft.completedLessons}
          onChangeText={(t) => set('completedLessons', wholeNumber(t))}
          placeholder="0"
          keyboardType="number-pad"
          editable={!busy}
        />
      </FormSection>

      <FormSection title="Link" footer="Where to take the course, if it's online.">
        <FormTextField
          label="URL"
          value={draft.url}
          onChangeText={(t) => set('url', t)}
          placeholder="https://"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="URL"
          editable={!busy}
          maxLength={2048}
        />
      </FormSection>

      <FilePickerButton
        label="Cover"
        selectedFile={file}
        onFileSelected={setFile}
        isUploading={isUploading}
        disabled={busy}
        tint={accents.courses}
        imagesOnly
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xl },
});
