/**
 * Feature flags — Guest Mode
 *
 * ENABLE_GUEST_MODE:
 *   When true, the app never forces a login/register screen on launch.
 *   Unauthenticated visitors get a lightweight local "guest" identity and
 *   can browse every public page immediately.
 *
 * REQUIRE_AUTH_ON_WRITE:
 *   When true, any action that reads/writes user-owned data (bookings,
 *   saved providers, messages, reviews, profile edits, etc.) prompts the
 *   guest to sign in or create an account via <AuthRequiredModal /> instead
 *   of silently failing or being hidden.
 */
export const ENABLE_GUEST_MODE = true;
export const REQUIRE_AUTH_ON_WRITE = true;
