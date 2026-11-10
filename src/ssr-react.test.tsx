// @vitest-environment node
import { describe, test, expect } from 'vitest';
// @ts-expect-error -- this package does not install @types/react-dom
import { renderToString } from 'react-dom/server';
import { HostedLoginProvider, RequireSignIn, useHostedLogin } from './index';

// Next.js and the like render the page on the server first: no window there.
function Status() {
  const { isLoading, isAuthenticated } = useHostedLogin();
  return <p>{isLoading ? 'Loading' : isAuthenticated ? 'Signed in' : 'Signed out'}</p>;
}

describe('server rendering', () => {
  test('<HostedLoginProvider> renders without a window', () => {
    expect(typeof window).toBe('undefined');
    const html = renderToString(
      <HostedLoginProvider domain="acme.login.touchque.com" clientId="c" redirectUri="https://app.example.com/callback">
        <Status />
        <RequireSignIn fallback={<span>Redirecting</span>}>Orders</RequireSignIn>
      </HostedLoginProvider>,
    );
    expect(html).toContain('Signed out');
    expect(html).toContain('Redirecting');
  });
});
