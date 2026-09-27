import { useTouchQuePasskey } from './useTouchQuePasskey';
import type { TouchQueWebConfig, AuthenticateResult } from '@touchque/web';

export interface PasskeyButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onError' | 'children'> {
  /** `@touchque/web` config (`baseUrl`, `paths?`, `credentials?`, …). */
  config: TouchQueWebConfig;
  /** The account to sign in. */
  email: string;
  /** Called when the passkey assertion signed the user in. */
  onSuccess?: (result: AuthenticateResult) => void;
  /** Called when risk/policy wants a second factor (push / number match). */
  onStepUp?: (result: AuthenticateResult) => void;
  /** Called when the relay wants the caller to continue a pending 2FA flow. */
  onPending2fa?: (result: AuthenticateResult) => void;
  /** Called on any error (dismissed prompt, no passkey, disabled, network). */
  onError?: (error: Error) => void;
  /** Hide the button entirely when WebAuthn is unavailable. Default: false. */
  hideWhenUnsupported?: boolean;
  children?: React.ReactNode;
}

/**
 * A button that runs the passwordless-primary passkey sign-in and routes the
 * outcome to `onSuccess` / `onStepUp` / `onPending2fa` / `onError`. While the
 * ceremony is running the button is `disabled` and `data-loading` is set.
 */
export function PasskeyButton({
  config,
  email,
  onSuccess,
  onStepUp,
  onPending2fa,
  onError,
  hideWhenUnsupported = false,
  children,
  disabled,
  onClick,
  ...buttonProps
}: PasskeyButtonProps) {
  const pk = useTouchQuePasskey(config);

  if (hideWhenUnsupported && !pk.isSupported) return null;

  const busy = pk.status === 'pending';

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    onClick?.(e);
    if (e.defaultPrevented || busy) return;
    try {
      const res = await pk.authenticate(email);
      if (res.ok) onSuccess?.(res);
      else if (res.requiresStepUp) onStepUp?.(res);
      else if (res.pending2fa) onPending2fa?.(res);
      else onError?.(new Error('Passkey sign-in did not complete.'));
    } catch (err) {
      onError?.(err as Error);
    }
  };

  return (
    <button
      type="button"
      {...buttonProps}
      disabled={disabled || busy || !pk.isSupported}
      data-loading={busy ? '' : undefined}
      onClick={handleClick}
    >
      {children ?? 'Sign in with a passkey'}
    </button>
  );
}
