import { Color } from 'expo-router';
import type { TextStyle } from 'react-native';

/**
 * Design tokens. Colors are iOS semantic colors (PlatformColor under the hood),
 * so light/dark mode and accessibility contrast come for free — don't hardcode hex for UI chrome.
 */
export const colors = {
  label: Color.ios.label,
  secondaryLabel: Color.ios.secondaryLabel,
  tertiaryLabel: Color.ios.tertiaryLabel,
  separator: Color.ios.separator,
  /** A little darker than `separator` (not see-through), for a line that should read as a section break. */
  opaqueSeparator: Color.ios.opaqueSeparator,
  background: Color.ios.systemBackground,
  groupedBackground: Color.ios.systemGroupedBackground,
  secondaryGroupedBackground: Color.ios.secondarySystemGroupedBackground,
  fill: Color.ios.systemFill,
  tertiaryFill: Color.ios.tertiarySystemFill,
  positive: Color.ios.systemGreen,
  negative: Color.ios.systemRed,
  warning: Color.ios.systemOrange,
  /** Emphasized figures (e.g. a month's net worth). systemBlue lightens in dark mode, so it stays readable. */
  emphasis: Color.ios.systemBlue,
  /** "Heads up" marks: the current month, a month with no data yet. */
  notice: Color.ios.systemYellow,
  /** Translucent, so it tints whatever is behind it in light and dark mode alike. */
  noticeBackground: 'rgba(250, 204, 21, 0.15)',
  white: '#ffffff',
} as const;

/** Per-domain accent tints (replace the web's per-page `html` classes). */
export const accents = {
  home: Color.ios.systemBlue,
  library: Color.ios.systemBlue,
  finances: Color.ios.systemGreen,
  mcu: Color.ios.systemRed,
} as const;

/** Hex versions of the accents for places that can't take PlatformColor (SVG, gradients). */
export const accentHex = {
  library: '#007AFF',
  finances: '#34C759',
  mcu: '#FF3B30',
} as const;

/**
 * Finance's tinted surfaces: the net-worth hero card and the Income & Expenses tiles.
 * They are fixed colored cards with light text, correct in both appearances, so they
 * don't follow the system theme. Hex because they're CSS gradients, which can't take PlatformColor.
 */
export const financeSurfaces = {
  hero: { from: '#2563eb', to: '#1d4ed8', shadow: 'rgba(37, 99, 235, 0.28)' },
  onHero: {
    primary: '#ffffff',
    secondary: '#dbeafe', // blue-100
    tertiary: '#bfdbfe', // blue-200
    divider: 'rgba(191, 219, 254, 0.4)',
    positive: '#6ee7b7', // emerald-300: readable on the blue card
    negative: '#fda4af', // rose-300
  },
  tile: { income: '#10b981', expense: '#f43f5e', positive: '#3b82f6', negative: '#f97316' },
  onTile: { primary: '#ffffff', secondary: 'rgba(255, 255, 255, 0.85)' },
} as const;

/** MCU is a dark-themed section; these are fixed regardless of system appearance. */
export const mcuColors = {
  background: '#0f172a', // slate-900, matches the web tracker
  surface: '#1e293b',
  label: '#f8fafc',
  secondaryLabel: '#94a3b8',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 } as const;

/** iOS Dynamic Type text styles (default "Large" sizes). */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
} as const satisfies Record<string, TextStyle>;

/** Use for numbers that change (stats, currency) so digits don't jitter. */
export const tabularNums: TextStyle = { fontVariant: ['tabular-nums'] };
