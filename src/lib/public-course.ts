import type { Prisma } from '@prisma/client';

// Allowlisted public profiles must never include credentials, contact details,
// wallets, referral data, moderation state, or future private User columns.
export const publicInstructorSelect = { name: true, image: true, bio: true } as const;
export const publicReviewerSelect = { name: true, image: true } as const;

export const publicCourseDetailsSelect = {
  id: true, title: true, description: true, type: true, price: true, priceSYP: true,
  category: true, thumbnail: true, previewVideoUrl: true, includes: true,
  rating: true, isFeatured: true, status: true, createdAt: true, updatedAt: true,
  instructorId: true,
  instructor: { select: publicInstructorSelect },
  reviews: {
    select: {
      id: true, rating: true, comment: true, createdAt: true,
      user: { select: publicReviewerSelect },
    },
    orderBy: { createdAt: 'desc' },
  },
  chapters: {
    select: {
      id: true, title: true, order: true, isFree: true,
      lessons: {
        select: { id: true, title: true, order: true, isLive: true, videoUrl: true },
      },
    },
    orderBy: { order: 'asc' },
  },
} as const satisfies Prisma.CourseSelect;

export const mobileCourseSelect = {
  ...publicCourseDetailsSelect,
  reviews: false,
  instructor: { select: { id: true, name: true, image: true } },
  chapters: {
    select: {
      ...publicCourseDetailsSelect.chapters.select,
      quizzes: { select: { id: true, title: true, type: true, passingScore: true, totalMarks: true } },
    },
  },
} as const satisfies Prisma.CourseSelect;
