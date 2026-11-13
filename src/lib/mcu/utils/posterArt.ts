// Deterministic, per-item generative poster art. The web version emitted CSS
// `radial-gradient()` strings; native returns structured stops that a
// react-native-svg <RadialGradient> renders. (This also drops the web bug where
// alpha was appended to an `rgb(...)` string, which isn't valid CSS.)

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

/** Lighten (+) or darken (−) a hex color by a percentage of 255. */
export function shade(hex: string, percent: number): string {
  const [r, g, b] = hexToRgb(hex);
  const adjust = (channel: number) => Math.max(0, Math.min(255, Math.round(channel + (percent / 100) * 255)));
  return `rgb(${adjust(r)}, ${adjust(g)}, ${adjust(b)})`;
}

export interface RadialBlob {
  /** Center, 0–1 of width/height */
  cx: number;
  cy: number;
  /** Radius where the blob fades out, 0–1 of the poster's larger side */
  r: number;
  color: string;
  opacity: number;
}

export interface PosterArt {
  /** Bottom layer: 150° linear gradient */
  base: { from: string; to: string; angle: number };
  /** Painted bottom → top */
  blobs: RadialBlob[];
}

export function posterArt(id: string, color: string): PosterArt {
  const seed = hashString(id);
  const pct = (min: number, span: number, n: number) => (min + seededRandom(seed + n) * span) / 100;

  // Same seeds/positions/alphas as the web's three radial layers (FA≈0.98, F0≈0.94, E0≈0.88).
  // CSS listed them top-first; here they're bottom-first.
  return {
    base: { from: '#262b3a', to: '#171a22', angle: 150 },
    blobs: [
      { cx: pct(15, 65, 4), cy: pct(55, 35, 5), r: 0.62, color: shade(color, -8), opacity: 0.88 },
      { cx: pct(10, 75, 2), cy: pct(35, 40, 3), r: 0.55, color, opacity: 0.94 },
      { cx: pct(10, 70, 0), cy: pct(5, 35, 1), r: 0.5, color: shade(color, 38), opacity: 0.98 },
    ],
  };
}

/** Two stops for a left→right progress-bar gradient. */
export function gradientBar(color: string): [string, string] {
  return [shade(color, -18), shade(color, 22)];
}
