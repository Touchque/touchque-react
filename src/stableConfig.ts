import { useMemo, useRef } from 'react';
import type { TouchQueWebConfig } from '@touchque/web';

/**
 * The config the hooks build their `@touchque/web` client from. It is a new
 * object only when `baseUrl`, `credentials`, `paths`, `headers` or
 * `browserKey` change (compared by value; a key from `createBrowserKey()` by
 * identity), so a CSRF token that arrives after the first render reaches the
 * relay. `fetch` is read on every call instead: an inline function must not
 * rebuild the client, restart passkey autofill or cancel a running approval.
 */
export function useStableConfig(config: TouchQueWebConfig): TouchQueWebConfig {
  const fetchRef = useRef(config.fetch);
  fetchRef.current = config.fetch;
  const hasFetch = Boolean(config.fetch);
  return useMemo(
    () => ({
      ...config,
      // Called with the global `this`, like the SDK calls a fetch passed in directly.
      fetch: hasFetch
        ? (((input: RequestInfo | URL, init?: RequestInit) => fetchRef.current!.call(globalThis, input, init)) as typeof fetch)
        : undefined,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config.baseUrl,
      config.credentials,
      JSON.stringify(config.paths ?? {}),
      JSON.stringify(config.headers ?? {}),
      config.browserKey,
      hasFetch,
    ],
  );
}
