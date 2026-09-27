import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTouchQueWeb,
  type TouchQueWebConfig,
  type ClassicLoginResult,
  type Step,
  type StepControls,
} from '@touchque/web';

export type ClassicLoginStatus = 'idle' | 'pending' | 'success' | 'error';

export interface UseTouchQueLogin {
  status: ClassicLoginStatus;
  error: Error | null;
  result: ClassicLoginResult | null;
  /**
   * The current step while pending — render it your way: `step.number`
   * (number matching: show it, the user picks it on the phone),
   * `step.enroll.qrCodeDataUrl` (first-time link), `step.offline.qrDataUrl`.
   */
  step: Step | null;
  /** Switch to offline approval / send the phone's code / stop waiting. */
  useOffline: () => void;
  submitCode: (code: string, type?: 'qr' | 'totp') => void;
  cancel: () => void;
  /** Starts the push sign-in and resolves once approved. */
  login: (externalUsername?: string) => Promise<ClassicLoginResult>;
  reset: () => void;
}

/** React hook over `@touchque/web`'s `classic2fa.login()` (two-phase: number shown before approval). */
export function useTouchQueLogin(config: TouchQueWebConfig): UseTouchQueLogin {
  const client = useMemo(
    () => createTouchQueWeb(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.baseUrl, config.credentials, JSON.stringify(config.paths ?? {})],
  );

  const [status, setStatus] = useState<ClassicLoginStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ClassicLoginResult | null>(null);
  const [step, setStep] = useState<Step | null>(null);
  const controls = useRef<StepControls | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const login = useCallback(
    async (externalUsername?: string) => {
      if (abort.current) throw new Error('A login is already in progress.');
      abort.current = new AbortController();
      setStatus('pending');
      setError(null);
      setStep(null);
      try {
        const res = await client.classic2fa.login({
          externalUsername,
          signal: abort.current.signal,
          onStep: (s, c) => { controls.current = c; setStep(s); },
        });
        setResult(res);
        setStatus('success');
        return res;
      } catch (e) {
        setError(e as Error);
        setStatus('error');
        throw e;
      } finally {
        abort.current = null;
        controls.current = null;
      }
    },
    [client],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    setStatus('idle');
    setError(null);
    setResult(null);
    setStep(null);
  }, []);

  return {
    status, error, result, step, login, reset,
    useOffline: () => controls.current?.useOffline(),
    submitCode: (code, type) => controls.current?.submitCode(code, type),
    cancel: () => controls.current?.cancel(),
  };
}
