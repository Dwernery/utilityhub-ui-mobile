import type { SFSymbol } from 'expo-symbols';

/**
 * lucide-react (web) → SF Symbol (iOS). Render with `<SymbolView name={icons.x} />` from expo-symbols.
 * `ArrowLeft` "back to home" links are intentionally absent — the native back button / tab bar replace them.
 */
export const icons = {
  // Tabs
  home: 'house',
  homeSelected: 'house.fill',
  library: 'books.vertical',
  librarySelected: 'books.vertical.fill',
  finances: 'chart.line.uptrend.xyaxis',
  mcu: 'film.stack',
  mcuSelected: 'film.stack.fill',

  // Domain glyphs
  book: 'book', // BookOpen
  bookClosed: 'book.closed',
  film: 'film', // Film
  tv: 'tv', // Tv
  sparkles: 'sparkles', // Sparkles
  dollar: 'dollarsign.circle',
  wallet: 'wallet.bifold',
  creditCard: 'creditcard',
  trendingUp: 'arrow.up.right', // TrendingUp
  trendingDown: 'arrow.down.right', // TrendingDown
  calendar: 'calendar',
  graduationCap: 'graduationcap', // Courses
  shuffle: 'shuffle', // Randomize
  dice: 'dice',
  chart: 'chart.bar', // Metrics
  list: 'list.bullet', // Inventory

  // Actions
  add: 'plus',
  edit: 'pencil',
  delete: 'trash',
  close: 'xmark',
  check: 'checkmark',
  checkCircle: 'checkmark.circle.fill',
  circle: 'circle',
  search: 'magnifyingglass',
  filter: 'line.3.horizontal.decrease',
  upload: 'square.and.arrow.up',
  photo: 'photo',
  play: 'play.fill',
  chevronRight: 'chevron.right',
  star: 'star',
  starFill: 'star.fill',
  starHalf: 'star.leadinghalf.filled',
  user: 'person', // author
  series: 'square.stack', // Layers
  warning: 'exclamationmark.triangle',
} as const satisfies Record<string, SFSymbol>;

export type IconName = keyof typeof icons;
