import { router, Stack } from 'expo-router';
import { Alert, type ColorValue } from 'react-native';

import { accents } from '@/constants/theme';

/** Cancel (asks before discarding edits) + prominent checkmark Save, for form sheets. */
export function FormSheetToolbar({
  dirty,
  busy,
  onSave,
  saveLabel = 'Save',
  tint = accents.library,
}: {
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  saveLabel?: string;
  tint?: ColorValue;
}) {
  const cancel = () => {
    if (!dirty) return router.back();
    Alert.alert('Discard changes?', undefined, [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };
  return (
    <>
      {/* Block swipe-to-dismiss while there are unsaved edits; Cancel asks first. */}
      <Stack.Screen options={{ gestureEnabled: !dirty && !busy }} />
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="xmark" accessibilityLabel="Cancel" disabled={busy} onPress={cancel} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="checkmark"
          variant="prominent"
          tintColor={tint}
          accessibilityLabel={saveLabel}
          disabled={busy}
          onPress={onSave}
        />
      </Stack.Toolbar>
    </>
  );
}

