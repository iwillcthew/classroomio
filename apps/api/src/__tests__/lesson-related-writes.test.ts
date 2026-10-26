import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createLessons: vi.fn(),
  updateLesson: vi.fn(),
  touchCourseUpdatedAt: vi.fn(),
  transaction: vi.fn()
}));

vi.mock('@cio/db/drizzle', () => ({ db: { transaction: mocks.transaction } }));
vi.mock('@cio/db/queries/lesson', () => ({
  createLessons: mocks.createLessons,
  updateLesson: mocks.updateLesson
}));
vi.mock('@cio/db/queries/course', () => ({ touchCourseUpdatedAt: mocks.touchCourseUpdatedAt }));
vi.mock('@cio/core/services/course/slug', () => ({ resolveItemSlug: vi.fn().mockResolvedValue('intro') }));
vi.mock('@cio/core/services/course/root-order', () => ({ claimItemOrder: vi.fn().mockResolvedValue(1) }));

import { createLesson, updateLessonService } from '@cio/core/services/lesson/lesson';
import type { LessonWriteOptions } from '@cio/core/services/lesson/lesson';
import type { TLesson, TNewLesson } from '@cio/db/types';

type LessonTransaction = { lesson: Partial<TLesson> | null; usageCount: number };

describe('lesson and related writes commit together', () => {
  let persisted: LessonTransaction;

  beforeEach(() => {
    vi.clearAllMocks();
    persisted = { lesson: { id: 'lesson-1', title: 'Original', courseId: 'course-1' }, usageCount: 1 };
    mocks.transaction.mockImplementation(async (work: (client: LessonTransaction) => Promise<unknown>) => {
      const client = structuredClone(persisted);
      const result = await work(client);
      persisted = client;
      return result;
    });
    mocks.createLessons.mockImplementation(async ([lesson]: TNewLesson[], client: LessonTransaction) => {
      client.lesson = { ...lesson, id: 'lesson-1' };
      return [client.lesson];
    });
    mocks.updateLesson.mockImplementation(
      async (_lessonId: string, data: Partial<TLesson>, client: LessonTransaction) => {
        client.lesson = { ...client.lesson, ...data };
        return client.lesson;
      }
    );
  });

  const failRelatedWrite: NonNullable<LessonWriteOptions['persistRelated']> = async (_lesson, client) => {
    const transaction = client as unknown as LessonTransaction;
    transaction.usageCount = 0;
    throw new Error('Asset usage failed');
  };

  it('rolls back lesson creation when recording an asset usage fails', async () => {
    persisted.lesson = null;

    await expect(
      createLesson('course-1', { title: 'Intro', courseId: 'course-1', order: 1 }, { persistRelated: failRelatedWrite })
    ).rejects.toThrow('Asset usage failed');

    expect(persisted).toEqual({ lesson: null, usageCount: 1 });
    expect(mocks.touchCourseUpdatedAt).not.toHaveBeenCalled();
  });

  it('keeps the previous lesson and usages when replacement fails', async () => {
    await expect(
      updateLessonService('lesson-1', { title: 'Updated' }, { persistRelated: failRelatedWrite })
    ).rejects.toThrow('Asset usage failed');

    expect(persisted.lesson?.title).toBe('Original');
    expect(persisted.usageCount).toBe(1);
    expect(mocks.touchCourseUpdatedAt).not.toHaveBeenCalled();
  });

  it('commits the updated lesson and usages on the same client', async () => {
    const persistRelated: NonNullable<LessonWriteOptions['persistRelated']> = async (lesson, client) => {
      const transaction = client as unknown as LessonTransaction;
      expect(lesson).toBe(transaction.lesson);
      transaction.usageCount = 2;
    };

    await updateLessonService('lesson-1', { title: 'Updated' }, { persistRelated });

    expect(persisted.lesson?.title).toBe('Updated');
    expect(persisted.usageCount).toBe(2);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.touchCourseUpdatedAt).toHaveBeenCalledWith('course-1');
  });
});
