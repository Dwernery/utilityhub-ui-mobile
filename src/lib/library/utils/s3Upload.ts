import { File } from 'expo-file-system';

/**
 * A file chosen with expo-image-picker / expo-document-picker.
 * Replaces the browser `File` object the web client validated with `instanceof File`.
 */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  /** Bytes; pickers may omit it, in which case it is read from disk. */
  size?: number;
}

const DEFAULT_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Upload a local file to S3 with a presigned PUT URL. */
export async function uploadFileToS3(
  presignedUrl: string,
  file: PickedFile,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (!presignedUrl || typeof presignedUrl !== 'string') {
    throw new Error('Invalid presigned URL provided');
  }
  if (!file?.uri) {
    throw new Error('Invalid file object');
  }

  let status: number;
  try {
    const result = await new File(file.uri).upload(presignedUrl, {
      httpMethod: 'PUT',
      mimeType: file.mimeType,
      headers: { 'Content-Type': file.mimeType },
      sessionType: 'foreground',
      onProgress: onProgress
        ? ({ bytesSent, totalBytes }) => totalBytes > 0 && onProgress(bytesSent / totalBytes)
        : undefined,
    });
    status = result.status;
  } catch (error) {
    throw new Error('Network error during upload. Please check your internet connection.', { cause: error });
  }

  if (status >= 200 && status < 300) return;
  if (status === 403) throw new Error('Access denied: presigned URL may have expired. Please try again.');
  if (status === 400) throw new Error('Bad request: file may be corrupted or incompatible.');
  if (status >= 500) throw new Error('Server error: S3 service unavailable. Please try again later.');
  throw new Error(`Failed to upload file (HTTP ${status}). Please check your connection and try again.`);
}

export function validateFile(
  file: PickedFile | null | undefined,
  { maxSizeMB = 10, allowedTypes = DEFAULT_ALLOWED_TYPES }: { maxSizeMB?: number; allowedTypes?: string[] } = {},
): { valid: true } | { valid: false; error: string } {
  if (!file?.uri) {
    return { valid: false, error: 'Invalid file object' };
  }

  const size = file.size ?? new File(file.uri).size ?? 0;
  if (size === 0) {
    return { valid: false, error: 'File is empty' };
  }
  if (size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }
  if (!allowedTypes.includes(file.mimeType)) {
    return {
      valid: false,
      error: `File type "${file.mimeType}" is not allowed. Supported: JPG, PNG, WebP, GIF, PDF, DOC, DOCX`,
    };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
