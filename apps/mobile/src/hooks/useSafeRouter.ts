import React from 'react';
import { useRouter } from 'expo-router';

const DUPLICATE_PUSH_WINDOW_MS = 600;

/**
 * Wraps expo-router's useRouter() so a rapid double-tap on the same
 * onPress can't push two stack entries for the same destination — the
 * header back button would otherwise only pop the duplicate, making
 * Back look broken.
 */
export function useSafeRouter(): ReturnType<typeof useRouter> {
  const router = useRouter();
  const lastPushRef = React.useRef({ key: '', time: 0 });

  return React.useMemo(() => ({
    ...router,
    push: ((href: Parameters<typeof router.push>[0], options?: Parameters<typeof router.push>[1]) => {
      const key = typeof href === 'string' ? href : JSON.stringify(href);
      const now = Date.now();
      if (key === lastPushRef.current.key && now - lastPushRef.current.time < DUPLICATE_PUSH_WINDOW_MS) {
        return;
      }
      lastPushRef.current = { key, time: now };
      router.push(href, options);
    }) as typeof router.push,
  }), [router]);
}
