import { describe, test, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MyAccountError } from '@touchque/web';
import { HostedLoginProvider, UserProfile } from './index';

function fakeAccount() {
  let name = 'Zoë Ng';
  return {
    get: vi.fn(async () => ({
      profile: { id: 'usr_1', email: 'zoe@acme.test', name, givenName: 'Zoë', familyName: 'Ng' },
      authenticationMethods: {
        password: { set: true }, passkeys: [{ id: 'pk1', label: 'My Mac' }], passkeysOffered: true,
        touchqueApp: { offered: true, linked: false }, emailCodes: { offered: true, enabled: false, available: true }, identities: [],
      },
      accountPageUrl: 'https://acme.login.touchque.com/account',
    })),
    sessions: vi.fn(async () => ({ sessions: [{ id: 's1', device: 'Chrome · macOS', current: true }, { id: 's2', device: 'Safari · iOS', current: false }] })),
    apps: vi.fn(async () => ({ apps: [] })),
    updateProfile: vi.fn(async (c: { name: string }) => { name = c.name; return {}; }),
    endSession: vi.fn(async () => undefined),
    removePasskey: vi.fn(async () => { throw new MyAccountError('insufficient_user_authentication', 401, 'A more recent sign-in is required', 600); }),
  };
}

function setup() {
  const account = fakeAccount();
  const client = {
    isAuthenticated: () => true,
    getUser: () => ({ sub: 'usr_1' }),
    handleRedirectCallback: vi.fn(),
    loginWithRedirect: vi.fn(async () => {}),
    logout: vi.fn(),
    getAccessToken: vi.fn(async () => 'at'),
    myAccount: vi.fn(() => account),
  };
  window.history.pushState({}, '', '/settings');
  render(<HostedLoginProvider domain="d" clientId="c" redirectUri="https://app/cb" client={client as never}><UserProfile /></HostedLoginProvider>);
  return { account, client };
}

describe('<UserProfile>', () => {
  test('shows the account, saves the profile and signs a device out', async () => {
    const { account } = setup();
    await waitFor(() => expect(screen.getByDisplayValue('Zoë Ng')).toBeTruthy());
    expect(screen.getByText('My Mac')).toBeTruthy();
    expect(screen.getByText('Add a passkey').getAttribute('href')).toBe('https://acme.login.touchque.com/account/security');
    fireEvent.change(screen.getByDisplayValue('Zoë Ng'), { target: { value: 'Zoë Lin' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByText('Saved.')).toBeTruthy());
    expect(account.updateProfile).toHaveBeenCalledWith({ name: 'Zoë Lin', givenName: 'Zoë', familyName: 'Ng' });
    fireEvent.click(screen.getByText('Sign out'));
    await waitFor(() => expect(account.endSession).toHaveBeenCalledWith('s2'));
  });

  test('an old sign-in offers "confirm it is you" and comes back here', async () => {
    const { client } = setup();
    await waitFor(() => expect(screen.getByText('My Mac')).toBeTruthy());
    fireEvent.click(screen.getByText('Remove'));
    await waitFor(() => expect(screen.getByText('To make this change, first confirm it is you.')).toBeTruthy());
    fireEvent.click(screen.getByText('Confirm it is you'));
    expect(client.loginWithRedirect).toHaveBeenCalledWith({ maxAge: 0, appState: { returnTo: '/settings' } });
  });
});
