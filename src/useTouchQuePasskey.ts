import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createTouchQueWeb,
  isPasskeySupported,
  PasskeyDismissedError,
  PasskeyNotRegisteredError,
  PasskeyDisabledError,
  type TouchQueWebConfig,
  type AuthenticateResult,
  type RegisterResult,
  type PasskeySummary,
} from '@touchque/web';

export type PasskeyStatus = 'idle' | 'pending' | 'success' | 'stepup' | 'pending2fa' | 'error';

export interface UseTouchQuePasskey {
  /** `true` if this browser exposes the WebAuthn API. */
  isSupported: boolean;
  /** Current state of the last `authenticate()` call. */
  status: PasskeyStatus;
  /** The last error, or `null`. */
  error: Error | null;
  /** The last `authenticate()` result, or `null`. */
  result: AuthenticateResult | null;
  /** Passwordless-primary sign-in. Updates `status` / `error` / `result`. */
  authenticate: (
    email: string,
    context?: Record<string, unknown>,
  ) => Promise<AuthenticateResult>;
  /** Register a passkey for the signed-in user. */
  register: (extra?: Record<string, unknown>) => Promise<RegisterResult>;
  /** List the signed-in user's passkeys. */
  list: () => Promise<PasskeySummary[]>;
  /** Remove one of the signed-in user's passkeys. */
  remove: (id: string) => Promise<{ deleted: boolean }>;
  /** Reset `status` / `error` / `result` to their initial values. */
  reset: () => void;
}

function classify(res: AuthenticateResult): PasskeyStatus {
  if (res.ok) return 'success';
  if (res.requiresStepUp) return 'stepup';
  if (res.pending2fa) return 'pending2fa';
  return 'error';
}

export { PasskeyDismissedError, PasskeyNotRegisteredError, PasskeyDisabledError };

/**
 * React hook over `@touchque/web`. Memoizes one client for the given config
 * and tracks the state of the passkey sign-in flow.
 *
 * ```tsx
 * const pk = useTouchQuePasskey({ baseUrl: 'https://api.example.com' });
 * <button disabled={!pk.isSupported} onClick={() => pk.authenticate(email)}>
 *   Sign in with a passkey
 * </button>
 * ```
 */
export function useTouchQuePasskey(config: TouchQueWebConfig): UseTouchQuePasskey {
  // Re-create the client only when the meaningful config fields change.
  const client = useMemo(
    () => createTouchQueWeb(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.baseUrl, config.credentials, JSON.stringify(config.paths ?? {})],
  );

  const [status, setStatus] = useState<PasskeyStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<AuthenticateResult | null>(null);
  const inFlight = useRef(false);

  const isSupported = useMemo(() => isPasskeySupported(), []);

  const authenticate = useCallback(
    async (email: string, context?: Record<string, unknown>) => {
      if (inFlight.current) throw new Error('A passkey sign-in is already in progress.');
      inFlight.current = true;
      setStatus('pending');
      setError(null);
      try {
        const res = await client.passkeys.authenticate({ email, context });
        setResult(res);
        setStatus(classify(res));
        return res;
      } catch (e) {
        setError(e as Error);
        setStatus('error');
        throw e;
      } finally {
        inFlight.current = false;
      }
    },
    [client],
  );

  const register = useCallback(
    (extra?: Record<string, unknown>) => client.passkeys.register(extra),
    [client],
  );
  const list = useCallback(() => client.passkeys.list(), [client]);
  const remove = useCallback((id: string) => client.passkeys.remove(id), [client]);

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
    setResult(null);
  }, []);

  return { isSupported, status, error, result, authenticate, register, list, remove, reset };
}
