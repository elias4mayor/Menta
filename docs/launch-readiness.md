# MENTA launch readiness — November 12, 2026

This change is not a certification that either product is ready to launch.

## Implemented in this change
- Concept gear catalog shared byte-for-byte by web and bundled iOS JSON; public read-only catalog API; no unsupported stock, pricing, order or protective claims.
- Kit Check packing tool on web and iOS; iOS WidgetKit target, app-group entitlement, deep link and required-reason privacy declarations (requires Xcode/device verification).
- Server-validated email signup acknowledgement, exact legal version and age 14+ validation; acknowledgement persisted atomically with user creation.
- Existing OAuth login retained; new OAuth accounts redirected to email signup so they cannot skip the new gate.
- Document listing uses the same ownership-first access policy as document details and downloads.
- Updated privacy and terms drafts distinguish local iOS data from cloud records and identify unresolved operating facts.

## Release blockers
1. Confirm operating legal entity, business address, privacy/support contact, intended countries, actual vendor configuration, retention and deletion process. Have counsel review final notices, minor consent, school and provider contracts, commerce terms and liability provisions. Do not remove draft labels until resolved.
2. Complete verified guardian consent and legacy-account onboarding where required. The date-of-birth gate alone is not sufficient.
3. Native iOS remains a local client: implement authenticated backend connectivity, team-code joining and server-authorized feature flows before claiming parity with the web service.
4. Confirm production database, object storage, email, OAuth and AI configuration without committing credentials; run isolated full end-to-end tests.
5. Test iOS in Xcode and on physical devices; verify signing, app groups, privacy manifest and App Store privacy disclosures.
6. Android has no repository in the accessible repository inventory. Build and test an Android client and widget rather than claiming a web component installs as a native widget.
7. Physical products require supplier prototypes, safety/quality review, intellectual-property review, prices, inventory, fulfillment and returns before sales.
8. Audit all sensitive-document sharing paths, provider verification, billing/cancellation and deletion before real student records are accepted.

## Candidate widgets beyond Kit Check
- Next Move: choose a next action from actual schedule and outstanding assignments; show source and updated time.
- Departure: coach-entered bus departure time, packing checklist and acknowledgement; avoid live-location collection by default.
- Eligibility Reminder: private reminder to open the app; show no failing grades on a lock screen by default; never present as official clearance.
- Session Window: user-selected time, space and equipment constraints determine a reviewed drill plan, with no invented readiness or injury predictions.

## Reference sources
- https://www.ftc.gov/business-guidance/resources/mobile-health-apps-interactive-tool
- https://www.ftc.gov/business-guidance/resources/complying-ftcs-health-breach-notification-rule-0
- https://developer.apple.com/documentation/widgetkit/creating-a-widget-extension
- https://developer.android.com/develop/ui/compose/glance/create-app-widget
