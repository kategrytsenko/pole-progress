/**
 * Mirrors the diary write policies. A completed profile is required in addition
 * to studio access. Neither check is a pass spend, and neither replaces the other.
 */
export function canWriteOwnDiary(profileComplete: boolean, hasStudioAccess: boolean): boolean {
  return profileComplete && hasStudioAccess;
}

/** Storage upload and the media row insert use the same gate as an attempt write. */
export function canUploadDiaryMedia(profileComplete: boolean, hasStudioAccess: boolean): boolean {
  return canWriteOwnDiary(profileComplete, hasStudioAccess);
}
