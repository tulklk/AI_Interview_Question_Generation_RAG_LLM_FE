// Public API for the auth feature.

// Context / providers
export { UserProvider, useUser } from "./context/user-context";

// Hooks
export { useLogin } from "./hooks/use-login";
export { useRegister } from "./hooks/use-register";
export { useLogout } from "./hooks/use-logout";

// Components
export { LoginForm } from "./components/login-form";
export { LoginHero } from "./components/login-hero";
export { RegisterForm } from "./components/register-form";
export { RegisterRoleTabs } from "./components/register-role-tabs";
export { RegisterJobSeekerForm } from "./components/register-jobseeker-form";
export { ResetPasswordContent } from "./components/reset-password-content";
export { GoogleLoginOnboarding } from "./components/google-login-onboarding";
export { AuthLayout } from "./components/auth-layout";
export { AuthPageToolbar } from "./components/auth-page-toolbar";
export { Auth3DVisual } from "./components/auth-3d-visual";
export {
  GoogleOAuthButton,
  GithubOAuthButton,
  SocialOAuthRow,
} from "./components/social-oauth-buttons";

// Types
export type * from "./types/auth";
