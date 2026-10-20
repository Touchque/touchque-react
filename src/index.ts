// @touchque/react — React bindings for @touchque/web.
//
//   import { useTouchQuePasskey, PasskeyButton } from '@touchque/react';
//   import { useTouchQueEnroll, TwoFactorEnroll, TwoFactorLoginButton } from '@touchque/react';
//   import { useTouchQueApproval, TouchQueApproval } from '@touchque/react';

export { useTouchQuePasskey } from './useTouchQuePasskey';
export type { UseTouchQuePasskey, PasskeyStatus } from './useTouchQuePasskey';
export { PasskeyButton } from './PasskeyButton';
export type { PasskeyButtonProps } from './PasskeyButton';

export { useTouchQueEnroll } from './useTouchQueEnroll';
export type { UseTouchQueEnroll, EnrollStatus } from './useTouchQueEnroll';
export { TwoFactorEnroll } from './TwoFactorEnroll';
export type { TwoFactorEnrollProps } from './TwoFactorEnroll';

export { useTouchQueLogin } from './useTouchQueLogin';
export type { UseTouchQueLogin, ClassicLoginStatus } from './useTouchQueLogin';
export { TwoFactorLoginButton } from './TwoFactorLoginButton';

export { useTouchQueAction } from './useTouchQueAction';
export type { UseTouchQueAction, ActionStatus } from './useTouchQueAction';
export type { TwoFactorLoginButtonProps } from './TwoFactorLoginButton';

export { useTouchQueApproval, TouchQueApproval } from './TouchQueApproval';
export type { UseTouchQueApproval, TouchQueApprovalProps } from './TouchQueApproval';
export { usePasskeyAutofill, usePasskeyUpgrade } from './usePasskeyAutofill';
export type { UsePasskeyAutofill, UsePasskeyAutofillOptions, UsePasskeyUpgrade, PasskeyUpgradeStatus } from './usePasskeyAutofill';

// Re-export the error classes so consumers don't also need to import from
// @touchque/web just to `instanceof`-check.
export {
  PasskeyDismissedError,
  PasskeyNotRegisteredError,
  PasskeyDisabledError,
  EnrollmentTimeoutError,
  EnrollmentCancelledError,
  PasskeyRequiredError,
  PasskeyAlreadyRegisteredError,
  TouchQueWebAPIError,
} from '@touchque/web';
export type { Step, StepState, StepControls, ApprovalState, ApprovalTexts, ApprovalOptions } from '@touchque/web';
