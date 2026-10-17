# MENTA iOS integration

The SwiftUI client is maintained in the separate Menta-iOS repository. Server credentials remain here in deployment configuration; they must never be copied into the app.

## Mobile sign-in

The app opens `ASWebAuthenticationSession`, not an embedded web view, for Apple/Google login. It creates a random PKCE verifier and challenge plus a separate state value. `/api/auth/mobile/start` signs the challenge/state into a short-lived HttpOnly cookie, then uses the existing web OAuth callback.

After provider verification and account resolution, the callback issues a random one-use code. Only the SHA-256 code digest is stored. The app receives the short-lived code and its original state through the fixed `menta-ios://auth/callback` URL. `/api/auth/mobile/exchange` atomically consumes the code after checking the PKCE verifier, then creates the normal MENTA HttpOnly cookie. No session token, provider token, or secret appears in the callback URL. The app copies the response cookie into its WebKit cookie store.

Apply the new Prisma migration before enabling mobile login. Expired ticket rows are pruned when starting a new mobile login. Native state validation and database one-use consumption both require end-to-end testing with real provider test accounts; unit tests cover flow tamper detection, expiry, format checks and the RFC PKCE vector.

## Required provider configuration

Google uses the existing `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Keep its authorized web redirect URI set to your server's `/api/auth/oauth/google/callback` URL. MENTA's server owns this web OAuth flow; the iOS app authenticates to MENTA through the one-use PKCE handoff.

Apple requires `APPLE_CLIENT_ID` (a configured Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` (the `.p8` signing key). Configure the HTTPS return URL ending in `/api/auth/oauth/apple/callback` in Apple Developer. The authorization response uses Apple's required form POST. Its state cookie uses Secure and SameSite=None to support that cross-site POST. Apple ID tokens are checked against Apple's public keys, RS256, issuer, audience, nonce and verified email; the Apple client-secret JWT is signed server-side and expires after five minutes. Enable Apple private email relay delivery for your email domain as needed.

`APP_URL` and the deployment's actual HTTPS origin must agree with provider return URLs. Test real sign-in, cancellation, expired codes, concurrent exchange attempts, account switching, verified existing-account linking, and first-run website onboarding. Neither provider is declared live merely because its environment variable names exist.

## Memberships and Stripe

The app reads existing memberships from `/api/subscriptions/me`. `/api/mobile/membership` provides the canonical server-resolved plan catalog and a separate external-checkout enable flag. It does not grant entitlements; existing server-side entitlement checks remain authoritative.

Stripe checkout and webhook handlers already exist. Confirm the correct Stripe sandbox/live account, configured price IDs, restricted-key permissions, signed webhook destination, subscription update/cancellation handling, and end-to-end entitlement reconciliation before launch. Configuration has not been verified in a live Stripe account by this change.

The first mobile checkout path is opt-in: `IOS_US_STRIPE_CHECKOUT_ENABLED=true`, Stripe configured, and the app detecting the United States **App Store storefront** through StoreKit. The app sends only a plan key to the existing authenticated server checkout handler and opens the returned HTTPS Stripe Checkout URL externally. Do not use IP, locale, or device region as a storefront proxy. Other storefronts can view existing memberships but receive no external purchase CTA. StoreKit in-app subscriptions and worldwide commercial availability are not implemented by this change. Review current Apple requirements and storefront availability before enabling the flag; this flag is not an App Review approval.

The existing webhook reconciliation is outside this change's scope and must pass sandbox purchase, delayed webhook, replay, cancellation, refund, and account-ownership tests. Do not grant a paid membership based on a checkout redirect alone.

## Athlete launch gates

Before a school-age launch, verify the existing birth-date, guardian/consent, private profile, team permission, reporting/blocking, account deletion, and wellness-data access flows with middle-school, high-school, college, and independent-athlete test cases. Do not infer that adding mobile sign-in makes these legal, privacy, or safety requirements complete. The app's optional on-device tools are account-scoped and do not automatically share check-ins with coaches or the server.
