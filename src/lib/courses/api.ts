import { requestJson, requestVoid } from '../http';
import type { Course, CourseCreator, CourseGroup, CourseInput } from './types';

// Courses API. Mirrors the web's domains/courses/api.js.
const BASE = '/api/courses';

export const getCourses = () => requestJson<Course[]>(BASE, { errorMessage: 'Failed to fetch courses' });
export const getCreators = () =>
  requestJson<CourseCreator[]>(`${BASE}/creators`, { errorMessage: 'Failed to fetch creators' });
export const getGroups = () => requestJson<CourseGroup[]>(`${BASE}/groups`, { errorMessage: 'Failed to fetch groups' });

export const addCourse = (course: CourseInput) =>
  requestJson<Course>(BASE, { method: 'POST', body: course, errorMessage: 'Failed to add course', includeErrorDetail: true });

export const updateCourse = ({ id, ...course }: CourseInput & { id: number }) =>
  requestJson<Course>(`${BASE}/${id}`, {
    method: 'PUT',
    body: course,
    errorMessage: 'Failed to save course',
    includeErrorDetail: true,
  });

export const setProgress = ({ id, completedLessons }: { id: number; completedLessons: number }) =>
  requestJson<Course>(`${BASE}/${id}/progress`, {
    method: 'PATCH',
    body: { completedLessons },
    errorMessage: 'Failed to save progress',
    includeErrorDetail: true,
  });

export async function deleteCourse(id: number) {
  await requestVoid(`${BASE}/${id}`, { method: 'DELETE', errorMessage: 'Failed to delete course' });
}

/** Returns the saved creator: an existing one if the name matches ignoring case. */
export const createCreator = (name: string) =>
  requestJson<CourseCreator>(`${BASE}/creators`, {
    method: 'POST',
    body: { name },
    errorMessage: 'Failed to add creator',
    includeErrorDetail: true,
  });

export const renameCreator = ({ id, name }: { id: number; name: string }) =>
  requestJson<CourseCreator>(`${BASE}/creators/${id}`, {
    method: 'PUT',
    body: { name },
    errorMessage: 'Failed to rename creator',
    includeErrorDetail: true,
  });

/** Only a creator with no courses can be deleted. */
export async function deleteCreator(id: number) {
  await requestVoid(`${BASE}/creators/${id}`, {
    method: 'DELETE',
    errorMessage: 'Failed to delete creator',
    includeErrorDetail: true,
  });
}

/** Returns the saved group: an existing one if the name matches ignoring case. */
export const createGroup = (name: string) =>
  requestJson<CourseGroup>(`${BASE}/groups`, {
    method: 'POST',
    body: { name },
    errorMessage: 'Failed to add group',
    includeErrorDetail: true,
  });

export const renameGroup = ({ id, name }: { id: number; name: string }) =>
  requestJson<CourseGroup>(`${BASE}/groups/${id}`, {
    method: 'PUT',
    body: { name },
    errorMessage: 'Failed to rename group',
    includeErrorDetail: true,
  });

/** @param groupIds every group, in the new order */
export const reorderGroups = (groupIds: number[]) =>
  requestJson<CourseGroup[]>(`${BASE}/groups/order`, {
    method: 'PUT',
    body: { groupIds },
    errorMessage: 'Failed to reorder groups',
    includeErrorDetail: true,
  });

/** Its courses stay, ungrouped. */
export async function deleteGroup(id: number) {
  await requestVoid(`${BASE}/groups/${id}`, { method: 'DELETE', errorMessage: 'Failed to delete group' });
}

export const getCoverUploadUrl = (id: number, fileType: string) =>
  requestJson<{ presignedUrl: string; s3Key: string }>(
    `${BASE}/${id}/cover-upload-url?${new URLSearchParams({ fileType })}`,
    { errorMessage: 'Failed to start cover upload', includeErrorDetail: true },
  );

export const attachCover = (id: number, s3Key: string) =>
  requestJson<Course>(`${BASE}/${id}/attach-cover`, {
    method: 'POST',
    body: { s3Key },
    errorMessage: 'Failed to attach cover',
    includeErrorDetail: true,
  });
