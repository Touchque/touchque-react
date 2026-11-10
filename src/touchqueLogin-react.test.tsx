import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HostedLoginProvider, TouchQueLogin } from './index';

function fakeClient(user: Record<string, unknown> | null) {
  return {
    isAuthenticated: () => Boolean(user),
    getUser: () => user,
    handleRedirectCallback: vi.fn(),
    loginWithRedirect: vi.fn(async () => {}),
    logout: vi.fn(async () => {}),
    getAccessToken: vi.fn(async () => 'at'),
    accountUrl: () => 'https://acme.login.touchque.com/account',
  };
}

const mount = (client: ReturnType<typeof fakeClient>, props = {}) => render(
  <HostedLoginProvider domain="d" clientId="c" redirectUri="https://app/cb" client={client as never}><TouchQueLogin {...props} /></HostedLoginProvider>,
);

describe('<TouchQueLogin>', () => {
  test('signed out: sign in and create account', () => {
    window.history.pushState({}, '', '/pricing');
    const client = fakeClient(null);
    mount(client);
    fireEvent.click(screen.getByText('Sign in'));
    fireEvent.click(screen.getByText('Create account'));
    expect(client.loginWithRedirect).toHaveBeenNthCalledWith(1, { appState: { returnTo: '/pricing' } });
    expect(client.loginWithRedirect).toHaveBeenNthCalledWith(2, { appState: { returnTo: '/pricing' }, screenHint: 'signup' });
  });

  test('signed in: a menu with account settings and sign out', () => {
    const client = fakeClient({ sub: 'usr_1', name: 'Zoe Ng', email: 'zoe@acme.test' });
    mount(client, { returnTo: 'https://app/', labels: { signOut: 'Log out' } });
    const button = screen.getByRole('button', { name: 'Account menu' });
    expect(button.textContent).toContain('ZN');
    fireEvent.click(button);
    expect(screen.getByText('Account settings').getAttribute('href')).toBe('https://acme.login.touchque.com/account');
    fireEvent.click(screen.getByText('Log out'));
    expect(client.logout).toHaveBeenCalledWith({ returnTo: 'https://app/' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Account settings')).toBeNull();
  });
});
