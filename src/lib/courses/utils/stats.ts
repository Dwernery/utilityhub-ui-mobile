import type { Course, CourseGroup, CourseStatus } from '../types';

/**
 * Course and group stats, worked out from the course list so they're never stale.
 * Mirrors the web's domains/courses/utils/stats.js.
 */

export function courseStatus(course: Pick<Course, 'completedLessons' | 'totalLessons'>): CourseStatus {
  if (course.completedLessons >= course.totalLessons) return 'DONE';
  return course.completedLessons > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';
}

/** Whole-number percent, rounded down so 99.6% doesn't read as done. */
export function percent(completed: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.floor((completed / total) * 100)));
}

/** The smallest fill a bar or ring shows once any lesson is done, so a little progress never looks like none. */
const MIN_VISIBLE = 0.02;

/** Fill for a bar or ring (0–1). */
export function progressFraction(completed: number, total: number) {
  if (!total || completed <= 0) return 0;
  return Math.min(1, Math.max(completed / total, MIN_VISIBLE));
}

/** "41%", or "<1%" when some lessons are done but they round down to 0 (2 of 320). */
export function percentLabel(completed: number, total: number) {
  const pct = percent(completed, total);
  return pct === 0 && completed > 0 ? '<1%' : `${pct}%`;
}

export interface CourseTotals {
  completedLessons: number;
  totalLessons: number;
  pct: number;
  courseCount: number;
  coursesDone: number;
  coursesInProgress: number;
  coursesNotStarted: number;
}

/** Lessons and courses summed over a list of courses (a group, or everything). */
export function sumStats(courses: Course[]): CourseTotals {
  const completedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const totalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const count = (status: CourseStatus) => courses.filter((c) => courseStatus(c) === status).length;
  return {
    completedLessons,
    totalLessons,
    pct: percent(completedLessons, totalLessons),
    courseCount: courses.length,
    coursesDone: count('DONE'),
    coursesInProgress: count('IN_PROGRESS'),
    coursesNotStarted: count('NOT_STARTED'),
  };
}

const STATUS_ORDER: Record<CourseStatus, number> = { IN_PROGRESS: 0, NOT_STARTED: 1, DONE: 2 };

/** In progress first (furthest along first), then not started, then done; ties by title. */
export function sortCourses(courses: Course[]) {
  return [...courses].sort(
    (a, b) =>
      STATUS_ORDER[courseStatus(a)] - STATUS_ORDER[courseStatus(b)] ||
      percent(b.completedLessons, b.totalLessons) - percent(a.completedLessons, a.totalLessons) ||
      a.title.localeCompare(b.title),
  );
}

/** Title or creator contains the query, ignoring case. An empty query matches everything. */
export function matchesSearch(course: Course, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return course.title.toLowerCase().includes(q) || course.creatorName.toLowerCase().includes(q);
}

export interface CourseSection {
  /** null for "Ungrouped" */
  group: CourseGroup | null;
  courses: Course[];
  stats: CourseTotals;
}

/**
 * The page's sections: each group in its order, then "Ungrouped" (group: null).
 * Empty groups are kept so you can add to them; "Ungrouped" only appears when it has courses.
 */
export function courseSections(courses: Course[], groups: CourseGroup[]): CourseSection[] {
  const byGroup = new Map<number, Course[]>(groups.map((g) => [g.id, []]));
  const ungrouped: Course[] = [];
  for (const course of courses) {
    (byGroup.get(course.groupId ?? -1) ?? ungrouped).push(course);
  }
  const sections: CourseSection[] = [...groups]
    .sort((a, b) => a.position - b.position || a.id - b.id)
    .map((group) => {
      const list = byGroup.get(group.id)!;
      return { group, courses: sortCourses(list), stats: sumStats(list) };
    });
  if (ungrouped.length > 0) {
    sections.push({ group: null, courses: sortCourses(ungrouped), stats: sumStats(ungrouped) });
  }
  return sections;
}

/** For the Home card: overall totals and the in-progress courses, furthest along first. */
export function coursesHomeStats(courses: Course[]) {
  return {
    overall: sumStats(courses),
    inProgress: sortCourses(courses.filter((c) => courseStatus(c) === 'IN_PROGRESS')),
  };
}

/** Each course's place in the list, so the order can be held still while you tap −/+. */
export function courseOrder(sections: CourseSection[]): Map<number, number> {
  const order = new Map<number, number>();
  sections.forEach((s) => s.courses.forEach((c) => order.set(c.id, order.size)));
  return order;
}

/**
 * Puts each section's courses back in a remembered order, so a row doesn't move under your
 * finger when its progress changes. Courses added since go after the rest, in the usual order.
 */
export function holdOrder(sections: CourseSection[], order: Map<number, number>): CourseSection[] {
  return sections.map((s) => ({
    ...s,
    courses: [...s.courses].sort(
      (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    ),
  }));
}
