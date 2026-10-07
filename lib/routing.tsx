import { useMemo } from 'react';
import { NavigateFunction, Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';

export { Outlet };

let navigateImpl: NavigateFunction | null = null;

export function setNavigate(fn: NavigateFunction) {
  navigateImpl = fn;
}

function canGoBack(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const state = window.history.state as { idx?: number } | null;
  return (state?.idx ?? 0) > 0;
}

/**
 * Module-level navigation, for use outside components (mirrors expo-router's `router` export).
 * Backed by the navigate function registered by RootLayout via setNavigate().
 */
export const router = {
  push(href: string) {
    navigateImpl?.(href);
  },
  replace(href: string) {
    navigateImpl?.(href, { replace: true });
  },
  back() {
    navigateImpl?.(-1);
  },
  canGoBack,
};

export function useRouter() {
  const navigate = useNavigate();
  // Memoized so effects that depend on the returned object (e.g. a
  // redirect-on-mount effect) don't re-run on every render — without this,
  // a fresh object identity every render makes `router` in a dependency
  // array indistinguishable from "always changed".
  return useMemo(
    () => ({
      push: (href: string) => navigate(href),
      replace: (href: string) => navigate(href, { replace: true }),
      back: () => navigate(-1),
      canGoBack,
    }),
    [navigate]
  );
}

/**
 * Merges path params (e.g. :id) and query string params into one object,
 * mirroring expo-router's useLocalSearchParams().
 */
export function useLocalSearchParams<
  T extends Record<string, string | undefined> = Record<string, string | undefined>
>(): Partial<T> {
  const params = useParams();
  const [searchParams] = useSearchParams();
  return { ...params, ...Object.fromEntries(searchParams.entries()) } as Partial<T>;
}
