import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { COURSE_CREATORS_KEY, COURSE_GROUPS_KEY, COURSES_KEY } from './queryKeys';
import type { Course, CourseGroup } from './types';
import { uploadFileToS3, type PickedFile } from '../library/utils/s3Upload';

// Courses queries and mutations. Mirrors the web's domains/courses/hooks.js.

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
const MAX_COVER_MB = 10;

// ── Queries ────────────────────────────────────────────────────────────────

export const useCourses = () => useQuery({ queryKey: COURSES_KEY, queryFn: api.getCourses });
export const useCreators = () => useQuery({ queryKey: COURSE_CREATORS_KEY, queryFn: api.getCreators });
export const useGroups = () => useQuery({ queryKey: COURSE_GROUPS_KEY, queryFn: api.getGroups });

/** One course from the list's cache, so sheets always show the latest state. */
export function useCourse(id: number | undefined) {
  const query = useCourses();
  return { ...query, data: id === undefined ? undefined : query.data?.find((c) => c.id === id) };
}

// ── Mutations ──────────────────────────────────────────────────────────────

/** Each mutation refetches what it changes once it succeeds. */
function useInvalidatingMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, ...keys: (readonly string[])[]) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export const useAddCourse = () => useInvalidatingMutation(api.addCourse, COURSES_KEY);
export const useUpdateCourse = () => useInvalidatingMutation(api.updateCourse, COURSES_KEY);
export const useDeleteCourse = () => useInvalidatingMutation(api.deleteCourse, COURSES_KEY);
export const useCreateCreator = () => useInvalidatingMutation(api.createCreator, COURSE_CREATORS_KEY);
// A rename shows on every course by that creator, so both lists change.
export const useRenameCreator = () => useInvalidatingMutation(api.renameCreator, COURSE_CREATORS_KEY, COURSES_KEY);
export const useDeleteCreator = () => useInvalidatingMutation(api.deleteCreator, COURSE_CREATORS_KEY);
export const useCreateGroup = () => useInvalidatingMutation(api.createGroup, COURSE_GROUPS_KEY);
export const useRenameGroup = () => useInvalidatingMutation(api.renameGroup, COURSE_GROUPS_KEY);
// Deleting a group ungroups its courses, so both lists change.
export const useDeleteGroup = () => useInvalidatingMutation(api.deleteGroup, COURSE_GROUPS_KEY, COURSES_KEY);

/** Reorders groups on screen at once; puts them back if the save fails. */
export function useReorderGroups() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.reorderGroups,
    onMutate: async (groupIds: number[]) => {
      await queryClient.cancelQueries({ queryKey: COURSE_GROUPS_KEY });
      const previous = queryClient.getQueryData<CourseGroup[]>(COURSE_GROUPS_KEY);
      queryClient.setQueryData<CourseGroup[]>(COURSE_GROUPS_KEY, (groups = []) =>
        groups.map((g) => ({ ...g, position: groupIds.indexOf(g.id) })),
      );
      return { previous };
    },
    onError: (_err, _ids, context) => queryClient.setQueryData(COURSE_GROUPS_KEY, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: COURSE_GROUPS_KEY }),
  });
}

const PROGRESS_KEY = ['course-progress'];

/**
 * Sets lessons done, updating the list at once so −/+ feel instant. If the save fails,
 * the old count comes back.
 *
 * The list is refetched only when the last of several quick taps has saved: a refetch
 * after an earlier tap could land after a later tap's update and bring back the older
 * count, and the next tap would then count from it. Mirrors the web's hooks.js.
 */
export function useSetProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: PROGRESS_KEY,
    mutationFn: api.setProgress,
    onMutate: async ({ id, completedLessons }: { id: number; completedLessons: number }) => {
      await queryClient.cancelQueries({ queryKey: COURSES_KEY });
      const previous = queryClient.getQueryData<Course[]>(COURSES_KEY);
      queryClient.setQueryData<Course[]>(COURSES_KEY, (courses = []) =>
        courses.map((c) => (c.id === id ? { ...c, completedLessons } : c)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => queryClient.setQueryData(COURSES_KEY, context?.previous),
    onSettled: () => {
      // This one still counts as running here, so 1 means it's the last.
      if (queryClient.isMutating({ mutationKey: PROGRESS_KEY }) === 1) {
        return queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      }
    },
  });
}

/** '' when the file can be a cover, otherwise why not. */
export function coverFileError(file: PickedFile) {
  if (!COVER_TYPES.includes(file.mimeType)) return 'Choose a JPEG, PNG, WebP, HEIC or GIF image';
  if (file.size && file.size > MAX_COVER_MB * 1024 * 1024) return `Images can be up to ${MAX_COVER_MB} MB`;
  return '';
}

/** Uploads a cover: ask the API where to put it, PUT it to S3, then attach it. */
export function useUploadCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseId, file }: { courseId: number; file: PickedFile }) => {
      const problem = coverFileError(file);
      if (problem) throw new Error(problem);
      const { presignedUrl, s3Key } = await api.getCoverUploadUrl(courseId, file.mimeType);
      await uploadFileToS3(presignedUrl, file);
      return api.attachCover(courseId, s3Key);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COURSES_KEY }),
  });
}
