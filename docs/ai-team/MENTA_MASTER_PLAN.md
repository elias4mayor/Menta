# MENTA — master plan
Updated: 2026-10-15. **Working plan, not a verified complete code audit.**

## Mission
Build an athlete-first Student-Athlete Operating System connecting training, academic progress, performance, film, recruiting guidance, and athlete development. The athlete should understand: Where do I stand? Where do I fit? What should I do next?

## Principles
- Athlete-first, not generic team-management software.
- No recruiting or eligibility guarantees; use official sources and qualified reviewers for any eligibility guidance.
- Athlete-controlled data and clear consent.
- Do not use private wellness/mental-health information for recruiting or coach-facing rankings.
- Do not onboard minors into workflows lacking verified consent/privacy protections.
- Affordable access; validate willingness to pay before expanding scope.

## Current product / engineering context
- Repository: https://github.com/elias4mayor/Menta (default branch: main).
- Staging: https://menta-staging.vercel.app/ (deployment status not verified by this document).
- Existing root documents include README.md, AGENTS.md, CLAUDE.md, MENTA_FEATURES.md and MENTA_AUDIT_REPORT.md. Read these before changing implementation.
- A separate draft Stripe billing-hardening PR #2 was open when this coordination setup began. It explicitly reports real Stripe event tests as unverified; do not assume payments are production-ready.

## Near-term business priority: customer validation
Use the existing Phase 4 founder execution plan and tracker **if available to the assigned agent**; do not pretend those files are in GitHub unless confirmed. Interview parents, athletes, and coaches/counselors separately; collect specific recent problems, alternatives, offers, actual purchases/refunds, and objections.

Concepts under test: (A) eligibility alerts, (B) recruiting app, (C) one-time College Athletics Readiness Review. Earlier experiment proposed refundable $10 deposits for A/B and review price points of $29/$59/$99 for C, with careful consent, accurate terms, and payment verification. These are hypotheses, not validated demand. Do not collect minors' transcripts during interviews.

## Product delivery gate
Before accepting sensitive student data or charging for a review: verify qualified review methodology, guardian consent, data handling, clear scope/refunds, and operational payment flows. Any legal assessment requires qualified counsel where appropriate.

## Change policy
No merge, deploy, schema migration, destructive Git action, or production payment enablement without explicit founder approval.
