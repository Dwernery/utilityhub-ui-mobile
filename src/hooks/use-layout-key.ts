import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A key that changes with the usable width (window minus side safe areas). Put it on a screen's
 * ScreenScrollView to lay the screen out fresh after rotating or unfolding.
 *
 * Why: screens whose wide layout stretches two columns to the same height and lets a chart fill
 * its card (Finances Dashboard and History) kept stale sizes after rotating with the screen open
 * (seen on the iPhone Duo): the month list ran under the side chrome, and History's columns
 * changed proportions. Laid out fresh they're right. The cost is that the scroll position resets
 * on rotation.
 */
export function useLayoutKey(): string {
  const { width } = useWindowDimensions();
  const safe = useSafeAreaInsets();
  return String(Math.round(width - safe.left - safe.right));
}
