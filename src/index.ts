// @touchque/react — React bindings for @touchque/web.
//
//   import { useTouchquePasskey, PasskeyButton } from '@touchque/react';
//   import { useTouchqueEnroll, TwoFactorEnroll, TwoFactorLoginButton } from '@touchque/react';
//   import { useTouchqueApproval, TouchqueApproval } from '@touchque/react';
//   import { HostedLoginProvider, useHostedLogin, TouchqueLogin, UserProfile, useMyAccount } from '@touchque/react';

export { useTouchquePasskey } from './useTouchquePasskey';
export type { UseTouchquePasskey, PasskeyStatus } from './useTouchquePasskey';
export { PasskeyButton } from './PasskeyButton';
export type { PasskeyButtonProps } from './PasskeyButton';

export { useTouchqueEnroll } from './useTouchqueEnroll';
export type { UseTouchqueEnroll, EnrollStatus } from './useTouchqueEnroll';
export { TwoFactorEnroll } from './TwoFactorEnroll';
export type { TwoFactorEnrollProps } from './TwoFactorEnroll';

export { useTouchqueLogin } from './useTouchqueLogin';
export type { UseTouchqueLogin, ClassicLoginStatus } from './useTouchqueLogin';
export { TwoFactorLoginButton } from './TwoFactorLoginButton';

export { useTouchqueAction } from './useTouchqueAction';
export type { UseTouchqueAction, ActionStatus } from './useTouchqueAction';
export type { TwoFactorLoginButtonProps } from './TwoFactorLoginButton';

export { useTouchqueApproval, TouchqueApproval } from './TouchqueApproval';
export type { UseTouchqueApproval, TouchqueApprovalProps } from './TouchqueApproval';
export { usePasskeyAutofill, usePasskeyUpgrade } from './usePasskeyAutofill';
export type { UsePasskeyAutofill, UsePasskeyAutofillOptions, UsePasskeyUpgrade, PasskeyUpgradeStatus } from './usePasskeyAutofill';

// Touchque Login (hosted sign-in) for single-page apps
export { HostedLoginProvider, useHostedLogin, RequireSignIn } from './HostedLogin';
export type { UseHostedLogin, HostedLoginProviderProps } from './HostedLogin';
export { UserProfile, useMyAccount } from './UserProfile';
export { TouchqueLogin } from './TouchqueLogin';
export type { TouchqueLoginProps, TouchqueLoginLabels } from './TouchqueLogin';
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
  TouchqueWebAPIError,
} from '@touchque/web';
export type { Step, StepState, StepControls, ApprovalState, ApprovalTexts, ApprovalOptions } from '@touchque/web';
