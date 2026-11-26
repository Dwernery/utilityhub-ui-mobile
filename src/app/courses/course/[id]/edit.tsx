import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CourseForm } from '@/components/courses/course-form';
import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { SheetCloseButton } from '@/components/ui/sheet-close-button';
import { accents, colors, type } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useCourse, useUpdateCourse, useUploadCover } from '@/lib/courses/hooks';
import type { Course } from '@/lib/courses/types';
import { courseFormError, type CourseDraft } from '@/lib/courses/utils/courseForm';
import { courseToDraft, draftToInput } from '@/lib/courses/utils/draft';
import type { PickedFile } from '@/lib/library/utils/s3Upload';
import { parseIdParam } from '@/lib/routeParams';

export default function EditCourse() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: course } = useCourse(parseIdParam(id));

  if (!course) {
    return (
      <>
        <Stack.Screen options={{ title: 'Edit Course' }} />
        <SheetCloseButton />
        <View style={styles.missing}>
          <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>This course no longer exists.</Text>
        </View>
      </>
    );
  }
  // Keyed so the form starts from this course's values.
  return <EditForm key={course.id} course={course} />;
}

function EditForm({ course }: { course: Course }) {
  const [initial] = useState(() => courseToDraft(course));
  const [draft, setDraft] = useState<CourseDraft>(initial);
  const [file, setFile] = useState<PickedFile | null>(null);
  const updateCourse = useUpdateCourse();
  const uploadCover = useUploadCover();
  const addToast = useToast();

  const busy = updateCourse.isPending || uploadCover.isPending;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial) || !!file;

  const save = async () => {
    const problem = courseFormError(draft);
    if (problem) {
      addToast(problem, 'error');
      return;
    }
    const input = draftToInput(draft);
    try {
      await updateCourse.mutateAsync({ id: course.id, ...input });
    } catch (e) {
      addToast((e as Error)?.message || "Couldn't save the course", 'error');
      return;
    }
    if (file) {
      try {
        await uploadCover.mutateAsync({ courseId: course.id, file });
      } catch (e) {
        addToast(`Saved, but the cover didn't upload: ${(e as Error)?.message || 'unknown error'}`, 'warning');
        router.back();
        return;
      }
    }
    addToast(`Saved "${input.title}"`, 'success');
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Course' }} />
      <FormSheetToolbar dirty={dirty} busy={busy} onSave={save} saveLabel="Save course" tint={accents.courses} />
      <CourseForm draft={draft} setDraft={setDraft} busy={busy} file={file} setFile={setFile} isUploading={uploadCover.isPending} />
    </>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
