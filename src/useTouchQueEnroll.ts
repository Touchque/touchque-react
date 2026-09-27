import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTouchQueWeb,
  EnrollmentTimeoutError,
  type TouchQueWebConfig,
  type LinkStatus,
} from '@touchque/web';

export type EnrollStatus = 'idle' | 'starting' | 'waiting' | 'linked' | 'error';

export interface UseTouchQueEnroll {
  status: EnrollStatus;
  error: Error | null;
  /** Ready-to-render QR code, set once `enroll()` starts. */
  qrCodeDataUrl: string | null;
  /** One-time recovery codes issued with this QR — show them to the user once. */
  recoveryCodes: string[] | null;
  /** The device info once linked (`{ linked, used, deviceId }`). */
  linkStatus: LinkStatus | null;
  /**
   * Starts (or rotates) enrollment, shows the QR, then polls until the
   * device links or the timeout elapses. Safe to call again after an
   * error/cancel to retry.
   */
  enroll: () => Promise<void>;
  /** Stop polling early (e.g. the user navigated away or hit Cancel). */
  cancel: () => void;
  reset: () => void;
}

export { EnrollmentTimeoutError };

/**
 * React hook over `@touchque/web`'s `classic2fa` — the QR-render + poll +
 * cleanup state machine every partner used to hand-roll themselves.
 *
 * ```tsx
 * const e = useTouchQueEnroll({ baseUrl: 'https://api.example.com' });
 * <button onClick={e.enroll}>Set up 2FA</button>
 * {e.status === 'waiting' && <img src={e.qrCodeDataUrl!} />}
 * {e.status === 'linked' && <p>Linked ✓</p>}
 * ```
 */
export function useTouchQueEnroll(
  config: TouchQueWebConfig,
  options: { timeoutMs?: number; pollIntervalMs?: number } = {},
): UseTouchQueEnroll {
  const client = useMemo(
    () => createTouchQueWeb(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.baseUrl, config.credentials, JSON.stringify(config.paths ?? {})],
  );

  const [status, setStatus] = useState<EnrollStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [linkStatus, setLinkStatus] = useState<LinkStatus | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Stop polling when the component using this hook unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
  }, []);

  const enroll = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('starting');
    setError(null);
    setLinkStatus(null);
    try {
      const started = await client.classic2fa.enroll();
      setQrCodeDataUrl(started.qrCodeDataUrl);
      setRecoveryCodes(Array.isArray(started.recoveryCodes) ? (started.recoveryCodes as string[]) : null);
      setStatus('waiting');

      const linked = await client.classic2fa.waitForLink({
        timeoutMs: options.timeoutMs,
        pollIntervalMs: options.pollIntervalMs,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return; // cancelled mid-flight — ignore the result
      setLinkStatus(linked);
      setStatus('linked');
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e as Error);
      setStatus('error');
    }
  }, [client, options.timeoutMs, options.pollIntervalMs]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setError(null);
    setQrCodeDataUrl(null);
    setRecoveryCodes(null);
    setLinkStatus(null);
  }, []);

  return { status, error, qrCodeDataUrl, recoveryCodes, linkStatus, enroll, cancel, reset };
}
