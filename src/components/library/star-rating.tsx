import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { haptics } from '@/lib/haptics';

const STAR_COLOR = '#FFB800'; // amber, matches the web's amber-400
const EMPTY_COLOR = 'rgba(120,120,128,0.36)';

interface StarRatingProps {
  /** 0–5; 0 = unrated */
  value?: number | null;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 13, md: 22, lg: 30 } as const;

/**
 * 1–5 star rating. Tapping the current value clears it (same as the web).
 * Exposed to VoiceOver as an adjustable control (swipe up/down to change).
 */
export function StarRating({ value = 0, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const current = value ?? 0;
  const px = SIZES[size];
  const interactive = !readonly && !!onChange;

  const set = (n: number) => {
    if (!interactive) return;
    haptics.selection();
    onChange!(n === current ? 0 : n);
  };

  return (
    <View
      style={[styles.row, { gap: size === 'sm' ? 1 : 4 }]}
      accessible
      accessibilityRole={interactive ? 'adjustable' : 'text'}
      accessibilityLabel="Rating"
      accessibilityValue={{ text: current ? `${current} of 5 stars` : 'Not rated' }}
      accessibilityActions={interactive ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={(e) => {
        if (!interactive) return;
        if (e.nativeEvent.actionName === 'increment') onChange!(Math.min(5, current + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange!(Math.max(0, current - 1));
      }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= current;
        const star = (
          <SymbolView name={filled ? 'star.fill' : 'star'} size={px} tintColor={filled ? STAR_COLOR : EMPTY_COLOR} />
        );
        return interactive ? (
          <Pressable key={n} onPress={() => set(n)} hitSlop={6} style={({ pressed }) => pressed && styles.pressed}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  pressed: { transform: [{ scale: 0.85 }] },
});
