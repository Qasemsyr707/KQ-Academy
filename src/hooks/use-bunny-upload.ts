'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BunnyUploadError, BunnyUploadPaused, createBunnyUpload, type BunnyUploadState } from '@/lib/bunny-upload';

type UploadContext = { courseId?: string; purpose: 'lesson' | 'preview' | 'short' };
type Controller = ReturnType<typeof createBunnyUpload>;

export { BunnyUploadPaused };

/** Keep the same upload operation until its ready video has been saved. */
export function useBunnyUpload(context: UploadContext) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [state, setState] = useState<BunnyUploadState | null>(null);
  const [progress, setProgress] = useState(0);
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

  const upload = async (file: File, title: string) => {
    if (!mounted.current) throw new BunnyUploadPaused();
    if (!userId) throw new BunnyUploadError('يرجى تسجيل الدخول قبل رفع الفيديو');
    const existing = current.current;
    if (!existing || existing.userId !== userId || existing.file !== file || existing.courseId !== context.courseId || existing.purpose !== context.purpose) {
      await existing?.controller.pause();
      if (!mounted.current || activeUserId.current !== userId) throw new BunnyUploadPaused();
      setState(null);
      setProgress(0);
      setUploadUserId(userId);
      const controller = createBunnyUpload(file, title, {
        ...context,
        userId,
        onProgress: (value: number) => { if (mounted.current && current.current?.controller === controller) setProgress(value); },
        onStateChange: (value: BunnyUploadState) => { if (mounted.current && current.current?.controller === controller) setState(value); },
      });
      current.current = { file, ...context, userId, controller };
    }
    return current.current!.controller.start();
  };

  const complete = () => {
    current.current?.controller.complete();
    current.current = null;
    if (mounted.current) {
      setState(null);
      setProgress(0);
      setUploadUserId(undefined);
    }
  };

  const visibleState = uploadUserId === userId ? state : null;
  return {
    upload,
    complete,
    state: visibleState,
    progress: visibleState ? progress : 0,
    locked: visibleState !== null && visibleState !== 'Failed',
    pause: () => { void current.current?.controller.pause().catch(() => {}); },
  };
}
