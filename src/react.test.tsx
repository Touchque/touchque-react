import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';

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
    createTouchQueWeb: vi.fn(),
    PasskeyDismissedError,
    PasskeyNotRegisteredError,
    PasskeyDisabledError,
  };
});
const { PasskeyDismissedError, PasskeyNotRegisteredError, PasskeyDisabledError } = h;

vi.mock('@touchque/web', () => {
  h.createTouchQueWeb.mockImplementation(() => ({
    passkeys: { authenticate: h.authenticate, register: h.register, list: h.list, remove: h.remove },
  }));
  return {
    createTouchQueWeb: h.createTouchQueWeb,
    isPasskeySupported: h.isPasskeySupported,
    PasskeyDismissedError: h.PasskeyDismissedError,
    PasskeyNotRegisteredError: h.PasskeyNotRegisteredError,
    PasskeyDisabledError: h.PasskeyDisabledError,
  };
});

import { useTouchQuePasskey } from './useTouchQuePasskey';
import { PasskeyButton } from './PasskeyButton';

const CONFIG = { baseUrl: 'https://api.example.com' };

beforeEach(() => {
  vi.clearAllMocks();
  h.isPasskeySupported.mockReturnValue(true);
});

describe('useTouchQuePasskey', () => {
  test('starts idle and reports isSupported', () => {
    const { result } = renderHook(() => useTouchQuePasskey(CONFIG));
    expect(result.current.status).toBe('idle');
    expect(result.current.isSupported).toBe(true);
    expect(result.current.error).toBeNull();
  });

  test('authenticate() drives status idle -> pending -> success', async () => {
    let resolveAuth: (v: unknown) => void = () => {};
    h.authenticate.mockReturnValue(new Promise((r) => { resolveAuth = r; }));
    const { result } = renderHook(() => useTouchQuePasskey(CONFIG));

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
    const { result } = renderHook(() => useTouchQuePasskey(CONFIG));
    await act(async () => { await result.current.authenticate('u@x.com'); });
    expect(result.current.status).toBe('stepup');
  });

  test('authenticate() sets status "error" and stores the error on rejection', async () => {
    h.authenticate.mockRejectedValue(new PasskeyNotRegisteredError('none'));
    const { result } = renderHook(() => useTouchQuePasskey(CONFIG));
    await act(async () => {
      await expect(result.current.authenticate('u@x.com')).rejects.toBeInstanceOf(PasskeyNotRegisteredError);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeInstanceOf(PasskeyNotRegisteredError);
  });

  test('reset() returns to idle', async () => {
    h.authenticate.mockResolvedValue({ ok: true, requiresStepUp: false, pending2fa: false, raw: {} });
    const { result } = renderHook(() => useTouchQuePasskey(CONFIG));
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
    const { result } = renderHook(() => useTouchQuePasskey(CONFIG));

    await act(async () => {
      await result.current.register({ label: 'L' });
      await result.current.list();
      await result.current.remove('c1');
    });
    expect(h.register).toHaveBeenCalledWith({ label: 'L' });
    expect(h.list).toHaveBeenCalled();
    expect(h.remove).toHaveBeenCalledWith('c1');
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
