import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTouchqueWeb,
  type TouchqueWebConfig,
  type ClassicLoginResult,
  type Step,
  type StepControls,
} from '@touchque/web';
import { useStableConfig } from './stableConfig';

export type ClassicLoginStatus = 'idle' | 'pending' | 'success' | 'error';

export interface UseTouchqueLogin {
  status: ClassicLoginStatus;
  error: Error | null;
  result: ClassicLoginResult | null;
  /**
   * The current step while pending — render it your way: `step.number`
   * (number matching: show it, the user picks it on the phone),
   * `step.enroll.qrCodeDataUrl` (first-time link), `step.offline.qrDataUrl` (+ `step.offline.challengeCode` to print under it).
   */
  step: Step | null;
  /**
   * "Why?": the case code of the current step or of the refusal (`K7P-2QX`),
   * or null. Show it: "Tell your support team: K7P-2QX".
   */
  caseCode: string | null;
  /** Switch to offline approval / send the phone's code / stop waiting. */
  useOffline: () => void;
  submitCode: (code: string, type?: 'qr' | 'totp') => void;
  cancel: () => void;
  /** Starts the push sign-in and resolves once approved. */
  login: (externalUsername?: string) => Promise<ClassicLoginResult>;
  reset: () => void;
}

/** React hook over `@touchque/web`'s `classic2fa.login()` (two-phase: number shown before approval). */
export function useTouchqueLogin(config: TouchqueWebConfig): UseTouchqueLogin {
  const stable = useStableConfig(config);
  const client = useMemo(() => createTouchqueWeb(stable), [stable]);

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
      const ac = new AbortController();
      abort.current = ac;
      setStatus('pending');
      setError(null);
      setStep(null);
      try {
        const res = await client.classic2fa.login({
          externalUsername,
          signal: ac.signal,
          onStep: (s, c) => { if (abort.current !== ac) return; controls.current = c; setStep(s); },
        });
        if (abort.current === ac) {
          setResult(res);
          setStatus('success');
        }
        return res;
      } catch (e) {
        // A login that reset() ended must not overwrite the state after it.
        if (abort.current === ac) {
          setError(e as Error);
          setStatus('error');
        }
        throw e;
      } finally {
        if (abort.current === ac) {
          abort.current = null;
          controls.current = null;
        }
      }
    },
    [client],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    controls.current = null;
    setStatus('idle');
    setError(null);
    setResult(null);
    setStep(null);
  }, []);

  const caseCode = step?.caseCode || (error as { caseCode?: string } | null)?.caseCode || null;
  return {
    status, error, result, step, caseCode, login, reset,
    useOffline: () => controls.current?.useOffline(),
    submitCode: (code, type) => controls.current?.submitCode(code, type),
    cancel: () => controls.current?.cancel(),
  };
}
