'use client';

import { useSyncExternalStore } from 'react';
import { safeCallbackPath } from './safe-redirect';

const subscribe = () => () => {};

/**
 * Read `?callbackUrl=` / `?registered=` on statically rendered auth pages without
 * a Suspense bailout: the server snapshot is empty, the client snapshot is the
 * real query string, and React reconciles the two without a hydration mismatch.
 */
export function useAuthRedirectParams(): { callbackUrl: string | null; registered: boolean } {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => '');
  const params = new URLSearchParams(search);
  return {
    callbackUrl: safeCallbackPath(params.get('callbackUrl')),
    registered: params.get('registered') === 'true',
  };
}
