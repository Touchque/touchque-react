import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HostedLoginProvider, useHostedLogin } from './index';

// A stand-in client: the real one is tested in @touchque/web.
function fakeClient({ signedIn = false } = {}) {
  let user = signedIn ? { sub: 'usr_1', email: 'a@acme.test' } : null;
  return {
    isAuthenticated: () => Boolean(user),
    getUser: () => user,
    handleRedirectCallback: vi.fn(async () => { user = { sub: 'usr_1', email: 'a@acme.test' }; return { appState: { returnTo: '/orders' }, user }; }),
    loginWithRedirect: vi.fn(async () => {}),
    logout: vi.fn(async () => { user = null; }),
    getAccessToken: vi.fn(async () => 'at-1'),
  };
}

function Profile() {
  const { isLoading, isAuthenticated, user, loginWithRedirect, signUpWithRedirect } = useHostedLogin();
  if (isLoading) return <p>Loading</p>;
  if (!isAuthenticated) return (<><button onClick={() => loginWithRedirect()}>Sign in</button><button onClick={() => signUpWithRedirect()}>Sign up</button></>);
  return <p>Hello {user?.email}</p>;
}

describe('<HostedLoginProvider>', () => {
  test('signed out: sign-in and sign-up buttons start the redirect', () => {
    const client = fakeClient();
    render(<HostedLoginProvider domain="d" clientId="c" redirectUri="https://app/cb" client={client as never}><Profile /></HostedLoginProvider>);
    fireEvent.click(screen.getByText('Sign in'));
    fireEvent.click(screen.getByText('Sign up'));
    expect(client.loginWithRedirect).toHaveBeenNthCalledWith(1, undefined);
    expect(client.loginWithRedirect).toHaveBeenNthCalledWith(2, { screenHint: 'signup' });
  });

  test('on the callback URL it finishes the sign-in and hands back the app state', async () => {
    window.history.pushState({}, '', '/callback?code=abc&state=xyz');
    const client = fakeClient();
    const onRedirectCallback = vi.fn();
    render(<HostedLoginProvider domain="d" clientId="c" redirectUri="https://app/cb" client={client as never} onRedirectCallback={onRedirectCallback}><Profile /></HostedLoginProvider>);
    expect(screen.getByText('Loading')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('Hello a@acme.test')).toBeTruthy());
    expect(onRedirectCallback).toHaveBeenCalledWith({ returnTo: '/orders' });
    window.history.pushState({}, '', '/');
  });
});
