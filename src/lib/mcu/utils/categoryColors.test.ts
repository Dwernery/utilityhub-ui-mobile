import { assignCategoryColors, CATEGORY_PALETTE, PINNED_CATEGORY_COLORS } from './categoryColors';

const current = ['Fox X-Men Universe', 'Sony Spider-Man Universe', 'The Defenders Saga'];

describe('assignCategoryColors', () => {
  it('gives the current categories their pinned colors', () => {
    expect(assignCategoryColors(current)).toEqual(PINNED_CATEGORY_COLORS);
  });

  it('never moves an existing color when a category is added, and avoids repeats', () => {
    const colors = assignCategoryColors(['Agents of S.H.I.E.L.D.', ...current, 'Wonder Man']);
    for (const title of current) expect(colors[title]).toBe(PINNED_CATEGORY_COLORS[title]);
    expect(new Set(Object.values(colors)).size).toBe(5);
  });

  it('is the same every time for the same names', () => {
    const names = [...current, 'Marvel Television'];
    expect(assignCategoryColors(names)).toEqual(assignCategoryColors([...names].reverse()));
  });

  it('spreads repeats evenly past the palette size', () => {
    const names = Array.from({ length: 12 }, (_, i) => `Category ${i}`);
    const counts = Object.values(assignCategoryColors(names)).reduce<Record<string, number>>(
      (acc, c) => ({ ...acc, [c]: (acc[c] ?? 0) + 1 }),
      {},
    );
    expect(Object.keys(counts)).toHaveLength(CATEGORY_PALETTE.length);
    expect(Object.values(counts).every((n) => n === 2)).toBe(true);
  });
});
