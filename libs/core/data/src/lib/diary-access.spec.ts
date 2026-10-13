import { canUploadDiaryMedia, canWriteOwnDiary } from './diary-access';

describe('diary writes and media uploads', () => {
  it('requires both a completed profile and studio access', () => {
    expect(canWriteOwnDiary(true, true)).toBe(true);
    expect(canUploadDiaryMedia(true, true)).toBe(true);
  });

  it('blocks an incomplete profile even when a pass is active', () => {
    expect(canWriteOwnDiary(false, true)).toBe(false);
    expect(canUploadDiaryMedia(false, true)).toBe(false);
  });

  it('blocks a completed profile that has no pass', () => {
    expect(canWriteOwnDiary(true, false)).toBe(false);
    expect(canUploadDiaryMedia(true, false)).toBe(false);
  });

  it('blocks an incomplete profile without a pass', () => {
    expect(canWriteOwnDiary(false, false)).toBe(false);
    expect(canUploadDiaryMedia(false, false)).toBe(false);
  });
});
