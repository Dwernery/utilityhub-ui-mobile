import type { Course, CourseInput } from '../types';
import type { CourseDraft } from './courseForm';

/** The form's text fields, as the API wants them. Check courseFormError first. */
export function draftToInput(draft: CourseDraft): CourseInput {
  return {
    title: draft.title.trim(),
    creatorName: draft.creatorName.trim(),
    groupId: draft.groupId,
    totalLessons: Number(draft.totalLessons),
    completedLessons: draft.completedLessons === '' ? 0 : Number(draft.completedLessons),
    url: draft.url.trim() || null,
  };
}

/** A course, as the form's fields. */
export function courseToDraft(course: Course): CourseDraft {
  return {
    title: course.title,
    creatorName: course.creatorName,
    groupId: course.groupId,
    totalLessons: String(course.totalLessons),
    completedLessons: String(course.completedLessons),
    url: course.url ?? '',
  };
}
