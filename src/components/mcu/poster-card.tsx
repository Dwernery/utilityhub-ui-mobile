import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { haptics } from '@/lib/haptics';
import type { McuItem, WatchedMap } from '@/lib/mcu/types';
import { MODAL_LABELS, STATUS_LABELS } from '@/lib/mcu/utils/constants';
import { posterArt } from '@/lib/mcu/utils/posterArt';
import {
  getItemProgressFraction,
  getStatus,
  isItemComplete,
  isItemPartial,
} from '@/lib/mcu/utils/stats';

export const POSTER_WIDTH = 112;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;
const BADGE = 24;

interface PosterCardProps {
  item: McuItem;
  /** Phase / category accent color (hex) */
  color: string;
  watched: WatchedMap;
  /** Movies/specials: cycle status. (TV seasons open the detail sheet instead.) */
  onToggleItem: (item: McuItem) => void;
  onSelectItem: (item: McuItem) => void;
}

/** Generative fallback art: dark diagonal base + three seeded radial color blobs. */
const PosterArt = memo(function PosterArt({
  id,
  color,
  width = POSTER_WIDTH,
  height = POSTER_HEIGHT,
}: {
  id: string;
  color: string;
  width?: number;
  height?: number;
}) {
  const art = useMemo(() => posterArt(id, color), [id, color]);
  const r = Math.max(width, height);
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        {/* 150° ≈ top-left → bottom-right */}
        <LinearGradient id="base" x1="0.25" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor={art.base.from} />
          <Stop offset="1" stopColor={art.base.to} />
        </LinearGradient>
        {art.blobs.map((b, i) => (
          <RadialGradient
            key={i}
            id={`blob${i}`}
            gradientUnits="userSpaceOnUse"
            cx={b.cx * width}
            cy={b.cy * height}
            r={b.r * r}>
            <Stop offset="0" stopColor={b.color} stopOpacity={b.opacity} />
            <Stop offset="1" stopColor={b.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect width="100%" height="100%" fill="url(#base)" />
      {art.blobs.map((_, i) => (
        <Rect key={i} width="100%" height="100%" fill={`url(#blob${i})`} />
      ))}
    </Svg>
  );
});

/** Static poster (artwork, or generative art fallback) for detail views. */
export function PosterThumb({ item, color, width = 104 }: { item: McuItem; color: string; width?: number }) {
  const [failed, setFailed] = useState(false);
  const height = width * 1.5;
  return (
    <View style={[styles.thumb, { width, height }]} accessibilityRole="image" accessibilityLabel={`${item.title} poster`}>
      <PosterArt id={item.id} color={color} width={width} height={height} />
      {item.s3Url && !failed ? (
        <Image
          source={{ uri: item.s3Url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

/** Top-right status disc: empty ring → progress ring (partial) → filled check (complete). */
function StatusBadge({ complete, partial, fraction, color }: { complete: boolean; partial: boolean; fraction: number; color: string }) {
  const stroke = 2.5;
  const radius = (BADGE - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  if (complete) {
    return (
      <View style={[styles.badge, { backgroundColor: color, borderColor: color, boxShadow: `0 0 10px ${color}` }]}>
        <SymbolView name="checkmark" size={12} weight="heavy" tintColor="#12141B" />
      </View>
    );
  }

  return (
    <View style={[styles.badge, styles.badgeEmpty]}>
      {partial && (
        <Svg width={BADGE} height={BADGE} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
          <Circle
            cx={BADGE / 2}
            cy={BADGE / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference * fraction} ${circumference}`}
          />
        </Svg>
      )}
    </View>
  );
}

/**
 * MCU poster (2:3). Tap opens details; the corner badge toggles watched (movies/specials)
 * or opens the episode list (TV). Shows real artwork when available, generative art otherwise.
 */
export const PosterCard = memo(function PosterCard({ item, color, watched, onToggleItem, onSelectItem }: PosterCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const isTv = item.type === 'tv';
  const hasImage = !!item.s3Url && !imageFailed;
  const complete = isItemComplete(item, watched);
  const partial = isItemPartial(item, watched);
  const fraction = getItemProgressFraction(item, watched);
  const episodesDone = isTv
    ? item.episodes.filter((e) => getStatus(watched, e.globalId) === 'WATCHED').length
    : 0;

  const statusText = isTv
    ? `${episodesDone} of ${item.episodes.length} episodes watched`
    : STATUS_LABELS[getStatus(watched, item.id)];
  const subtitle = [item.premiereDate || null, isTv ? `Season ${item.seasonNumber}` : null].filter(Boolean).join(', ');

  const springTo = (v: number) => {
    if (!reduceMotion) scale.set(withSpring(v, { damping: 15, stiffness: 400 }));
  };

  const onBadgePress = () => {
    if (isTv) {
      onSelectItem(item);
    } else {
      haptics.tap();
      onToggleItem(item);
    }
  };

  return (
    <Animated.View style={[styles.card, pressStyle, complete && { boxShadow: `0 0 0 2px ${color}, 0 6px 18px ${color}55` }]}>
      <Pressable
        onPress={() => onSelectItem(item)}
        onPressIn={() => springTo(0.96)}
        onPressOut={() => springTo(1)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}${subtitle ? `, ${subtitle}` : ''}. ${statusText}`}
        accessibilityHint="Opens details"
        accessibilityActions={isTv ? undefined : [{ name: 'activate' }, { name: 'magicTap', label: complete ? MODAL_LABELS.MARK_UNWATCHED : MODAL_LABELS.MARK_WATCHED }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === 'activate') onSelectItem(item);
          if (e.nativeEvent.actionName === 'magicTap') onBadgePress();
        }}
        style={styles.fill}>
        <PosterArt id={item.id} color={color} />
        {hasImage && (
          <Image
            source={{ uri: item.s3Url! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            recyclingKey={item.id}
            onError={() => setImageFailed(true)}
          />
        )}

        {isTv && (
          <View style={styles.episodes}>
            <Text style={styles.episodesText}>
              {episodesDone}/{item.episodes.length} {MODAL_LABELS.EPS}
            </Text>
          </View>
        )}

        {/* No hover on touch: the title overlay shows whenever there's no artwork to identify the poster. */}
        {!hasImage && (
          <View style={styles.caption}>
            <Text style={[styles.title, complete && styles.titleDone]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>{item.premiereDate || ''}</Text>
              {isTv && <Text style={styles.meta}>S{item.seasonNumber}</Text>}
            </View>
          </View>
        )}
      </Pressable>

      <Pressable
        onPress={onBadgePress}
        hitSlop={10}
        style={styles.badgeHit}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <StatusBadge complete={complete} partial={partial} fraction={fraction} color={color} />
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  thumb: {
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  card: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  fill: { flex: 1, borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' },
  episodes: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(2,6,23,0.8)',
  },
  episodesText: { fontSize: 10, fontWeight: '600', color: '#fff', fontVariant: ['tabular-nums'] },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 7,
    paddingTop: 16,
    paddingBottom: 7,
    backgroundImage: 'linear-gradient(180deg, transparent 0%, rgba(8,9,13,0.55) 35%, rgba(8,9,13,0.95) 100%)',
  },
  title: { fontSize: 12, lineHeight: 14, fontWeight: '700', color: '#fff' },
  titleDone: { color: '#cbd5e1' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  meta: { fontSize: 10, color: '#cbd5e1', fontVariant: ['tabular-nums'] },
  badgeHit: { position: 'absolute', top: 6, right: 6 },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmpty: { borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'rgba(2,6,23,0.4)' },
});
