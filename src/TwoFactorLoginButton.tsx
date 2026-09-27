import { useTouchQueLogin } from './useTouchQueLogin';
import type { TouchQueWebConfig, ClassicLoginResult } from '@touchque/web';

export interface TwoFactorLoginButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onError' | 'children'> {
  /** `@touchque/web` config (`baseUrl`, `paths?`, `credentials?`, …). */
  config: TouchQueWebConfig;
  /** The account to send the push to (ignored when your server binds login to the password step). */
  externalUsername?: string;
  /** Called once the user approves on their device. */
  onSuccess?: (result: ClassicLoginResult) => void;
  /** Called on rejection, timeout, no-linked-device, or a network error. */
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}

/**
 * A button that sends a classic push sign-in and waits for the user's
 * response — the `<PasskeyButton>` equivalent for partners not using
 * WebAuthn. While pending the button is `disabled`, `data-loading` is set,
 * and when number matching is on it shows the number to pick on the phone
 * (BEFORE approval). Need your own layout? Use `useTouchQueLogin`.
 */
export function TwoFactorLoginButton({
  config,
  externalUsername,
  onSuccess,
  onError,
  children,
  disabled,
  onClick,
  ...buttonProps
}: TwoFactorLoginButtonProps) {
  const l = useTouchQueLogin(config);
  const busy = l.status === 'pending';

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    onClick?.(e);
    if (e.defaultPrevented || busy) return;
    try {
      const res = await l.login(externalUsername);
      onSuccess?.(res);
    } catch (err) {
      onError?.(err as Error);
    }
  };

  return (
    <button
      type="button"
      {...buttonProps}
      disabled={disabled || busy}
      data-loading={busy ? '' : undefined}
      onClick={handleClick}
    >
      {children ?? (busy
        ? (l.step?.number ? `Pick ${l.step.number} on your phone` : 'Check your phone…')
        : 'Sign in with push')}
    </button>
  );
}
