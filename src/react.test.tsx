import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';
// @ts-expect-error -- this package does not install @types/react-dom
import { renderToString } from 'react-dom/server';

const h = vi.hoisted(() => {
  class PasskeyDismissedError extends Error {}
  class PasskeyNotRegisteredError extends Error {}
  class PasskeyDisabledError extends Error {}
  return {
    authenticate: vi.fn(),
    register: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    isPasskeySupported: vi.fn(() => true),
    createTouchqueWeb: vi.fn(),
    PasskeyDismissedError,
    PasskeyNotRegisteredError,
    PasskeyDisabledError,
  };
});
const { PasskeyDismissedError, PasskeyNotRegisteredError, PasskeyDisabledError } = h;

vi.mock('@touchque/web', () => {
  h.createTouchqueWeb.mockImplementation(() => ({
    passkeys: { authenticate: h.authenticate, register: h.register, list: h.list, remove: h.remove },
  }));
  return {
    createTouchqueWeb: h.createTouchqueWeb,
    isPasskeySupported: h.isPasskeySupported,
    PasskeyDismissedError: h.PasskeyDismissedError,
    PasskeyNotRegisteredError: h.PasskeyNotRegisteredError,
    PasskeyDisabledError: h.PasskeyDisabledError,
  };
});

import { useTouchquePasskey } from './useTouchquePasskey';
import { PasskeyButton } from './PasskeyButton';

const CONFIG = { baseUrl: 'https://api.example.com' };

beforeEach(() => {
  vi.clearAllMocks();
  h.isPasskeySupported.mockReturnValue(true);
});

describe('useTouchquePasskey', () => {
  test('starts idle and reports isSupported', () => {
    const { result } = renderHook(() => useTouchquePasskey(CONFIG));
    expect(result.current.status).toBe('idle');
    expect(result.current.isSupported).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('authenticate() drives status idle -> pending -> success', async () => {
    let resolveAuth: (v: unknown) => void = () => {};
    h.authenticate.mockReturnValue(new Promise((r) => { resolveAuth = r; }));
    const { result } = renderHook(() => useTouchquePasskey(CONFIG));

    let p: Promise<unknown>;
    act(() => { p = result.current.authenticate('u@x.com'); });
    await waitFor(() => expect(result.current.status).toBe('pending'));

    await act(async () => {
      resolveAuth({ ok: true, requiresStepUp: false, pending2fa: false, raw: { status: 'success' } });
      await p;
    });
    expect(result.current.status).toBe('success');
    expect(result.current.result?.ok).toBe(true);
  });

  test('authenticate() classifies requiresStepUp as "stepup"', async () => {
    h.authenticate.mockResolvedValue({ ok: false, requiresStepUp: true, pending2fa: false, raw: {} });
    const { result } = renderHook(() => useTouchquePasskey(CONFIG));
    await act(async () => { await result.current.authenticate('u@x.com'); });
    expect(result.current.status).toBe('stepup');
  });

  test('authenticate() sets status "error" and stores the error on rejection', async () => {
    h.authenticate.mockRejectedValue(new PasskeyNotRegisteredError('none'));
    const { result } = renderHook(() => useTouchquePasskey(CONFIG));
    await act(async () => {
      await expect(result.current.authenticate('u@x.com')).rejects.toBeInstanceOf(PasskeyNotRegisteredError);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeInstanceOf(PasskeyNotRegisteredError);
  });

  test('reset() returns to idle', async () => {
    h.authenticate.mockResolvedValue({ ok: true, requiresStepUp: false, pending2fa: false, raw: {} });
    const { result } = renderHook(() => useTouchquePasskey(CONFIG));
    await act(async () => { await result.current.authenticate('u@x.com'); });
    expect(result.current.status).toBe('success');
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  test('register / list / remove delegate to the client', async () => {
    h.register.mockResolvedValue({ verified: true, credentialId: 'c' });
    h.list.mockResolvedValue([{ id: 'c1' }]);
    h.remove.mockResolvedValue({ deleted: true });
    const { result } = renderHook(() => useTouchquePasskey(CONFIG));

    await act(async () => {
      await result.current.register({ label: 'L' });
      await result.current.list();
      await result.current.remove('c1');
    });
    expect(h.register).toHaveBeenCalledWith({ label: 'L' }, undefined);
    expect(h.list).toHaveBeenCalled();
    expect(h.remove).toHaveBeenCalledWith('c1');
  });

  // PASSKEY_ENROLL is number matched: the phone step has to reach the page.
  test('register passes the phone-approval options (onStep) through', async () => {
    h.register.mockResolvedValue({ verified: true, credentialId: 'c' });
    const onStep = vi.fn();
    const { result } = renderHook(() => useTouchquePasskey(CONFIG));
    await act(async () => { await result.current.register({ label: 'L' }, { onStep, pollIntervalMs: 500 }); });
    expect(h.register).toHaveBeenCalledWith({ label: 'L' }, { onStep, pollIntervalMs: 500 });
  });
});

describe('<PasskeyButton>', () => {
  test('renders default label and is disabled while unsupported', () => {
    h.isPasskeySupported.mockReturnValue(false);
    render(<PasskeyButton config={CONFIG} email="u@x.com" />);
    const btn = screen.getByRole('button');
    expect(btn.textContent).toBe('Sign in with a passkey');
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  test('hideWhenUnsupported renders nothing when unsupported', () => {
    h.isPasskeySupported.mockReturnValue(false);
    const { container } = render(<PasskeyButton config={CONFIG} email="u@x.com" hideWhenUnsupported />);
    expect(container.innerHTML).toBe('');
  });

  test('click -> authenticate -> onSuccess', async () => {
    h.authenticate.mockResolvedValue({ ok: true, requiresStepUp: false, pending2fa: false, raw: { status: 'success' } });
    const onSuccess = vi.fn();
    const onStepUp = vi.fn();
    render(<PasskeyButton config={CONFIG} email="u@x.com" onSuccess={onSuccess} onStepUp={onStepUp} />);

    await act(async () => { screen.getByRole('button').click(); });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(h.authenticate).toHaveBeenCalledWith({ email: 'u@x.com', context: undefined });
    expect(onStepUp).not.toHaveBeenCalled();
  });

  test('routes requiresStepUp to onStepUp', async () => {
    h.authenticate.mockResolvedValue({ ok: false, requiresStepUp: true, pending2fa: false, raw: {} });
    const onSuccess = vi.fn();
    const onStepUp = vi.fn();
    render(<PasskeyButton config={CONFIG} email="u@x.com" onSuccess={onSuccess} onStepUp={onStepUp} />);

    await act(async () => { screen.getByRole('button').click(); });

    await waitFor(() => expect(onStepUp).toHaveBeenCalledTimes(1));
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('routes a thrown error to onError', async () => {
    h.authenticate.mockRejectedValue(new PasskeyDismissedError('dismissed'));
    const onError = vi.fn();
    render(<PasskeyButton config={CONFIG} email="u@x.com" onError={onError} />);

    await act(async () => { screen.getByRole('button').click(); });

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0][0]).toBeInstanceOf(PasskeyDismissedError);
  });
});

describe('<PasskeyButton> after server rendering', () => {
  // The server has no WebAuthn; the browser that hydrates the page does.
  function hydrate(element: React.ReactElement) {
    h.isPasskeySupported.mockReturnValue(false);
    const container = document.body.appendChild(document.createElement('div'));
    container.innerHTML = renderToString(element);
    h.isPasskeySupported.mockReturnValue(true);
    const onRecoverableError = vi.fn();
    render(element, { container, hydrate: true, onRecoverableError });
    return { container, onRecoverableError };
  }

  test('becomes clickable once hydrated in a browser with passkeys', () => {
    const { container } = hydrate(<PasskeyButton config={CONFIG} email="u@x.com" />);
    expect(container.querySelector('button')!.disabled).toBe(false);
  });

  test('hideWhenUnsupported hydrates without a mismatch, then shows the button', () => {
    const { container, onRecoverableError } = hydrate(<PasskeyButton config={CONFIG} email="u@x.com" hideWhenUnsupported />);
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.querySelector('button')).not.toBeNull();
  });
});

describe('client config', () => {
  test('headers or browserKey that change after the first render rebuild the client', () => {
    const { rerender } = renderHook(
      ({ csrf, browserKey }) => useTouchquePasskey({ baseUrl: '/tq', headers: { 'X-CSRF-Token': csrf }, browserKey }),
      { initialProps: { csrf: '', browserKey: false } },
    );
    expect(h.createTouchqueWeb).toHaveBeenCalledTimes(1);

    rerender({ csrf: 'tok-1', browserKey: false });
    expect(h.createTouchqueWeb).toHaveBeenCalledTimes(2);
    expect(h.createTouchqueWeb.mock.lastCall![0].headers).toEqual({ 'X-CSRF-Token': 'tok-1' });

    // Same values in a new object: the client stays.
    rerender({ csrf: 'tok-1', browserKey: false });
    expect(h.createTouchqueWeb).toHaveBeenCalledTimes(2);

    rerender({ csrf: 'tok-1', browserKey: true });
    expect(h.createTouchqueWeb).toHaveBeenCalledTimes(3);
    expect(h.createTouchqueWeb.mock.lastCall![0].browserKey).toBe(true);
  });

  test('an inline fetch does not rebuild the client, and the latest one is called', async () => {
    const first = vi.fn(async () => new Response('1'));
    const second = vi.fn(async () => new Response('2'));
    const { rerender } = renderHook(
      ({ f }) => useTouchquePasskey({ baseUrl: '/tq', fetch: (input, init) => f(input, init) }),
      { initialProps: { f: first as typeof fetch } },
    );
    rerender({ f: second as typeof fetch });
    expect(h.createTouchqueWeb).toHaveBeenCalledTimes(1);

    await h.createTouchqueWeb.mock.calls[0][0].fetch('/tq/passkey/options');
    expect(second).toHaveBeenCalledWith('/tq/passkey/options', undefined);
    expect(first).not.toHaveBeenCalled();
  });
});
