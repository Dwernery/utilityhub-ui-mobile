import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/constants/theme';

type Props = ComponentProps<typeof ScrollView> & {
  /** Horizontal padding added on top of the safe-area inset. */
  gutter?: number;
  /** Use the grouped (Settings-style) background. */
  grouped?: boolean;
  /**
   * Pad for left/right safe-area insets (device side chrome). Turn off inside sheets: a sheet is
   * its own surface, and its header buttons float over the content rather than reserving a column.
   */
  sideInsets?: boolean;
};

/**
 * Standard scrolling screen body. iOS's automatic inset adjustment only handles the vertical
 * axis (large-title header, tab bar), but some devices put chrome on the side — the iPhone Duo
 * reports an 84pt right inset for its status bar and side tab bar. This adds horizontal safe-area
 * padding on top of the usual gutter so content never sits under it. (`ref` passes through.)
 */
export function ScreenScrollView({
  gutter = spacing.lg,
  grouped = true,
  sideInsets = true,
  style,
  contentContainerStyle,
  ...props
}: Props) {
  const safe = useSafeAreaInsets();
  const insets = sideInsets ? safe : { left: 0, right: 0 };
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={[grouped && styles.grouped, style]}
      contentContainerStyle={[
        { paddingLeft: gutter + insets.left, paddingRight: gutter + insets.right },
        contentContainerStyle,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  grouped: { backgroundColor: colors.groupedBackground },
});
