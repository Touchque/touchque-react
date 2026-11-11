// Touchque Login in a React single-page app.
//
//   <HostedLoginProvider domain="acme.login.touchque.com" clientId="…" redirectUri={`${location.origin}/callback`}>
//     <App />
//   </HostedLoginProvider>
//
//   const { isLoading, isAuthenticated, user, loginWithRedirect, logout, getAccessToken } = useHostedLogin();
//
// The provider finishes the sign-in by itself when the page is the callback
// (code and state in the URL), removes them from the address bar and calls
// onRedirectCallback(appState) so you can route back.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode, createElement } from 'react';
import { HostedLoginClient } from '@touchque/web';
import type { HostedLoginClientOptions, HostedLoginUser, LoginWithRedirectOptions } from '@touchque/web';

export interface UseHostedLogin {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: HostedLoginUser | null;
  error: Error | null;
  loginWithRedirect: (opts?: LoginWithRedirectOptions) => Promise<void>;
  /** Opens the sign-up page. */
  signUpWithRedirect: (opts?: LoginWithRedirectOptions) => Promise<void>;
  logout: (opts?: { returnTo?: string }) => Promise<void>;
  getAccessToken: () => Promise<string>;
  client: HostedLoginClient;
}

const Ctx = createContext<UseHostedLogin | null>(null);

export interface HostedLoginProviderProps extends HostedLoginClientOptions {
  children?: ReactNode;
  /** After the callback: where to go (default: history.replaceState to the path without code/state). */
  onRedirectCallback?: (appState: unknown) => void;
  /** For tests: a ready client. */
  client?: HostedLoginClient;
}

export function HostedLoginProvider({ children, onRedirectCallback, client: given, ...options }: HostedLoginProviderProps) {
  const clientRef = useRef<HostedLoginClient | null>(null);
  if (!clientRef.current) clientRef.current = given || new HostedLoginClient(options);
  const client = clientRef.current;
  const [state, setState] = useState<{ isLoading: boolean; user: HostedLoginUser | null; error: Error | null }>({
    // No URL to read while rendering on the server (Next.js and the like).
    isLoading: typeof window !== 'undefined' && HostedLoginClient.isCallback(),
    user: client.isAuthenticated() ? client.getUser() : null,
    error: null,
  });
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !HostedLoginClient.isCallback()) return;
    handled.current = true;
    client.handleRedirectCallback()
      .then(({ appState, user }) => {
        setState({ isLoading: false, user, error: null });
        if (onRedirectCallback) onRedirectCallback(appState);
        else window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch((error: Error) => {
        setState({ isLoading: false, user: null, error });
        window.history.replaceState({}, document.title, window.location.pathname);
      });
  }, [client, onRedirectCallback]);

  const loginWithRedirect = useCallback((opts?: LoginWithRedirectOptions) => client.loginWithRedirect(opts), [client]);
  const signUpWithRedirect = useCallback((opts?: LoginWithRedirectOptions) => client.loginWithRedirect({ ...opts, screenHint: 'signup' }), [client]);
  const logout = useCallback((opts?: { returnTo?: string }) => client.logout(opts), [client]);
  const getAccessToken = useCallback(async () => {
    try {
      return await client.getAccessToken();
    } catch (err) {
      setState((s) => ({ ...s, user: client.getUser() }));
      throw err;
    }
  }, [client]);

  const value = useMemo<UseHostedLogin>(() => ({
    isLoading: state.isLoading,
    isAuthenticated: Boolean(state.user),
    user: state.user,
    error: state.error,
    loginWithRedirect,
    signUpWithRedirect,
    logout,
    getAccessToken,
    client,
  }), [state, loginWithRedirect, signUpWithRedirect, logout, getAccessToken, client]);

  return createElement(Ctx.Provider, { value }, children);
}

export function useHostedLogin(): UseHostedLogin {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHostedLogin must be used inside <HostedLoginProvider>');
  return v;
}

/** Renders children only for signed-in users; otherwise starts the sign-in. */
export function RequireSignIn({ children, fallback = null }: { children?: ReactNode; fallback?: ReactNode }) {
  const { isLoading, isAuthenticated, loginWithRedirect } = useHostedLogin();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) loginWithRedirect({ appState: { returnTo: window.location.pathname + window.location.search } });
  }, [isLoading, isAuthenticated, loginWithRedirect]);
  return createElement('div', { style: { display: 'contents' } }, isAuthenticated ? children : fallback);
}
