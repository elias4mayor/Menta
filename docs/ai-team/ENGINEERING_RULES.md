# MENTA Engineering and AI Collaboration Rules

1. **Scope and approval.** Read root AGENTS.md, CLAUDE.md, README.md and relevant existing specs before code changes. Founder must authorize writes; branch and PR creation do not authorize merging or deployment.
2. **Branch isolation.** Create task-specific branches from the approved base. Never work directly on main. Avoid touching another agent's branch or uncommitted work. No force-push, reset, rebase, stash, clean, deletion, schema migration, or deployment without explicit approval.
3. **Small PRs.** Include problem, scope, acceptance criteria, affected files, tests run, manual verification, security/privacy risks, rollback considerations, and outstanding gaps.
4. **Evidence.** Distinguish observed behavior from assumptions. Never describe tests as passing unless run and confirmed. Passing CI alone does not verify Stripe webhooks, checkout, refunds, or production readiness.
5. **Sensitive data.** Never commit secrets, tokens, .env values, student records, DOB, health/wellness data, or real customer data. Use test fixtures and redact logs. Public repository content is public.
6. **Minors.** Fail closed where DOB or consent status is unknown in sensitive flows. Require appropriate guardian consent and legal/privacy review before minor-facing pilots. Keep wellness and mental-health information separate from recruiting/coach evaluation.
7. **Payments.** Test Stripe with sandbox keys and realistic event ordering; verify checkout, webhook signatures, plan/status sync, cancellations, failed payments, and refunds before production payments. Do not treat an open PR as verification.
8. **Research.** Perplexity findings must include source URLs, dates, direct evidence, assumptions, and conflicting evidence. Do not present speculative market size or interview interest as purchases.
9. **Handoff.** Update TASK_BOARD and append AI_HANDOFF after work; reference issue/PR/commit. Do not overwrite another agent's work or claim that assistants automatically exchange messages.
10. **Release.** Founder explicitly approves merge and deployment separately. Vercel preview creation may be automated by repository settings; check that behavior before opening code PRs. Documentation-only changes should not intentionally trigger a production release.
