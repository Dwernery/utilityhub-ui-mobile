import { courseFormError } from './courseForm';

// Mirrors the web's domains/courses/utils/courseForm.test.js.
const form = (over = {}) => ({
  title: 'Spring Boot',
  creatorName: 'Dan Vega',
  totalLessons: '40',
  completedLessons: '',
  url: '',
  ...over,
});

describe('courseFormError', () => {
  it('accepts a complete form', () => {
    expect(courseFormError(form())).toBe('');
    expect(courseFormError(form({ completedLessons: '40', url: 'https://x.dev/a' }))).toBe('');
  });

  it('needs a title, a creator and 1 to 10,000 lessons', () => {
    expect(courseFormError(form({ title: '  ' }))).toBe('Add a title');
    expect(courseFormError(form({ creatorName: '' }))).toBe('Choose a creator');
    expect(courseFormError(form({ totalLessons: '' }))).toMatch(/1 to 10,000/);
    expect(courseFormError(form({ totalLessons: '0' }))).toMatch(/1 to 10,000/);
    expect(courseFormError(form({ totalLessons: '10001' }))).toMatch(/1 to 10,000/);
  });

  it('keeps lessons done within the total', () => {
    expect(courseFormError(form({ completedLessons: '41' }))).toMatch(/can't be more/);
  });

  it('only takes web links', () => {
    expect(courseFormError(form({ url: 'example.com' }))).toMatch(/http/);
    expect(courseFormError(form({ url: 'javascript:alert(1)' }))).toMatch(/http/);
  });
});
