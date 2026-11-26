// Mirrors the web's domains/courses/utils/courseForm.js.

export interface CourseDraft {
  title: string;
  creatorName: string;
  groupId: number | null;
  /** As typed: digits only. */
  totalLessons: string;
  completedLessons: string;
  url: string;
}

/** Why the form can't be saved yet, or '' when it can. */
export function courseFormError(form: Pick<CourseDraft, 'title' | 'creatorName' | 'totalLessons' | 'completedLessons' | 'url'>) {
  const total = Number(form.totalLessons);
  const completed = form.completedLessons === '' ? 0 : Number(form.completedLessons);
  if (!form.title.trim()) return 'Add a title';
  if (!form.creatorName.trim()) return 'Choose a creator';
  if (!form.totalLessons || total < 1 || total > 10000) return 'Lessons must be from 1 to 10,000';
  if (completed > total) return "Lessons done can't be more than the total";
  if (form.url.trim() && !/^https?:\/\/\S+$/.test(form.url.trim())) return 'The link must start with http:// or https://';
  return '';
}
