import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createTouchQueWeb, type TouchQueWebConfig, type Step, type StepControls } from '@touchque/web';

export type ActionStatus = 'idle' | 'pending' | 'done' | 'error';

export interface UseTouchQueAction {
  status: ActionStatus;
  /** The step to render while pending (number, enrollment QR, offline QR, refusal). */
  step: Step | null;
  error: Error | null;
  /**
   * fetch() for a route protected with requireTouchQue. Resolves with your
   * route's own Response once the user approved (or the final refusal).
   */
  run: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  useOffline: () => void;
  submitCode: (code: string, type?: 'qr' | 'totp') => void;
  cancel: () => void;
}

/**
 * Step-up for any protected action, rendered in YOUR components:
 *
 * ```tsx
 * const a = useTouchQueAction({ baseUrl: '/touchque', credentials: 'include' });
 * const pay = () => a.run('/api/transfer', { method: 'POST', body: JSON.stringify({ amount }) });
 * {a.step?.state === 'waiting' && <p>Approve on your phone {a.step.number && <b>{a.step.number}</b>}</p>}
 * {a.step?.state === 'enroll' && <img src={a.step.enroll!.qrCodeDataUrl} alt="Scan with TouchQue" />}
 * ```
 * `baseUrl` is where touchqueRouter is mounted (used for passkey approval).
 */
export function useTouchQueAction(config: TouchQueWebConfig): UseTouchQueAction {
  const client = useMemo(
    () => createTouchQueWeb(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.baseUrl, config.credentials, JSON.stringify(config.paths ?? {})],
  );
  const [status, setStatus] = useState<ActionStatus>('idle');
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const controls = useRef<StepControls | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const run = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setStatus('pending');
    setStep(null);
    setError(null);
    try {
      const res = await client.fetch(input, init, {
        signal: ac.signal,
        onStep: (s, c) => { controls.current = c; setStep(s); },
      });
      setStatus(res.ok ? 'done' : 'error');
      return res;
    } catch (e) {
      setError(e as Error);
      setStatus('error');
      throw e;
    } finally {
      if (abort.current === ac) abort.current = null;
      controls.current = null;
    }
  }, [client]);

  return {
    status, step, error, run,
    useOffline: () => controls.current?.useOffline(),
    submitCode: (code, type) => controls.current?.submitCode(code, type),
    cancel: () => controls.current?.cancel(),
  };
}
