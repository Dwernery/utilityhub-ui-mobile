import { bySeriesOrder, nextSeriesPosition, parseSeriesPosition, seriesLabel } from './series';

// Mirrors utility-hub-ui's domains/library/utils/series.test.js.
describe('seriesLabel', () => {
  it('adds the number when there is one', () => {
    expect(seriesLabel({ seriesName: 'Mistborn', seriesPosition: 2 })).toBe('Mistborn #2');
    expect(seriesLabel({ seriesName: 'Mistborn', seriesPosition: null })).toBe('Mistborn');
    expect(seriesLabel({ seriesName: null, seriesPosition: 3 })).toBeNull();
  });
});

describe('bySeriesOrder', () => {
  it('sorts by number, then books without one in the order they were added', () => {
    const books = [
      { id: 9, seriesPosition: null },
      { id: 4, seriesPosition: 2 },
      { id: 7, seriesPosition: null },
      { id: 8, seriesPosition: 1 },
    ];
    expect([...books].sort(bySeriesOrder).map((b) => b.id)).toEqual([8, 4, 7, 9]);
  });
});

describe('nextSeriesPosition', () => {
  it('is one past the highest number in that series', () => {
    const books = [
      { seriesName: 'Mistborn', seriesPosition: 1 },
      { seriesName: 'Mistborn', seriesPosition: 3 },
      { seriesName: 'Dune', seriesPosition: 6 },
    ];
    expect(nextSeriesPosition(books, 'Mistborn')).toBe(4);
    expect(nextSeriesPosition(books, 'Stormlight')).toBe(1);
  });
});

describe('parseSeriesPosition', () => {
  it('accepts whole numbers 1–999 and empty', () => {
    expect(parseSeriesPosition('')).toBeNull();
    expect(parseSeriesPosition(' 3 ')).toBe(3);
    expect(parseSeriesPosition('0')).toBe('invalid');
    expect(parseSeriesPosition('2.5')).toBe('invalid');
    expect(parseSeriesPosition('1000')).toBe('invalid');
  });
});
