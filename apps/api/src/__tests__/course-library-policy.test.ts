import { describe, expect, it } from 'vitest';
import { canSelfEnrollInCourse, isCourseShownInLibrary } from '@cio/utils/functions/course-enrollment';
import { ZInternalCourseEnrollBody } from '@cio/utils/validation/course';

describe('internal course library policy', () => {
  it.each([
    [undefined, true],
    [{}, true],
    [{ allowNewStudent: false }, false],
    [{ allowSelfEnrollment: true, allowNewStudent: false }, true],
    [{ showInLibrary: true, allowSelfEnrollment: false }, true],
    [{ showInLibrary: false, allowSelfEnrollment: true }, false]
  ])('resolves legacy and explicit visibility: %j', (metadata, expected) => {
    expect(isCourseShownInLibrary(metadata)).toBe(expected);
  });

  it.each(['SELF_PACED', 'LIVE_CLASS', 'COMPLIANCE'])('separates visibility from enrollment for %s', (type) => {
    for (const showInLibrary of [false, true]) {
      for (const allowSelfEnrollment of [false, true]) {
        const metadata = { showInLibrary, allowSelfEnrollment };
        const course = { type, metadata };
        expect(canSelfEnrollInCourse(course)).toBe(type !== 'COMPLIANCE' && showInLibrary && allowSelfEnrollment);
      }
    }
  });

  it('accepts an empty enrollment body and rejects legacy invitations and extra fields', () => {
    expect(ZInternalCourseEnrollBody.safeParse({}).success).toBe(true);
    expect(ZInternalCourseEnrollBody.safeParse({ inviteToken: 'old-token' }).success).toBe(false);
    expect(ZInternalCourseEnrollBody.safeParse({ organizationId: 'other-org' }).success).toBe(false);
  });
});
