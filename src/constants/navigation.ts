import type { ComponentProps } from 'react';

import { colors } from './theme';
import type { Stack } from 'expo-router';

type StackOptions = NonNullable<ComponentProps<typeof Stack.Screen>['options']>;
type ScreenOptions = Exclude<StackOptions, (...args: never[]) => unknown>;

/** Root screen of each tab: iOS large title that collapses into a glass header on scroll. */
export const largeTitleScreen: ScreenOptions = {
  headerLargeTitleEnabled: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  // headerTintColor (per-domain accent) would otherwise tint the titles too.
  headerTitleStyle: { color: colors.label as string },
  headerLargeTitleStyle: { color: colors.label as string },
};

/**
 * Detail sheets (book, author, series, month, MCU item…): resizable form sheet with a grabber
 * and a compact glass header. Screens add a close button with `<SheetCloseButton />`.
 */
export const detailSheet: ScreenOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.6, 1],
  sheetInitialDetentIndex: 0,
  headerShown: true,
  headerLargeTitleEnabled: false,
  headerTransparent: true,
  contentStyle: { backgroundColor: 'transparent' },
};

/**
 * Forms (add/edit, pickers): iOS page-sheet modal with a compact header for Cancel / Save.
 * Not a `formSheet`: at full height a form sheet shifts its content up by the keyboard height when
 * a field is focused (it can't grow), pushing the top fields under the header. A page sheet leaves
 * keyboard handling to the ScrollView (`automaticallyAdjustKeyboardInsets`). Swipe-to-dismiss still works.
 */
export const formSheet: ScreenOptions = {
  presentation: 'modal',
  headerShown: true,
  headerLargeTitleEnabled: false,
  headerTransparent: true,
  contentStyle: { backgroundColor: 'transparent' },
};
