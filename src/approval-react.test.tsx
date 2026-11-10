import { describe, test, expect, vi } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { useTouchQueApproval, TouchQueApproval } from './index';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

function relay(script: Response[]) {
  const headers: Headers[] = [];
  const fetch = vi.fn(async (_input: RequestInfo | URL, init: RequestInit = {}) => {
    headers.push(new Headers(init.headers));
    const next = script.shift();
    if (!next) throw new Error('no more responses');
    return next;
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, headers };
}

function Pay({ fetch, onResult }: { fetch: typeof globalThis.fetch; onResult: (r: Response | Error) => void }) {
  const approval = useTouchQueApproval({ baseUrl: '/tq', fetch }, { pollIntervalMs: 1, approvedMs: 5 });
  return (
    <>
      <button onClick={() => approval.fetch('/api/pay', { method: 'POST' }).then(onResult, onResult)}>Pay</button>
      <TouchQueApproval approval={approval} />
    </>
  );
}

describe('<TouchQueApproval>', () => {
  test('shows the number while the phone approves, then closes', async () => {
    const r = relay([
      json({ touchque: { state: 'waiting', requestId: 'r1', number: '29' }, token: 't1' }, 202),
      json({ touchque: { state: 'waiting', requestId: 'r1', number: '29' }, token: 't2' }, 202),
      json({ ok: true }),
    ]);
    const results: Array<Response | Error> = [];
    render(<Pay fetch={r.fetch} onResult={(x) => results.push(x)} />);
    fireEvent.click(screen.getByText('Pay'));
    await screen.findByText('Check your phone');
    expect(screen.getByRole('img', { name: '2 9' })).toBeTruthy();
    expect(screen.getByText('Secured by TouchQue')).toBeTruthy();
    await waitFor(() => expect(results).toHaveLength(1));
    expect((results[0] as Response).ok).toBe(true);
    await waitFor(() => expect(screen.queryByText('Check your phone')).toBeNull());
  });

  test('a refusal shows the message and the case code until closed', async () => {
    const r = relay([json({ touchque: { state: 'blocked', reason: 'geo_policy', caseCode: 'K7P-2QX' } }, 403)]);
    render(<Pay fetch={r.fetch} onResult={() => { }} />);
    fireEvent.click(screen.getByText('Pay'));
    await screen.findByText('Not approved');
    expect(screen.getByRole('alert').textContent).toBe('Requests from your location are not allowed.Tell your support team: K7P-2QX');
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByText('Not approved')).toBeNull();
  });

  test('offline: QR, the number to tap and the typed code', async () => {
    const r = relay([
      json({ touchque: { state: 'waiting', requestId: 'r1' }, token: 't1' }, 202),
      json({ touchque: { state: 'offline', offline: { challengeId: 'o1', qrDataUrl: PNG, challengeCode: '61' } }, token: 't2' }, 202),
      json({ ok: true }),
    ]);
    function Slow() {
      const approval = useTouchQueApproval({ baseUrl: '/tq', fetch: r.fetch }, { pollIntervalMs: 60_000 });
      return (
        <>
          <button onClick={() => { approval.fetch('/api/pay').catch(() => { }); }}>Pay</button>
          <TouchQueApproval approval={approval} theme="dark" />
        </>
      );
    }
    render(<Slow />);
    fireEvent.click(screen.getByText('Pay'));
    await screen.findByText('Check your phone');
    fireEvent.click(screen.getByText('Verify offline'));
    await screen.findByAltText('Verify offline');
    expect(screen.getByRole('img', { name: '6 1' })).toBeTruthy();
    const input = screen.getByLabelText('Code from the app') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'abcdefg' } });
    expect(input.value).toBe('ABC-DEFG');
    await act(async () => { fireEvent.click(screen.getByText('Verify')); });
    await waitFor(() => expect(r.headers[2]?.get('x-touchque-code')).toBe('ABCDEFG'));
    expect(document.querySelector('dialog')!.getAttribute('data-theme')).toBe('dark');
  });
});
