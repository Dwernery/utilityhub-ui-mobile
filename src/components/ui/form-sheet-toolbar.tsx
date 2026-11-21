import { router, Stack } from 'expo-router';
import { Alert, type ColorValue } from 'react-native';

import { accents, colors } from '@/constants/theme';

/** Cancel (asks before discarding edits) + prominent checkmark Save, for form sheets. `onDelete` adds a trash button beside Save. */
export function FormSheetToolbar({
  dirty,
  busy,
  onSave,
  saveLabel = 'Save',
  tint = accents.library,
  onDelete,
  deleteLabel = 'Delete',
}: {
  dirty: boolean;
  busy: boolean;
  onSave: () => void;
  saveLabel?: string;
  tint?: ColorValue;
  onDelete?: () => void;
  deleteLabel?: string;
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
        {onDelete && (
          <Stack.Toolbar.Button icon="trash" tintColor={colors.negative} accessibilityLabel={deleteLabel} disabled={busy} onPress={onDelete} />
        )}
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

