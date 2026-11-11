// <TouchqueLogin>: the sign-in corner of a header. Signed out it shows
// "Sign in" and "Create account"; signed in, the person's name with a menu
// (account settings on the hosted account page, sign out).
//
//   <HostedLoginProvider …>
//     <header><Logo /><TouchqueLogin /></header>
//   </HostedLoginProvider>
//
// Unstyled: every part has a data-touchque-login attribute and the root
// takes className. Pass `labels` for your own words.

import { useEffect, useRef, useState } from 'react';
import { useHostedLogin } from './HostedLogin';

const DEFAULT_LABELS = {
  signIn: 'Sign in',
  signUp: 'Create account',
  account: 'Account settings',
  signOut: 'Sign out',
  menu: 'Account menu',
};

export type TouchqueLoginLabels = typeof DEFAULT_LABELS;

export interface TouchqueLoginProps {
  className?: string;
  labels?: Partial<TouchqueLoginLabels>;
  /** Show "Create account" next to "Sign in". Default true. */
  showSignUp?: boolean;
  /** After signing out (a registered sign-out URL). */
  returnTo?: string;
  /** Handed back by onRedirectCallback after the sign-in (default: this page). */
  appState?: unknown;
}

function initials(name: string): string {
  const parts = name.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function TouchqueLogin({ className, labels, showSignUp = true, returnTo, appState }: TouchqueLoginProps) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const { isLoading, isAuthenticated, user, loginWithRedirect, signUpWithRedirect, logout, client } = useHostedLogin();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (isLoading) return <div className={className} data-touchque-login="loading" aria-busy="true" />;

  const state = appState ?? (typeof window !== 'undefined' ? { returnTo: window.location.pathname + window.location.search } : undefined);
  if (!isAuthenticated || !user) {
    return (
      <div className={className} data-touchque-login="signed-out">
        <button type="button" data-touchque-login="sign-in" onClick={() => loginWithRedirect({ appState: state })}>{L.signIn}</button>
        {showSignUp && <button type="button" data-touchque-login="sign-up" onClick={() => signUpWithRedirect({ appState: state })}>{L.signUp}</button>}
      </div>
    );
  }

  const name = String(user.name || user.email || user.sub);
  return (
    <div className={className} data-touchque-login="signed-in" ref={root}>
      <button type="button" data-touchque-login="user" aria-haspopup="menu" aria-expanded={open} aria-label={L.menu} onClick={() => setOpen(!open)}>
        {user.picture ? <img src={String(user.picture)} alt="" data-touchque-login="avatar" /> : <span data-touchque-login="avatar" aria-hidden="true">{initials(name)}</span>}
        <span data-touchque-login="name">{name}</span>
      </button>
      {open && (
        <div role="menu" data-touchque-login="menu">
          {user.email && user.name ? <div data-touchque-login="email">{String(user.email)}</div> : null}
          <a role="menuitem" href={client.accountUrl()} data-touchque-login="account">{L.account}</a>
          <button type="button" role="menuitem" data-touchque-login="sign-out" onClick={() => logout(returnTo ? { returnTo } : undefined)}>{L.signOut}</button>
        </div>
      )}
    </div>
  );
}
