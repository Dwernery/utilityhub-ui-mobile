import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { CourseForm } from '@/components/courses/course-form';
import { FormSheetToolbar } from '@/components/ui/form-sheet-toolbar';
import { accents } from '@/constants/theme';
import { useToast } from '@/context/toast';
import { useAddCourse, useUploadCover } from '@/lib/courses/hooks';
import { courseFormError, type CourseDraft } from '@/lib/courses/utils/courseForm';
import { draftToInput } from '@/lib/courses/utils/draft';
import type { PickedFile } from '@/lib/library/utils/s3Upload';

const EMPTY: CourseDraft = { title: '', creatorName: '', groupId: null, totalLessons: '', completedLessons: '', url: '' };

export default function AddCourse() {
  const [draft, setDraft] = useState<CourseDraft>(EMPTY);
  const [file, setFile] = useState<PickedFile | null>(null);
  const addCourse = useAddCourse();
  const uploadCover = useUploadCover();
  const addToast = useToast();

  const busy = addCourse.isPending || uploadCover.isPending;
  const dirty = JSON.stringify(draft) !== JSON.stringify(EMPTY) || !!file;

  const save = async () => {
    const problem = courseFormError(draft);
    if (problem) {
      addToast(problem, 'error');
      return;
    }
    const input = draftToInput(draft);
    let created;
    try {
      created = await addCourse.mutateAsync(input);
    } catch (e) {
      addToast((e as Error)?.message || "Couldn't add the course", 'error');
      return;
    }
    if (file) {
      try {
        await uploadCover.mutateAsync({ courseId: created.id, file });
      } catch (e) {
        addToast(`Course added, but the cover didn't upload: ${(e as Error)?.message || 'unknown error'}`, 'warning');
        router.back();
        return;
      }
    }
    addToast(`Added "${input.title}"`, 'success');
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Course' }} />
      <FormSheetToolbar dirty={dirty} busy={busy} onSave={save} saveLabel="Save course" tint={accents.courses} />
      <CourseForm draft={draft} setDraft={setDraft} busy={busy} file={file} setFile={setFile} isUploading={uploadCover.isPending} />
    </>
  );
}
