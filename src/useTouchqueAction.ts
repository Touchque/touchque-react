import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createTouchqueWeb, type TouchqueWebConfig, type Step, type StepControls } from '@touchque/web';
import { useStableConfig } from './stableConfig';

export type ActionStatus = 'idle' | 'pending' | 'done' | 'error';

export interface UseTouchqueAction {
  status: ActionStatus;
  /** The step to render while pending (number, enrollment QR, offline QR, refusal). */
  step: Step | null;
  error: Error | null;
  /**
   * fetch() for a route protected with requireTouchque. Resolves with your
   * route's own Response once the user approved, or with the final refusal
   * (4xx), or with a final 202 step (`enroll` with reason `enrollment_off`: no
   * phone linked). `status` is `'error'` for both of those.
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
 * const a = useTouchqueAction({ baseUrl: '/touchque', credentials: 'include' });
 * const pay = () => a.run('/api/transfer', { method: 'POST', body: JSON.stringify({ amount }) });
 * {a.step?.state === 'waiting' && <p>Approve on your phone {a.step.number && <b>{a.step.number}</b>}</p>}
 * {a.step?.enroll && <img src={a.step.enroll.qrCodeDataUrl} alt="Scan with Touchque" />}
 * {a.step?.reason === 'enrollment_off' && <p>No phone is linked to this account yet. Link the Touchque app first.</p>}
 * ```
 * `baseUrl` is where touchqueRouter is mounted (used for passkey approval).
 */
/** A 202 whose JSON body is a Touchque step, not your route's own 202 Accepted. */
const carriesStep = (res: Response): Promise<boolean> =>
  res.clone().json().then((b) => typeof b?.touchque?.state === 'string', () => false);

export function useTouchqueAction(config: TouchqueWebConfig): UseTouchqueAction {
  const stable = useStableConfig(config);
  const client = useMemo(() => createTouchqueWeb(stable), [stable]);
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
        onStep: (s, c) => { if (abort.current !== ac) return; controls.current = c; setStep(s); },
      });
      // A final 202 that carries a step (enrollment_off) ended the wait without your route's answer.
      const failed = !res.ok || (res.status === 202 && await carriesStep(res));
      if (abort.current === ac) setStatus(failed ? 'error' : 'done');
      return res;
    } catch (e) {
      // A run that a newer run() aborted must not overwrite the newer run's state.
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
  }, [client]);

  return {
    status, step, error, run,
    useOffline: () => controls.current?.useOffline(),
    submitCode: (code, type) => controls.current?.submitCode(code, type),
    cancel: () => controls.current?.cancel(),
  };
}
