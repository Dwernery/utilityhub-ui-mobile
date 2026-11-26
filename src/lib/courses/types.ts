/** A course from GET /api/courses. `groupId` is null when it isn't in a group. */
export interface Course {
  id: number;
  title: string;
  creatorName: string;
  groupId: number | null;
  totalLessons: number;
  completedLessons: number;
  url: string | null;
  s3Url: string | null;
  createdAt: string;
}

export interface CourseCreator {
  id: number;
  name: string;
}

export interface CourseGroup {
  id: number;
  name: string;
  /** Display order, 0 first. */
  position: number;
}

/** What POST /api/courses and PUT /api/courses/{id} take. */
export interface CourseInput {
  title: string;
  creatorName: string;
  groupId: number | null;
  totalLessons: number;
  completedLessons: number;
  url: string | null;
}

export type CourseStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
