import { useEffect, useState } from 'react';
import { Keyboard, useWindowDimensions } from 'react-native';

/**
 * Height of the keyboard overlapping the bottom of the screen (0 when hidden).
 *
 * Use as a ScrollView `contentInset.bottom` / `scrollIndicatorInsets.bottom` in forms instead of
 * `automaticallyAdjustKeyboardInsets`: RN's automatic mode also bumps the scroll offset by the
 * keyboard height, which on short forms throws the focused (top) field under the header.
 * Insets alone keep the content where it is and just make the bottom reachable.
 */
export function useKeyboardInset() {
  const { height: screenHeight } = useWindowDimensions();
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillChangeFrame', (e) => {
      setInset(Math.max(0, screenHeight - e.endCoordinates.screenY));
    });
    const hide = Keyboard.addListener('keyboardWillHide', () => setInset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [screenHeight]);

  return inset;
}
