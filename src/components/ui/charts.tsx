import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, radius, spacing, tabularNums, type } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

/**
 * Charts:
 * - `BarChart`: plain views, so bars are tappable and labelled (Swift Charts has no tap API).
 * - `LineChart`: lightweight SVG, because Swift Charts here can't set a Y domain (it always
 *   includes 0, flattening net worth) and has no touch inspection. Matches the web graph:
 *   Y axis snapped to `yStep` around the data, formatted tick labels, and touch-and-drag to
 *   read a value (the native stand-in for the web's hover tooltip).
 */

export interface SeriesPoint {
  /** Category label, e.g. "Jan" or "2024" */
  label: string;
  value: number;
}

interface BaseChartProps {
  data: SeriesPoint[];
  height?: number;
  /** Shown when `data` is empty. */
  emptyText?: string;
  /** Spoken summary for VoiceOver (charts aren't otherwise readable). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

function EmptyChart({ height, text }: { height: number; text: string }) {
  return (
    <View style={[styles.empty, { height }]}>
      <Text style={[type.subheadline, { color: colors.secondaryLabel }]}>{text}</Text>
    </View>
  );
}

// ── Line chart ─────────────────────────────────────────────────────────────

interface LineChartProps extends BaseChartProps {
  /** Hex color (SVG needs a concrete color). */
  tint: string;
  /** Y axis snaps to multiples of this around the data (web used 10,000). */
  yStep?: number;
  formatY?: (n: number) => string;
  /** Format for the inspected value bubble. */
  formatValue?: (n: number) => string;
}

const Y_AXIS_WIDTH = 48;
const X_AXIS_HEIGHT = 22;
const PAD_TOP = 28; // room for the inspection bubble
const PAD_X = 8; // keeps the first/last point markers inside the plot

export function LineChart({
  data,
  tint,
  height = 220,
  yStep = 10_000,
  formatY = String,
  formatValue = formatY,
  emptyText = 'No data yet',
  accessibilityLabel,
  style,
}: LineChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  if (data.length === 0) return <EmptyChart height={height} text={emptyText} />;

  const values = data.map((d) => d.value);
  let yMin = Math.floor(Math.min(...values) / yStep) * yStep;
  let yMax = Math.ceil(Math.max(...values) / yStep) * yStep;
  if (yMin === yMax) {
    yMin -= yStep;
    yMax += yStep;
  }
  const ticks = niceTicks(yMin, yMax, yStep);

  const plotW = Math.max(0, width - Y_AXIS_WIDTH);
  const plotH = height - X_AXIS_HEIGHT - PAD_TOP;
  const innerW = Math.max(0, plotW - PAD_X * 2);
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const xAt = (i: number) => (data.length > 1 ? PAD_X + i * step : plotW / 2);
  const yAt = (v: number) => PAD_TOP + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const linePath = data.map((d, i) => `${i ? 'L' : 'M'}${xAt(i)},${yAt(d.value)}`).join(' ');
  const areaPath = `${linePath} L${xAt(data.length - 1)},${PAD_TOP + plotH} L${xAt(0)},${PAD_TOP + plotH} Z`;
  const showEveryOther = data.length > 6 && plotW / data.length < 34;

  const pick = (x: number) => {
    if (!plotW) return;
    const i = Math.max(0, Math.min(data.length - 1, Math.round((x - PAD_X) / (step || 1))));
    if (i !== selected) {
      haptics.selection();
      setSelected(i);
    }
  };

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const sel = selected != null ? data[selected] : null;

  return (
    <View
      style={[{ height }, style]}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      {width > 0 && (
        <>
          {/* Y grid + labels (RN views so they use semantic colors) */}
          {ticks.map((t) => (
            <View key={t} style={[styles.gridRow, { top: yAt(t) - 7, width }]} pointerEvents="none">
              <View style={[styles.gridLine, { width: plotW }]} />
              <Text style={[styles.axisLabel, styles.yLabel]} numberOfLines={1}>
                {formatY(t)}
              </Text>
            </View>
          ))}

          <View
            style={[StyleSheet.absoluteFill, { right: Y_AXIS_WIDTH }]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
            onResponderMove={(e) => pick(e.nativeEvent.locationX)}
            onResponderRelease={() => setSelected(null)}
            onResponderTerminate={() => setSelected(null)}>
            <Svg width={plotW} height={height - X_AXIS_HEIGHT}>
              <Defs>
                <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={tint} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={tint} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={areaPath} fill="url(#area)" />
              <Path d={linePath} stroke={tint} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {sel && (
                <Line x1={xAt(selected!)} x2={xAt(selected!)} y1={PAD_TOP} y2={PAD_TOP + plotH} stroke={tint} strokeOpacity={0.5} strokeWidth={1} />
              )}
              {data.map((d, i) => (
                <Circle
                  key={d.label + i}
                  cx={xAt(i)}
                  cy={yAt(d.value)}
                  r={i === selected ? 6 : 3.5}
                  fill={i === selected ? tint : '#fff'}
                  stroke={tint}
                  strokeWidth={2}
                />
              ))}
            </Svg>

            {sel && (
              <View
                pointerEvents="none"
                style={[
                  styles.bubble,
                  { left: Math.max(0, Math.min(plotW - 120, xAt(selected!) - 60)) },
                ]}>
                <Text style={[type.caption1, { color: colors.secondaryLabel }]}>{sel.label}</Text>
                <Text style={[type.footnote, tabularNums, { color: colors.label, fontWeight: '600' }]}>
                  {formatValue(sel.value)}
                </Text>
              </View>
            )}
          </View>

          {/* X labels */}
          <View style={[styles.xAxis, { width: plotW }]} pointerEvents="none">
            {data.map((d, i) =>
              showEveryOther && i % 2 === 1 ? null : (
                <Text
                  key={d.label + i}
                  style={[styles.axisLabel, styles.xLabel, { left: xAt(i) - 20 }]}
                  numberOfLines={1}>
                  {d.label}
                </Text>
              ),
            )}
          </View>
        </>
      )}
    </View>
  );
}

/** Up to ~5 evenly spaced ticks that are multiples of `step`. */
function niceTicks(min: number, max: number, step: number) {
  const range = max - min;
  let s = step;
  while (range / s > 5) s *= 2;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / s) * s; t <= max; t += s) ticks.push(t);
  return ticks;
}

// ── Bar chart ──────────────────────────────────────────────────────────────

interface BarChartProps extends BaseChartProps {
  tint: ColorValue;
  /** Label of a bar to emphasize (others are dimmed), e.g. the selected year. */
  highlight?: string | null;
  dimColor?: ColorValue;
  /** Tap a bar (label passed back); enables button semantics + haptics. */
  onSelect?: (label: string) => void;
  /** Value label printed above each bar. */
  formatValue?: (n: number) => string;
  /** Unit for VoiceOver ("30 books"). */
  unit?: string;
}

const BAR_LABEL = 18; // value label above the bar
const AXIS_LABEL = 20; // category label below

function Bar({ value, max, plotH, color, active, label, display, onPress, a11y }: {
  value: number;
  max: number;
  plotH: number;
  color: ColorValue;
  active: boolean;
  label: string;
  display: string;
  onPress?: () => void;
  a11y: string;
}) {
  const reduceMotion = useReducedMotion();
  const target = max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * plotH) : 0;
  const h = useSharedValue(reduceMotion ? target : 0);
  useEffect(() => {
    h.set(reduceMotion ? target : withTiming(target, { duration: 450 }));
  }, [target, reduceMotion, h]);
  const barStyle = useAnimatedStyle(() => ({ height: h.get() }));

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityState={{ selected: active }}
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.barCol, pressed && { opacity: 0.6 }]}>
      <View style={[styles.barArea, { height: plotH + BAR_LABEL }]}>
        <Text
          style={[styles.barValue, tabularNums, { color: active ? (color as string) : colors.secondaryLabel }]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {display}
        </Text>
        <Animated.View style={[styles.bar, { backgroundColor: color }, barStyle]} />
      </View>
      <Text style={[styles.barLabel, active && { color: colors.label, fontWeight: '600' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Vertical bars (books/pages per year, income by year). Built from plain views rather than Swift
 * Charts so bars are tappable (select a year), labelled with their values, and individually
 * readable by VoiceOver. Bars start at zero.
 */
export function BarChart({
  data,
  tint,
  highlight,
  dimColor = colors.fill,
  height = 200,
  emptyText = 'No data yet',
  accessibilityLabel,
  style,
  onSelect,
  formatValue = String,
  unit = '',
}: BarChartProps) {
  if (data.length === 0) return <EmptyChart height={height} text={emptyText} />;
  const max = Math.max(...data.map((d) => d.value), 0);
  const plotH = height - BAR_LABEL - AXIS_LABEL;

  return (
    <View style={[{ height }, style]} accessibilityLabel={accessibilityLabel}>
      <View style={[styles.baseline, { top: BAR_LABEL + plotH }]} />
      <View style={styles.bars}>
        {data.map((d) => {
          const active = highlight == null || highlight === d.label;
          return (
            <Bar
              key={d.label}
              value={d.value}
              max={max}
              plotH={plotH}
              color={active ? tint : dimColor}
              active={highlight === d.label}
              label={d.label}
              display={formatValue(d.value)}
              onPress={
                onSelect
                  ? () => {
                      haptics.selection();
                      onSelect(d.label);
                    }
                  : undefined
              }
              a11y={`${d.label}: ${formatValue(d.value)}${unit ? ` ${unit}` : ''}`}
            />
          );
        })}
      </View>
    </View>
  );
}

/** Builds "Jan 120k, Feb 125k…" style summaries for chart accessibility labels. */
export function describeSeries(data: SeriesPoint[], format: (n: number) => string = String) {
  return data.map((d) => `${d.label} ${format(d.value)}`).join(', ');
}

/** `$250k` — the web graph's Y-axis format. */
export const formatThousands = (v: number) => '$' + Math.floor(v / 1000) + 'k';

const styles = StyleSheet.create({
  bars: { flex: 1, flexDirection: 'row', gap: spacing.sm },
  barCol: { flex: 1, alignItems: 'center' },
  barArea: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '72%', maxWidth: 72, borderTopLeftRadius: 6, borderTopRightRadius: 6, borderCurve: 'continuous' },
  barValue: { fontSize: 12, fontWeight: '600', marginBottom: 3, maxWidth: '100%' },
  barLabel: { height: AXIS_LABEL, paddingTop: 4, fontSize: 12, color: colors.secondaryLabel, fontVariant: ['tabular-nums'] },
  baseline: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
  gridRow: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'center', height: 14 },
  gridLine: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  axisLabel: { fontSize: 11, color: colors.secondaryLabel, fontVariant: ['tabular-nums'] },
  yLabel: { width: Y_AXIS_WIDTH, paddingLeft: 6 },
  xAxis: { position: 'absolute', left: 0, bottom: 0, height: X_AXIS_HEIGHT },
  xLabel: { position: 'absolute', top: 4, width: 40, textAlign: 'center' },
  bubble: {
    position: 'absolute',
    top: 0,
    width: 120,
    alignItems: 'center',
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    backgroundColor: colors.tertiaryFill,
  },
});
