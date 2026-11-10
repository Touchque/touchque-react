// The signed-in customer's own account settings inside your app, on the
// TouchQue Login My Account API (/me/v1).
//
//   <HostedLoginProvider …>
//     <UserProfile />                                   // profile, sign-in, devices, apps
//   </HostedLoginProvider>
//
//   const account = useMyAccount();                    // the API for your own screens
//
// Unstyled: every part has a data-touchque-account attribute and the root
// takes className. Security changes need a recent sign-in; when it is too
// old the component offers "Confirm it's you" (loginWithRedirect maxAge 0)
// and you come back to the same page. New passkeys are added on the hosted
// account page (a passkey belongs to the sign-in domain).

import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import { MyAccountError } from '@touchque/web';
import type { MyAccountClient, MyAccountMethods, MyAccountProfile, MyAccountSession, MyAccountApp } from '@touchque/web';
import { useHostedLogin } from './HostedLogin';

/** The My Account API client for the signed-in person (needs offline_access). */
export function useMyAccount(scope = 'read:me update:me manage:me:security'): MyAccountClient {
  const { client } = useHostedLogin();
  return useMemo(() => client.myAccount(scope), [client, scope]);
}

export type UserProfileSection = 'profile' | 'security' | 'devices' | 'apps';

const DEFAULT_LABELS = {
  profile: 'Profile',
  name: 'Full name',
  givenName: 'First name',
  familyName: 'Last name',
  save: 'Save',
  saved: 'Saved.',
  security: 'Sign-in and security',
  password: 'Password',
  passwordSet: 'Set',
  passwordNone: 'Not set',
  passkeys: 'Passkeys',
  noPasskeys: 'No passkeys yet.',
  addPasskey: 'Add a passkey',
  remove: 'Remove',
  touchqueApp: 'TouchQue app',
  linked: 'Linked',
  notLinked: 'Not linked',
  unlink: 'Unlink',
  emailCodes: 'Email codes',
  smsCodes: 'Text message codes',
  setUp: 'Set up',
  notSetUp: 'Not set up',
  turnOn: 'Turn on',
  turnOff: 'Turn off',
  linkedAccounts: 'Linked accounts',
  disconnect: 'Disconnect',
  devices: 'Devices',
  thisDevice: 'This device',
  signOut: 'Sign out',
  signOutOthers: 'Sign out of all other devices',
  apps: 'Apps with access',
  noApps: 'No apps have access.',
  removeAccess: 'Remove access',
  manageAll: 'All account settings',
  stepUp: 'To make this change, first confirm it is you.',
  confirmIt: 'Confirm it is you',
  failed: 'That did not work. Try again.',
  lastWayIn: 'This is your last way to sign in. Add another one first.',
  loading: 'Loading…',
};

export type UserProfileLabels = typeof DEFAULT_LABELS;

export interface UserProfileProps {
  /** Which parts to show, in this order. Default: all four. */
  sections?: UserProfileSection[];
  className?: string;
  /** Your own words (any language) for the default English ones. */
  labels?: Partial<UserProfileLabels>;
  /** Called after any change (to refresh your own UI). */
  onChange?: (what: string) => void;
}

interface Loaded {
  profile: MyAccountProfile;
  methods: MyAccountMethods;
  accountPageUrl: string;
  sessions: MyAccountSession[];
  apps: MyAccountApp[];
}

export function UserProfile({ sections = ['profile', 'security', 'devices', 'apps'], className, labels, onChange }: UserProfileProps) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const { loginWithRedirect } = useHostedLogin();
  const account = useMyAccount();
  const [data, setData] = useState<Loaded | null>(null);
  const [form, setForm] = useState({ name: '', givenName: '', familyName: '' });
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error' | 'step-up'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [main, devices, apps] = await Promise.all([account.get(), account.sessions(), account.apps()]);
    setData({ profile: main.profile, methods: main.authenticationMethods, accountPageUrl: main.accountPageUrl, sessions: devices.sessions, apps: apps.apps });
    setForm({ name: main.profile.name || '', givenName: main.profile.givenName || '', familyName: main.profile.familyName || '' });
  }, [account]);

  useEffect(() => {
    load().catch(() => setNotice({ kind: 'error', text: L.failed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const run = useCallback(async (what: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await fn();
      await load();
      if (done) setNotice({ kind: 'ok', text: done });
      onChange?.(what);
    } catch (err) {
      if (err instanceof MyAccountError && err.stepUp) setNotice({ kind: 'step-up', text: L.stepUp });
      else if (err instanceof MyAccountError && err.code === 'last_sign_in_method') setNotice({ kind: 'error', text: L.lastWayIn });
      else setNotice({ kind: 'error', text: L.failed });
    } finally {
      setBusy(false);
    }
  }, [load, onChange, L.stepUp, L.lastWayIn, L.failed]);

  if (!data) {
    return (
      <div className={className} data-touchque-account="loading">
        {notice ? <p role="alert" data-touchque-account="notice">{notice.text}</p> : <p>{L.loading}</p>}
      </div>
    );
  }
  const { profile, methods, sessions, apps } = data;

  const parts: Record<UserProfileSection, ReactNode> = {
    profile: (
      <section key="profile" data-touchque-account="profile">
        <h2>{L.profile}</h2>
        <form onSubmit={(e) => { e.preventDefault(); run('profile', () => account.updateProfile(form), L.saved); }}>
          {(['name', 'givenName', 'familyName'] as const).map((k) => (
            <label key={k} data-touchque-account="field">
              <span>{L[k]}</span>
              <input value={form[k]} maxLength={k === 'name' ? 200 : 100} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            </label>
          ))}
          <p data-touchque-account="email">{profile.email}</p>
          <button type="submit" disabled={busy}>{L.save}</button>
        </form>
      </section>
    ),
    security: (
      <section key="security" data-touchque-account="security">
        <h2>{L.security}</h2>
        <p data-touchque-account="password">{L.password}: {methods.password.set ? L.passwordSet : L.passwordNone}</p>
        <h3>{L.passkeys}</h3>
        {methods.passkeys.length ? (
          <ul data-touchque-account="passkeys">
            {methods.passkeys.map((k) => (
              <li key={k.id}>
                <span>{k.label || L.passkeys}</span>
                <button type="button" disabled={busy} onClick={() => run('passkey', () => account.removePasskey(k.id))}>{L.remove}</button>
              </li>
            ))}
          </ul>
        ) : <p>{L.noPasskeys}</p>}
        <a href={`${data.accountPageUrl}/security`} data-touchque-account="add-passkey">{L.addPasskey}</a>
        {(methods.touchqueApp.offered || methods.touchqueApp.linked) && (
          <p data-touchque-account="touchque-app">
            {L.touchqueApp}: {methods.touchqueApp.linked ? L.linked : L.notLinked}
            {methods.touchqueApp.linked && <button type="button" disabled={busy} onClick={() => run('touchque', () => account.unlinkTouchQueApp())}>{L.unlink}</button>}
          </p>
        )}
        {methods.emailCodes.offered && methods.emailCodes.available && (
          <p data-touchque-account="email-codes">
            {L.emailCodes}
            <button type="button" disabled={busy} onClick={() => run('email-codes', () => account.setEmailCodes(!methods.emailCodes.enabled))}>
              {methods.emailCodes.enabled ? L.turnOff : L.turnOn}
            </button>
          </p>
        )}
        {methods.smsCodes && (methods.smsCodes.offered || methods.smsCodes.enabled) && (
          <p data-touchque-account="sms-codes">
            {L.smsCodes}: {methods.smsCodes.enabled ? methods.smsCodes.phone : L.notSetUp}
            {methods.smsCodes.enabled
              ? <button type="button" disabled={busy} onClick={() => run('sms-codes', () => account.removeSmsCodes())}>{L.turnOff}</button>
              : <a href={`${data.accountPageUrl}/sms`}>{L.setUp}</a>}
          </p>
        )}
        {methods.identities.length > 0 && (
          <>
            <h3>{L.linkedAccounts}</h3>
            <ul data-touchque-account="identities">
              {methods.identities.map((i) => (
                <li key={i.id}>
                  <span>{i.provider}{i.email ? ` · ${i.email}` : ''}</span>
                  <button type="button" disabled={busy} onClick={() => run('identity', () => account.unlinkIdentity(i.id))}>{L.disconnect}</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    ),
    devices: (
      <section key="devices" data-touchque-account="devices">
        <h2>{L.devices}</h2>
        <ul>
          {sessions.map((s) => (
            <li key={s.id} data-current={s.current || undefined}>
              <span>{s.device || '—'}{s.current ? ` · ${L.thisDevice}` : ''}</span>
              {!s.current && <button type="button" disabled={busy} onClick={() => run('session', () => account.endSession(s.id))}>{L.signOut}</button>}
            </li>
          ))}
        </ul>
        {sessions.some((s) => !s.current) && <button type="button" disabled={busy} onClick={() => run('sessions', () => account.endOtherSessions())}>{L.signOutOthers}</button>}
      </section>
    ),
    apps: (
      <section key="apps" data-touchque-account="apps">
        <h2>{L.apps}</h2>
        {apps.length ? (
          <ul>
            {apps.map((a) => (
              <li key={a.clientId}>
                <span>{a.name}</span>
                <button type="button" disabled={busy} onClick={() => run('app', () => account.revokeApp(a.clientId))}>{L.removeAccess}</button>
              </li>
            ))}
          </ul>
        ) : <p>{L.noApps}</p>}
      </section>
    ),
  };

  return (
    <div className={className} data-touchque-account="root">
      {notice && (
        <div role={notice.kind === 'ok' ? 'status' : 'alert'} data-touchque-account="notice" data-kind={notice.kind}>
          <span>{notice.text}</span>
          {notice.kind === 'step-up' && (
            <button type="button" onClick={() => loginWithRedirect({ maxAge: 0, appState: { returnTo: window.location.pathname + window.location.search } })}>{L.confirmIt}</button>
          )}
        </div>
      )}
      {sections.map((s) => parts[s])}
      <a href={data.accountPageUrl} data-touchque-account="account-page">{L.manageAll}</a>
    </div>
  );
}
