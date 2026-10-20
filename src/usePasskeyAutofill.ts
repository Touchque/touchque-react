import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTouchQueWeb,
  isPasskeyAutofillAvailable,
  shouldOfferPasskey,
  dismissPasskeyOffer,
  type AuthenticateResult,
  type RegisterResult,
  type Step,
  type TouchQueWebConfig,
} from '@touchque/web';

export interface UsePasskeyAutofillOptions {
  /** Called once the user picks a saved passkey from the field's autofill and it verified. */
  onResult: (result: AuthenticateResult) => void;
  /** A pick the server refused (an unknown passkey); the SDK opens autofill again by itself. */
  onError?: (error: Error) => void;
  /** Merged into both relay calls (OAuth fields, a redirect…). Read when autofill (re)starts. */
  context?: Record<string, unknown>;
  /**
   * Only while true. Default true. Set it false while your own passkey button
   * runs and back to true after: autofill starts again on that change, never
   * by itself after a failure.
   */
  enabled?: boolean;
}

export interface UsePasskeyAutofill {
  /** `true` once the browser is known to offer passkeys in autofill; `false` before and without. */
  supported: boolean;
  /** Spread on the email input: `<input {...autofill.inputProps} />`. */
  inputProps: { autoComplete: string };
}

/**
 * Passkey autofill (WebAuthn conditional mediation) on your email field:
 *
 * ```tsx
 * const autofill = usePasskeyAutofill({ baseUrl: '/touchque' }, { onResult: (r) => r.ok && goHome() });
 * <input type="email" name="email" {...autofill.inputProps} />
 * ```
 *
 * It never opens a modal; in a browser without passkey autofill nothing
 * happens. A "Sign in with a passkey" button (`useTouchQuePasskey`) still
 * works next to it: it takes over, and autofill starts again afterwards.
 */
export function usePasskeyAutofill(config: TouchQueWebConfig, options: UsePasskeyAutofillOptions): UsePasskeyAutofill {
  const client = useMemo(
    () => createTouchQueWeb(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.baseUrl, config.credentials, JSON.stringify(config.paths ?? {})],
  );
  const latest = useRef(options);
  latest.current = options;
  const enabled = options.enabled !== false;
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let live = true;
    void isPasskeyAutofillAvailable().then((ok) => { if (live) setSupported(ok); });
    return () => { live = false; };
  }, []);

  // One autofill run per enabled period. The SDK retries what may pass later,
  // backs off, waits while the tab is hidden and gives up after a few
  // failures; this hook never restarts it in a loop.
  useEffect(() => {
    if (!enabled || !supported) return undefined;
    const ac = new AbortController();
    client.passkeys.autofill({
      signal: ac.signal,
      context: latest.current.context,
      onError: (err) => { if (!ac.signal.aborted) latest.current.onError?.(err); },
    })
      .then((result) => {
        if (result && !ac.signal.aborted) latest.current.onResult(result);
      })
      .catch((err: Error) => {
        // The relay will not give options (refused, or failing past the retries): the form works without autofill.
        if (!ac.signal.aborted) latest.current.onError?.(err);
      });
    return () => ac.abort();
  }, [client, enabled, supported]);

  return { supported, inputProps: { autoComplete: 'username webauthn' } };
}

export type PasskeyUpgradeStatus = 'checking' | 'offer' | 'hidden' | 'pending' | 'done' | 'error';

export interface UsePasskeyUpgrade {
  /** `offer`: show "Add a passkey". `hidden`: don't (dismissed, one here already, no support). */
  status: PasskeyUpgradeStatus;
  /** The phone-approval step while a linked phone approves adding the passkey (show `step.number`). */
  step: Step | null;
  error: Error | null;
  /** Register a passkey for the signed-in user (needs a click: Safari asks for one). */
  upgrade: (label?: string) => Promise<RegisterResult>;
  /** "Not now": not offered again in this browser. */
  dismiss: () => void;
}

/**
 * Password → passkey: right after a password or email-link sign-in, offer to
 * add a passkey on this device, once per browser and user.
 *
 * ```tsx
 * const up = usePasskeyUpgrade({ baseUrl: '/touchque', credentials: 'include' }, user.email);
 * {up.status === 'offer' && <Banner onAdd={() => up.upgrade()} onLater={up.dismiss} />}
 * ```
 */
export function usePasskeyUpgrade(
  config: TouchQueWebConfig,
  user: string | null | undefined,
  options: { remindAfterDays?: number } = {},
): UsePasskeyUpgrade {
  const client = useMemo(
    () => createTouchQueWeb(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.baseUrl, config.credentials, JSON.stringify(config.paths ?? {})],
  );
  const [status, setStatus] = useState<PasskeyUpgradeStatus>('checking');
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let live = true;
    if (!user) { setStatus('hidden'); return undefined; }
    setStatus('checking');
    void shouldOfferPasskey({ user, remindAfterDays: options.remindAfterDays })
      .then((offer) => { if (live) setStatus(offer ? 'offer' : 'hidden'); });
    return () => { live = false; };
  }, [user, options.remindAfterDays]);

  const upgrade = useCallback(async (label?: string) => {
    if (!user) throw new Error('usePasskeyUpgrade: no signed-in user.');
    setStatus('pending');
    setError(null);
    try {
      const result = await client.passkeys.upgrade({ user, label, onStep: (s) => setStep(s) });
      setStatus('done');
      return result;
    } catch (err) {
      setError(err as Error);
      setStatus('error');
      throw err;
    } finally {
      setStep(null);
    }
  }, [client, user]);

  const dismiss = useCallback(() => {
    if (user) dismissPasskeyOffer(user);
    setStatus('hidden');
  }, [user]);

  return { status, step, error, upgrade, dismiss };
}
