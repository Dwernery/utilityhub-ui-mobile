import { isBookValid } from './bookValidation';

const valid = { title: 'Dune', authorName: 'Frank Herbert', pages: 412 };

describe('isBookValid', () => {
  it('accepts a complete book, with pages as a number or a string from a text field', () => {
    expect(isBookValid(valid)).toBe(true);
    expect(isBookValid({ ...valid, pages: '412' })).toBe(true);
  });

  it.each([
    ['blank title', { title: '   ' }],
    ['missing author', { authorName: null }],
    ['zero pages', { pages: '0' }],
    ['non-numeric pages', { pages: 'abc' }],
  ])('rejects a book with %s', (_, override) => {
    expect(isBookValid({ ...valid, ...override })).toBe(false);
  });

  it('rejects nothing at all', () => {
    expect(isBookValid(null)).toBe(false);
  });
});
