import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Usable width (minus side chrome) at which screens switch to their wide, multi-column layout. */
export const WIDE_BREAKPOINT = 700;

/**
 * True on wide screens: the unfolded iPhone Duo, iPad, landscape. Usable width excludes side safe
 * areas such as the Duo's side tab bar.
 */
export function useIsWide(breakpoint = WIDE_BREAKPOINT) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return width - insets.left - insets.right >= breakpoint;
}

/** Usable width above which there's room for full-precision numbers (any unfolded/iPad posture). */
export const ROOMY_BREAKPOINT = 600;
