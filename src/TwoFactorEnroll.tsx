import { useEffect, useRef } from 'react';
import { useTouchQueEnroll } from './useTouchQueEnroll';
import type { TouchQueWebConfig, LinkStatus } from '@touchque/web';

export interface TwoFactorEnrollProps {
  /** `@touchque/web` config (`baseUrl`, `paths?`, `credentials?`, …). */
  config: TouchQueWebConfig;
  /** How long to poll before giving up. Default: 120000 (2 minutes). */
  timeoutMs?: number;
  pollIntervalMs?: number;
  /** Called once the device links. */
  onLinked?: (status: LinkStatus) => void;
  /** Called on a timeout or a relay/network error. */
  onError?: (error: Error) => void;
  /** Auto-start enrollment on mount instead of waiting for a click. Default: false. */
  autoStart?: boolean;
  /** Rendered `<img>` size in pixels. Default: 200. */
  qrSize?: number;
  className?: string;
}

/**
 * Drop-in classic push/number-match 2FA enrollment: shows a "Set up 2FA"
 * button, then the QR code, then polls until the mobile app links —
 * replacing the hand-rolled state machine partners previously wrote
 * themselves (fetch + `<img>` assignment + `setInterval` + cleanup).
 *
 * ```tsx
 * <TwoFactorEnroll config={{ baseUrl: 'https://api.example.com' }} onLinked={() => refetchUser()} />
 * ```
 */
export function TwoFactorEnroll({
  config,
  timeoutMs,
  pollIntervalMs,
  onLinked,
  onError,
  autoStart = false,
  qrSize = 200,
  className,
}: TwoFactorEnrollProps) {
  const e = useTouchQueEnroll(config, { timeoutMs, pollIntervalMs });

  // Auto-start once, on mount only.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStarted.current) {
      autoStarted.current = true;
      void e.enroll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Fire the callbacks exactly once per transition into their terminal state.
  const notifiedRef = useRef<typeof e.status | null>(null);
  useEffect(() => {
    if (notifiedRef.current === e.status) return;
    notifiedRef.current = e.status;
    if (e.status === 'linked' && e.linkStatus) onLinked?.(e.linkStatus);
    if (e.status === 'error' && e.error) onError?.(e.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e.status]);

  if (e.status === 'linked') {
    return (
      <div className={className} data-touchque-enroll-status="linked">
        <p>2FA linked ✓</p>
      </div>
    );
  }

  if (e.status === 'starting' || e.status === 'waiting') {
    return (
      <div className={className} data-touchque-enroll-status={e.status}>
        {e.qrCodeDataUrl && (
          <img src={e.qrCodeDataUrl} width={qrSize} height={qrSize} alt="Scan with the TouchQue app" />
        )}
        <p>Scan this QR code with your TouchQue app…</p>
        {e.recoveryCodes && e.recoveryCodes.length > 0 && (
          <div data-touchque-recovery-codes="">
            <p>Save these recovery codes. Each works once if you lose your phone:</p>
            <ul>{e.recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}</ul>
          </div>
        )}
        <button type="button" onClick={e.cancel}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={className} data-touchque-enroll-status={e.status}>
      {e.status === 'error' && e.error && <p role="alert">{e.error.message}</p>}
      <button type="button" onClick={() => void e.enroll()}>
        Set up 2FA
      </button>
    </div>
  );
}
