'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BunnyUploadError, BunnyUploadPaused, createBunnyUpload, type BunnyUploadProgress, type BunnyUploadState } from '@/lib/bunny-upload';

type UploadContext = {
  courseId?: string;
  purpose: 'lesson' | 'preview' | 'short';
  /**
   * What the video will be attached to (e.g. `lesson:<id>`, `preview:<courseId>`).
   * While one upload for a target runs, another window cannot start a second one
   * for the same target (Web Locks; browsers without them keep the server checks).
   */
  target?: string;
};
type Controller = ReturnType<typeof createBunnyUpload>;

export { BunnyUploadPaused };

/** Keep the same upload operation until its ready video has been saved. */
export function useBunnyUpload(context: UploadContext) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [state, setState] = useState<BunnyUploadState | null>(null);
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState<BunnyUploadProgress | null>(null);
  const [uploadUserId, setUploadUserId] = useState<string>();
  const current = useRef<{ file: File; userId: string; courseId?: string; purpose: string; controller: Controller } | null>(null);
  const mounted = useRef(true);
  const activeUserId = useRef(userId);

  useEffect(() => {
    mounted.current = true;
    activeUserId.current = userId;
    return () => {
      mounted.current = false;
      void current.current?.controller.pause().catch(() => {});
    };
  }, [userId]);

  const reset = () => {
    current.current = null;
    if (mounted.current) {
      setState(null);
      setProgress(0);
      setDetail(null);
      setUploadUserId(undefined);
    }
  };

  const upload = async (file: File, title: string) => {
    if (!mounted.current) throw new BunnyUploadPaused();
    if (!userId) throw new BunnyUploadError('يرجى تسجيل الدخول قبل رفع الفيديو');
    const existing = current.current;
    if (!existing || existing.userId !== userId || existing.file !== file || existing.courseId !== context.courseId || existing.purpose !== context.purpose) {
      await existing?.controller.pause();
      if (!mounted.current || activeUserId.current !== userId) throw new BunnyUploadPaused();
      setState(null);
      setProgress(0);
      setDetail(null);
      setUploadUserId(userId);
      const controller = createBunnyUpload(file, title, {
        ...context,
        userId,
        onProgress: (value, info) => {
          if (mounted.current && current.current?.controller === controller) {
            setProgress(value);
            if (info) setDetail(info);
          }
        },
        onStateChange: (value: BunnyUploadState) => { if (mounted.current && current.current?.controller === controller) setState(value); },
      });
      current.current = { file, ...context, userId, controller };
    }
    const controller = current.current!.controller;
    if (context.target && typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(`kq:bunny-target:${userId}:${context.target}`, { ifAvailable: true }, lock => {
        if (!lock) throw new BunnyUploadError('يوجد رفع آخر جارٍ لهذا الفيديو في نافذة أخرى؛ أكمله هناك أو انتظر انتهاءه');
        return controller.start();
      });
    }
    return controller.start();
  };

  const complete = () => {
    current.current?.controller.complete();
    reset();
  };

  /** Stop and forget this upload (nothing is deleted at Bunny). */
  const cancel = async () => {
    await current.current?.controller.cancel().catch(() => {});
    reset();
  };

  const visibleState = uploadUserId === userId ? state : null;
  return {
    upload,
    complete,
    cancel,
    state: visibleState,
    progress: visibleState ? progress : 0,
    detail: visibleState ? detail : null,
    locked: visibleState !== null && visibleState !== 'Failed',
    pause: () => { void current.current?.controller.pause().catch(() => {}); },
  };
}
