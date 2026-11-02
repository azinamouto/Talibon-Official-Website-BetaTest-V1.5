# Workflow: Neon Auth, sessions, RBAC
**When:** Editor login, invitations, recovery, sessions and permissions.

1. Verify current **Neon Auth** capabilities in official docs/account before coding: session validation, MFA, invitation/closed-signup control, recovery, hooks/SDK and custom domain deployment.
2. If required MFA or account controls are unsupported, **block qualification** and document alternatives/approval; never downgrade policy or invent APIs.
3. Enforce roles server-side: admin/editor only, deny-by-default, active/verified state, per-resource permissions, revoked sessions fail immediately as supported by model.
4. Migrate accounts by explicit identity mapping and safe re-enrollment; do not extract passwords, MFA seeds or active tokens. Avoid account takeover via email-only linking.
5. Test unauthenticated, expired, forged, deactivated, wrong-role and cross-user requests; admin permissions must not be inferred from UI.
**Done:** threat review, API integration tests and verified provider behavior; otherwise report blocker.
