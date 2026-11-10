// @touchque/react — React bindings for @touchque/web.
//
//   import { useTouchQuePasskey, PasskeyButton } from '@touchque/react';
//   import { useTouchQueEnroll, TwoFactorEnroll, TwoFactorLoginButton } from '@touchque/react';
//   import { useTouchQueApproval, TouchQueApproval } from '@touchque/react';
//   import { HostedLoginProvider, useHostedLogin, TouchQueLogin, UserProfile, useMyAccount } from '@touchque/react';

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

// TouchQue Login (hosted sign-in) for single-page apps
export { HostedLoginProvider, useHostedLogin, RequireSignIn } from './HostedLogin';
export type { UseHostedLogin, HostedLoginProviderProps } from './HostedLogin';
export { UserProfile, useMyAccount } from './UserProfile';
export { TouchQueLogin } from './TouchQueLogin';
export type { TouchQueLoginProps, TouchQueLoginLabels } from './TouchQueLogin';
export type { UserProfileProps, UserProfileSection, UserProfileLabels } from './UserProfile';

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
