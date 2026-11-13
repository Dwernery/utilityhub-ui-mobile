import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { ActionSheetIOS, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui/progress-bar';
import { accents, colors, radius, spacing, type } from '@/constants/theme';
import { formatFileSize, type PickedFile } from '@/lib/library/utils/s3Upload';

interface FilePickerButtonProps {
  label?: string;
  selectedFile: PickedFile | null;
  onFileSelected: (file: PickedFile | null) => void;
  isUploading?: boolean;
  /** 0–1 */
  uploadProgress?: number;
  disabled?: boolean;
}

const DOC_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const guessMime = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
};

async function pickFromLibrary(): Promise<PickedFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (result.canceled) return null;
  const a = result.assets[0];
  const name = a.fileName ?? `cover-${Date.now()}.jpg`;
  return { uri: a.uri, name, mimeType: a.mimeType ?? guessMime(name), size: a.fileSize };
}

async function takePhoto(): Promise<PickedFile | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) {
    Alert.alert('Camera access needed', 'Allow camera access in Settings to photograph a cover.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
  if (result.canceled) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.fileName ?? `cover-${Date.now()}.jpg`, mimeType: a.mimeType ?? 'image/jpeg', size: a.fileSize };
}

async function pickDocument(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream', size: a.size };
}

/**
 * Cover / file chooser — replaces the web's `<input type="file">` drop zone.
 * Opens a native action sheet: Photo Library · Take Photo · Choose File.
 */
export function FilePickerButton({
  label = 'Cover',
  selectedFile,
  onFileSelected,
  isUploading = false,
  uploadProgress = 0,
  disabled = false,
}: FilePickerButtonProps) {
  const choose = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Photo Library', 'Take Photo', 'Choose File', 'Cancel'], cancelButtonIndex: 3, title: label },
      async (index) => {
        try {
          const picker = [pickFromLibrary, takePhoto, pickDocument][index];
          if (!picker) return;
          const file = await picker();
          if (file) onFileSelected(file);
        } catch (e) {
          Alert.alert('Couldn’t open picker', e instanceof Error ? e.message : String(e));
        }
      },
    );
  };

  if (isUploading) {
    return (
      <View style={styles.box} accessibilityLabel={`Uploading, ${Math.round(uploadProgress * 100)} percent`}>
        <View style={styles.row}>
          <SymbolView name="arrow.up.circle" size={20} tintColor={accents.library} />
          <Text style={[type.subheadline, styles.text]}>Uploading… {Math.round(uploadProgress * 100)}%</Text>
        </View>
        <ProgressBar value={uploadProgress} tint={accents.library} />
      </View>
    );
  }

  if (selectedFile) {
    return (
      <View style={[styles.box, styles.row]}>
        <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.positive} />
        <View style={styles.fileInfo}>
          <Text style={[type.subheadline, styles.text]} numberOfLines={1}>
            {selectedFile.name}
          </Text>
          {selectedFile.size ? (
            <Text style={[type.caption1, { color: colors.secondaryLabel }]}>{formatFileSize(selectedFile.size)}</Text>
          ) : null}
        </View>
        <Pressable onPress={() => onFileSelected(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove file">
          <Text style={[type.subheadline, { color: colors.negative }]}>Remove</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={choose}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`Choose ${label.toLowerCase()}`}
      style={({ pressed }) => [styles.box, styles.row, pressed && styles.pressed, disabled && styles.disabled]}>
      <SymbolView name="photo.badge.plus" size={20} tintColor={accents.library} />
      <Text style={[type.body, { color: accents.library, flex: 1 }]}>Choose {label}</Text>
      <SymbolView name="chevron.right" size={13} weight="semibold" tintColor={colors.tertiaryLabel} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: 48,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    backgroundColor: colors.secondaryGroupedBackground,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileInfo: { flex: 1, minWidth: 0 },
  text: { color: colors.label },
  pressed: { backgroundColor: colors.fill },
  disabled: { opacity: 0.5 },
});
