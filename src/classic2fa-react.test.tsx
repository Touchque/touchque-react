import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook, act } from '@testing-library/react';

const h = vi.hoisted(() => {
  class EnrollmentTimeoutError extends Error {}
  class EnrollmentCancelledError extends Error {}
  return {
    enroll: vi.fn(),
    status: vi.fn(),
    waitForLink: vi.fn(),
    login: vi.fn(),
    createTouchQueWeb: vi.fn(),
    EnrollmentTimeoutError,
    EnrollmentCancelledError,
  };
});
const { EnrollmentTimeoutError, EnrollmentCancelledError } = h;

vi.mock('@touchque/web', () => {
  h.createTouchQueWeb.mockImplementation(() => ({
    classic2fa: { enroll: h.enroll, status: h.status, waitForLink: h.waitForLink, login: h.login },
  }));
  return {
    createTouchQueWeb: h.createTouchQueWeb,
    EnrollmentTimeoutError: h.EnrollmentTimeoutError,
    EnrollmentCancelledError: h.EnrollmentCancelledError,
  };
});

import { useTouchQueEnroll } from './useTouchQueEnroll';
import { TwoFactorEnroll } from './TwoFactorEnroll';
import { useTouchQueLogin } from './useTouchQueLogin';
import { TwoFactorLoginButton } from './TwoFactorLoginButton';

const CONFIG = { baseUrl: 'https://api.example.com' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTouchQueEnroll', () => {
  test('enroll() walks starting -> waiting -> linked', async () => {
    h.enroll.mockResolvedValue({ secret: 'S1', qrCodeDataUrl: 'data:image/png;base64,x' });
    h.waitForLink.mockResolvedValue({ linked: true, used: true, deviceId: 'dev_1' });

    const { result } = renderHook(() => useTouchQueEnroll(CONFIG));
    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.enroll();
    });

    expect(result.current.status).toBe('linked');
    expect(result.current.qrCodeDataUrl).toBe('data:image/png;base64,x');
    expect(result.current.linkStatus).toEqual({ linked: true, used: true, deviceId: 'dev_1' });
  });

  test('a timeout sets status to error with the EnrollmentTimeoutError', async () => {
    h.enroll.mockResolvedValue({ secret: 'S1', qrCodeDataUrl: 'x' });
    h.waitForLink.mockRejectedValue(new EnrollmentTimeoutError('timed out'));

    const { result } = renderHook(() => useTouchQueEnroll(CONFIG));
    await act(async () => {
      await result.current.enroll();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBeInstanceOf(EnrollmentTimeoutError);
  });

  test('cancel() sets status back to idle without surfacing an error', async () => {
    h.enroll.mockResolvedValue({ secret: 'S1', qrCodeDataUrl: 'x' });
    let rejectWaitForLink: (e: unknown) => void;
    h.waitForLink.mockReturnValue(new Promise((_resolve, reject) => { rejectWaitForLink = reject; }));

    const { result } = renderHook(() => useTouchQueEnroll(CONFIG));
    let enrollPromise: Promise<void>;
    act(() => {
      enrollPromise = result.current.enroll();
    });
    await waitFor(() => expect(result.current.status).toBe('waiting'));

    act(() => {
      result.current.cancel();
    });
    expect(result.current.status).toBe('idle');

    // The in-flight waitForLink rejecting with a cancellation after cancel()
    // must not flip status back to 'error'.
    await act(async () => {
      rejectWaitForLink(new EnrollmentCancelledError());
      await enrollPromise;
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });
});

describe('<TwoFactorEnroll>', () => {
  test('renders the QR code while waiting, then "linked" once done', async () => {
    h.enroll.mockResolvedValue({ secret: 'S1', qrCodeDataUrl: 'data:image/png;base64,x' });
    h.waitForLink.mockResolvedValue({ linked: true, used: true, deviceId: 'dev_1' });
    const onLinked = vi.fn();

    render(<TwoFactorEnroll config={CONFIG} onLinked={onLinked} />);
    await act(async () => {
      screen.getByText('Set up 2FA').click();
    });

    await waitFor(() => expect(screen.getByText('2FA linked ✓')).toBeTruthy());
    expect(onLinked).toHaveBeenCalledWith({ linked: true, used: true, deviceId: 'dev_1' });
  });

  test('autoStart triggers enroll() on mount without a click', async () => {
    h.enroll.mockResolvedValue({ secret: 'S1', qrCodeDataUrl: 'x' });
    h.waitForLink.mockReturnValue(new Promise(() => {})); // stays pending — just proving enroll() fired

    render(<TwoFactorEnroll config={CONFIG} autoStart />);
    await waitFor(() => expect(h.enroll).toHaveBeenCalledTimes(1));
  });
});

describe('useTouchQueLogin / <TwoFactorLoginButton>', () => {
  test('login() resolves and reports success', async () => {
    h.login.mockResolvedValue({ status: 'success', requestId: 'req_1', challengeCode: '42' });
    const { result } = renderHook(() => useTouchQueLogin(CONFIG));

    await act(async () => {
      await result.current.login('user@example.com');
    });

    expect(result.current.status).toBe('success');
    expect(h.login).toHaveBeenCalledWith(expect.objectContaining({ externalUsername: 'user@example.com', onStep: expect.any(Function) }));
  });

  test('<TwoFactorLoginButton> calls onSuccess/onError and disables itself while pending', async () => {
    let resolveLogin: (v: unknown) => void;
    h.login.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    const onSuccess = vi.fn();

    render(<TwoFactorLoginButton config={CONFIG} externalUsername="user@example.com" onSuccess={onSuccess} />);
    const button = screen.getByRole('button') as HTMLButtonElement;
    await act(async () => {
      button.click();
    });

    await waitFor(() => expect(button.disabled).toBe(true));

    await act(async () => {
      resolveLogin({ status: 'success', requestId: 'req_1' });
    });
    expect(onSuccess).toHaveBeenCalledWith({ status: 'success', requestId: 'req_1' });
  });
});

describe('number matching in React', () => {
  test('<TwoFactorLoginButton> shows the number to pick BEFORE approval', async () => {
    let approve!: () => void;
    h.login.mockImplementation(({ onStep }: any) => new Promise((resolve) => {
      onStep({ state: 'waiting', requestId: 'r1', number: '47' }, {});
      approve = () => resolve({ status: 'success', requestId: 'r1' });
    }));
    const onSuccess = vi.fn();
    render(<TwoFactorLoginButton config={CONFIG} onSuccess={onSuccess} />);
    screen.getByRole('button').click();
    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('Pick 47 on your phone'));
    expect(onSuccess).not.toHaveBeenCalled();
    await act(async () => { approve(); });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  test('<TwoFactorEnroll> shows the recovery codes with the QR', async () => {
    h.enroll.mockResolvedValue({ secret: 'S1', qrCodeDataUrl: 'data:image/png;base64,x', recoveryCodes: ['AAAA-1111', 'BBBB-2222'] });
    h.waitForLink.mockImplementation(() => new Promise(() => {}));
    render(<TwoFactorEnroll config={CONFIG} autoStart />);
    await waitFor(() => expect(screen.getByText('AAAA-1111')).toBeTruthy());
    expect(screen.getByText('BBBB-2222')).toBeTruthy();
  });
});

