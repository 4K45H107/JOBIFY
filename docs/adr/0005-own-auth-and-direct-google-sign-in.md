# 0005. Our own sign-in, and Google sign-in without Auth0

**Status:** accepted

## Context

The original had no real authorization. The rebuild needed email and password accounts with
verification and resets, two roles, and Google sign-in, without paying for an identity service.

## Decision

- **Sign-in:** argon2id password hashes, a 15-minute signed access cookie and a rotating refresh
  cookie (reuse signs out every device).
- **Accounts:** role guards, rate limits, and single-use hashed tokens for email verification and
  password resets.
- **Google:** connected directly with OAuth (authorization code with PKCE, state and nonce), rather
  than through Auth0 or a framework plugin.

## Consequences

- No outside identity service to pay for or depend on, and the whole flow is testable end to end.
- We own the security work. `docs/AUTH.md` compares it with OWASP and NIST guidance and lists
  what's still missing (MFA, a sessions list, breached-password checks).
