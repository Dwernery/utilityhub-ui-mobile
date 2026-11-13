import { router, Stack } from 'expo-router';

/** Leading "xmark" glass button for sheet headers (sheets can also be swiped down). */
export function SheetCloseButton() {
  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Close" onPress={() => router.back()} />
    </Stack.Toolbar>
  );
}
