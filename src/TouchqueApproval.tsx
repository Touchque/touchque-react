import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  createApproval,
  approvalAttribution,
  approvalTimeLeft,
  isPngDataUrl,
  formatOfflineCodeInput,
  APPROVAL_STYLES,
  APPROVAL_ICONS,
  type ApprovalController,
  type ApprovalOptions,
  type ApprovalState,
  type ApprovalTexts,
  type ClassicLoginResult,
  type TouchqueWebConfig,
} from '@touchque/web';
import { useStableConfig } from './stableConfig';

export interface UseTouchqueApproval extends ApprovalState {
  /** fetch() for a guarded route; the dialog shows while the user approves. Closing it rejects with an AbortError. */
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  /** Classic push sign-in through your relay (`classic2fa.login`), in the dialog. */
  login: (input?: { externalUsername?: string }) => Promise<ClassicLoginResult>;
  useOffline: () => void;
  submitCode: (code: string, type?: 'qr' | 'totp') => void;
  setCodeType: (type: 'qr' | 'totp') => void;
  /** `qr` (scan and type the 7-character code) or `totp` (the 6-digit time-based code). */
  codeMode: 'qr' | 'totp';
  continueWithPasskey: () => Promise<void>;
  cancel: () => void;
  close: () => void;
  texts: ApprovalTexts;
  /** The headless controller from `@touchque/web`. */
  controller: ApprovalController;
}

/**
 * The drop-in approval dialog's state. Pair it with `<TouchqueApproval>`:
 *
 * ```tsx
 * const approval = useTouchqueApproval({ baseUrl: '/touchque', credentials: 'include' });
 * <button onClick={() => approval.fetch('/api/transfer', { method: 'POST', body })}>Send</button>
 * <TouchqueApproval approval={approval} />
 * ```
 *
 * Or render the state yourself. `options` (texts, poll interval, telemetry)
 * are read once, when the config's baseUrl, credentials, paths, headers or
 * browserKey change.
 */
export function useTouchqueApproval(config: TouchqueWebConfig, options?: ApprovalOptions): UseTouchqueApproval {
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const stable = useStableConfig(config);
  const controller = useMemo(
    () => createApproval(stable, optionsRef.current),
    [stable],
  );
  const state = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  useEffect(() => () => controller.cancel(), [controller]);
  return {
    ...state,
    fetch: controller.fetch,
    login: controller.login,
    useOffline: controller.useOffline,
    submitCode: controller.submitCode,
    setCodeType: controller.setCodeType,
    codeMode: controller.codeMode,
    continueWithPasskey: controller.continueWithPasskey,
    cancel: controller.cancel,
    close: controller.close,
    texts: controller.texts,
    controller,
  };
}

export interface TouchqueApprovalProps {
  /** From `useTouchqueApproval()`. */
  approval: UseTouchqueApproval;
  /** `light` (default), `dark`, or `auto` (follows the system). */
  theme?: 'light' | 'dark' | 'auto';
  /** Extra class on the <dialog> (set the `--tq-approval-*` variables there). */
  className?: string;
  style?: React.CSSProperties;
}

function Icon({ name, tone }: { name: keyof typeof APPROVAL_ICONS; tone?: 'ok' | 'danger' }) {
  // Constant markup from @touchque/web, never user data.
  return <div className="tq-icon" data-tone={tone} dangerouslySetInnerHTML={{ __html: APPROVAL_ICONS[name] }} />;
}

function Digits({ value, small }: { value: string; small?: boolean }) {
  return (
    <div className="tq-digits" data-size={small ? 'small' : undefined} role="img" aria-label={value.split('').join(' ')}>
      {value.split('').map((d, i) => <span key={i} className="tq-digit">{d}</span>)}
    </div>
  );
}

function CaseLine({ texts, code }: { texts: ApprovalTexts; code: string | null | undefined }) {
  if (!code) return null;
  const [before, after = ''] = texts.supportCode('\u0000').split('\u0000');
  return <span className="tq-case">{before}<code>{code}</code>{after}</span>;
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

/**
 * The drop-in approval dialog: the push wait with the number to pick, the
 * first-time link QR, the offline QR and code, the passkey step, and refusals
 * with their case code. Same look and texts as `<touchque-approval>`.
 */
export function TouchqueApproval({ approval: a, theme = 'light', className, style }: TouchqueApprovalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const t = a.texts;
  const open = a.phase !== 'closed';
  const now = useNow(a.phase === 'waiting');
  const [code, setCode] = useState('');
  const screen = a.phase === 'offline' ? `offline:${a.codeMode}` : a.phase;
  useEffect(() => { setCode(''); }, [screen]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
    }
  }, [open]);

  const closeLabel = a.phase === 'error' || a.phase === 'approved' ? t.close : t.cancel;
  const x = (
    <button type="button" className="tq-x" aria-label={closeLabel} onClick={a.close} dangerouslySetInnerHTML={{ __html: APPROVAL_ICONS.x }} />
  );
  const cancel = <button type="button" className="tq-btn" data-variant="quiet" onClick={a.cancel}>{t.cancel}</button>;
  const title = (text: string, status?: boolean) => <h2 id={titleId} className="tq-title" role={status ? 'status' : undefined}>{text}</h2>;

  let body: React.ReactNode = null;
  if (a.phase === 'waiting') {
    const left = approvalTimeLeft(a.expiresAt, now);
    body = (
      <>
        {x}<Icon name="phone" />{title(t.waitingTitle)}
        <p className="tq-text">{t.waitingBody}</p>
        {a.number && <div className="tq-panel"><p className="tq-label">{t.numberLabel}</p><Digits value={a.number} /></div>}
        <p className="tq-status" role="status">
          <span className="tq-spinner" />{t.waitingStatus}<span className="tq-time">{left ? t.expiresIn(left) : ''}</span>
        </p>
        {a.reasons.length > 0 && (
          <details className="tq-why">
            <summary>{t.whyTitle}</summary>
            <ul>{a.reasons.map((r) => <li key={r.code}>{r.text || r.code}</li>)}</ul>
          </details>
        )}
        <div className="tq-row">
          {t.noNotification}
          <button type="button" className="tq-link" disabled={a.busy} onClick={a.useOffline}>{t.useOffline}</button>
        </div>
        {cancel}
      </>
    );
  } else if (a.phase === 'enroll') {
    body = (
      <>
        {x}<Icon name="qr" />{title(t.enrollTitle)}
        <p className="tq-text">{t.enrollBody}</p>
        <div className="tq-panel">
          {a.enroll && isPngDataUrl(a.enroll.qrCodeDataUrl) && <img className="tq-qr" src={a.enroll.qrCodeDataUrl} alt={t.enrollTitle} width={200} height={200} />}
        </div>
        {a.enroll && a.enroll.recoveryCodes.length > 0 && (
          <>
            <p className="tq-small">{t.recoveryCodes}</p>
            <ul className="tq-codes">{a.enroll.recoveryCodes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
          </>
        )}
        {cancel}
      </>
    );
  } else if (a.phase === 'offline') {
    const totp = a.codeMode === 'totp';
    const inputId = `${titleId}-code`;
    const qr = a.offline?.qrDataUrl;
    body = (
      <>
        {x}<Icon name="qr" />{title(t.offlineTitle)}
        <p className="tq-text">{totp ? t.totpLabel : t.offlineBody}</p>
        {!totp && (
          <div className="tq-panel">
            {qr && isPngDataUrl(qr) && <img className="tq-qr" src={qr} alt={t.offlineTitle} width={200} height={200} />}
            {a.offline?.challengeCode && <><p className="tq-label">{t.offlineNumber}</p><Digits value={a.offline.challengeCode} small /></>}
          </div>
        )}
        <form noValidate onSubmit={(e) => { e.preventDefault(); a.submitCode(code, totp ? 'totp' : 'qr'); }}>
          <div className="tq-field">
            <label htmlFor={inputId}>{totp ? t.totpLabel : t.codeLabel}</label>
            <input
              id={inputId}
              className="tq-input"
              autoFocus
              autoComplete="one-time-code"
              spellCheck={false}
              inputMode={totp ? 'numeric' : 'text'}
              placeholder={totp ? '123456' : 'ABC-DEFG'}
              maxLength={totp ? 7 : 8}
              value={code}
              readOnly={a.busy}
              aria-invalid={a.codeError ? true : false}
              aria-describedby={a.codeError ? `${inputId}-hint` : undefined}
              onChange={(e) => setCode(totp ? e.target.value : formatOfflineCodeInput(e.target.value))}
            />
            <p className="tq-hint" id={`${inputId}-hint`} aria-live="polite">{a.codeError ?? ''}</p>
          </div>
          <button type="submit" className="tq-btn" disabled={a.busy}>{t.submitCode}</button>
        </form>
        {(a.offline?.totpAvailable || totp) && (
          <div className="tq-row">
            <button type="button" className="tq-link" onClick={() => a.setCodeType(totp ? 'qr' : 'totp')}>{totp ? t.useQr : t.useTotp}</button>
          </div>
        )}
        {cancel}
      </>
    );
  } else if (a.phase === 'passkey') {
    body = (
      <>
        {x}<Icon name="key" />{title(t.passkeyTitle)}
        <p className="tq-text">{t.passkeyBody}</p>
        {a.notice && <p className="tq-note" role="status">{a.notice}</p>}
        <button type="button" className="tq-btn" autoFocus disabled={a.busy} onClick={() => { void a.continueWithPasskey(); }}>
          {a.busy ? t.passkeyBusy : t.passkeyButton}
        </button>
        {cancel}
      </>
    );
  } else if (a.phase === 'approved') {
    body = <>{x}<Icon name="check" tone="ok" />{title(t.approvedTitle, true)}</>;
  } else if (a.phase === 'error') {
    body = (
      <>
        {x}<Icon name="alert" tone="danger" />{title(t.errorTitle)}
        <div className="tq-alert" role="alert">
          {a.error?.message ?? t.errors.generic}
          <CaseLine texts={t} code={a.error?.caseCode ?? a.caseCode} />
        </div>
        <button type="button" className="tq-btn" autoFocus onClick={a.close}>{t.close}</button>
      </>
    );
  }

  return (
    <>
      <style>{APPROVAL_STYLES}</style>
      <dialog
        ref={dialog}
        className={className ? `tq-approval ${className}` : 'tq-approval'}
        style={style}
        data-theme={theme}
        aria-labelledby={titleId}
        onCancel={(e) => { e.preventDefault(); a.close(); }}
      >
        {open && <div className="tq-card">{body}<p className="tq-secured">{approvalAttribution(t)}</p></div>}
      </dialog>
    </>
  );
}
