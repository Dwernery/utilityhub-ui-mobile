import type { Course, CourseGroup } from '../types';
import {
  courseOrder,
  courseSections,
  coursesHomeStats,
  courseStatus,
  holdOrder,
  matchesSearch,
  percent,
  percentLabel,
  progressFraction,
  sortCourses,
  sumStats,
} from './stats';

// Mirrors the web's domains/courses/utils/stats.test.js.
const course = (id: number, title: string, completedLessons: number, totalLessons: number, groupId: number | null = null) =>
  ({ id, title, creatorName: 'Dan Vega', completedLessons, totalLessons, groupId }) as Course;

describe('courseStatus', () => {
  it('is not started, in progress or done', () => {
    expect(courseStatus(course(1, 'a', 0, 10))).toBe('NOT_STARTED');
    expect(courseStatus(course(1, 'a', 3, 10))).toBe('IN_PROGRESS');
    expect(courseStatus(course(1, 'a', 10, 10))).toBe('DONE');
  });
});

describe('percent', () => {
  it('rounds down and handles an empty total', () => {
    expect(percent(199, 200)).toBe(99);
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});

describe('percentLabel / progressFraction', () => {
  it('never shows a started course as empty', () => {
    expect(percentLabel(2, 320)).toBe('<1%');
    expect(progressFraction(2, 320)).toBe(0.02);
    expect(percentLabel(0, 320)).toBe('0%');
    expect(progressFraction(0, 320)).toBe(0);
    expect(percentLabel(22, 55)).toBe('40%');
    expect(progressFraction(22, 55)).toBeCloseTo(0.4);
    expect(progressFraction(55, 55)).toBe(1);
    expect(progressFraction(0, 0)).toBe(0);
  });
});

describe('sumStats', () => {
  it('sums lessons and counts courses by status', () => {
    expect(sumStats([course(1, 'a', 10, 10), course(2, 'b', 5, 20), course(3, 'c', 0, 10)])).toEqual({
      completedLessons: 15,
      totalLessons: 40,
      pct: 37,
      courseCount: 3,
      coursesDone: 1,
      coursesInProgress: 1,
      coursesNotStarted: 1,
    });
  });

  it('is all zeros for no courses', () => {
    expect(sumStats([])).toMatchObject({ totalLessons: 0, pct: 0 });
  });
});

describe('sortCourses', () => {
  it('puts in progress (furthest first), then not started, then done', () => {
    const sorted = sortCourses([
      course(1, 'Done', 4, 4),
      course(2, 'Zero B', 0, 9),
      course(3, 'Half', 5, 10),
      course(4, 'Zero A', 0, 9),
      course(5, 'Most', 9, 10),
    ]);
    expect(sorted.map((c) => c.title)).toEqual(['Most', 'Half', 'Zero A', 'Zero B', 'Done']);
  });
});

describe('matchesSearch', () => {
  it('matches title or creator, ignoring case', () => {
    const c = course(1, 'Spring Boot', 0, 1);
    expect(matchesSearch(c, 'spring')).toBe(true);
    expect(matchesSearch(c, 'VEGA')).toBe(true);
    expect(matchesSearch(c, 'react')).toBe(false);
    expect(matchesSearch(c, '  ')).toBe(true);
  });
});

describe('courseSections', () => {
  const groups: CourseGroup[] = [
    { id: 2, name: 'Web', position: 1 },
    { id: 1, name: 'Java', position: 0 },
    { id: 3, name: 'Empty', position: 2 },
  ];

  it('orders groups by position, sums each, and adds Ungrouped last', () => {
    const sections = courseSections(
      [
        course(1, 'Spring', 5, 10, 1),
        course(2, 'Kotlin', 10, 10, 1),
        course(3, 'CSS', 1, 4, 2),
        course(4, 'Loose', 0, 3),
        course(5, 'Orphan', 0, 2, 99), // its group was deleted: ungrouped
      ],
      groups,
    );
    expect(sections.map((s) => s.group?.name ?? null)).toEqual(['Java', 'Web', 'Empty', null]);
    expect(sections[0].stats).toMatchObject({ completedLessons: 15, totalLessons: 20, coursesDone: 1 });
    expect(sections[2].courses).toEqual([]);
    expect(sections[3].courses.map((c) => c.title)).toEqual(['Loose', 'Orphan']);
  });

  it('leaves out Ungrouped when every course has a group', () => {
    expect(courseSections([course(1, 'a', 0, 1, 1)], groups).some((s) => s.group === null)).toBe(false);
  });
});

describe('coursesHomeStats', () => {
  it('gives overall totals and in-progress courses', () => {
    const { overall, inProgress } = coursesHomeStats([course(1, 'a', 2, 10), course(2, 'b', 0, 10), course(3, 'c', 8, 10)]);
    expect(overall).toMatchObject({ completedLessons: 10, totalLessons: 30 });
    expect(inProgress.map((c) => c.title)).toEqual(['c', 'a']);
  });
});

describe('holdOrder', () => {
  const groups: CourseGroup[] = [{ id: 1, name: 'Java', position: 0 }];

  it('keeps rows where they were after progress changes, new courses last', () => {
    const before = courseSections([course(1, 'A', 0, 10, 1), course(2, 'B', 5, 10, 1)], groups);
    const order = courseOrder(before); // B (in progress), then A
    // A gets a lesson done and would normally sort above B (6 of 10 beats 5 of 10)...
    const after = courseSections([course(1, 'A', 6, 10, 1), course(2, 'B', 5, 10, 1), course(3, 'C', 0, 5, 1)], groups);
    expect(after[0].courses.map((c) => c.title)).toEqual(['A', 'B', 'C']);
    // ...but held, it stays below B, and the new course C goes last.
    expect(holdOrder(after, order)[0].courses.map((c) => c.title)).toEqual(['B', 'A', 'C']);
  });
});
