# Guardian consent & minor-athlete data access — policy proposal

**Status: proposal, not approved. Nothing in this document is implemented as a legal or compliance control — it describes what MENTA's code currently does, where that falls short of a defensible guardian-access system for minors, and what needs a product/legal decision before Parent Next Move (or any guardian-facing feature) is enabled for real families.**

This document exists because the current `GuardianLink`/`GuardianScopeGrant` implementation (see `prisma/schema.prisma`) is engineering-complete and tested — authorization checks are real, scoped, and revocable — but engineering-complete is not the same as legally sufficient. The schema comment on `GuardianLink` already flags this; this document is the fuller version that comment promised.

## What the code does today (factual, not a recommendation)

1. A `PARENT`-role account sends a `GuardianLink` request by the athlete's email (`POST /api/guardian`).
2. The request sits `PENDING` until the account signed in **as the athlete** clicks approve (`PATCH /api/guardian/[id]`, athlete-only check: `user.id === link.athleteId`).
3. Once `APPROVED`, the guardian gets access to the athlete's training/goal snapshot and care *status* (never reason/notes) — see `canViewAthleteProfile`/`canViewAthleteCareStatus` in `src/lib/permissions.ts`.
4. Three additional, more sensitive views (academic eligibility status, academic assignment detail, team calendar) require a *separate* `GuardianScopeGrant`, which only the athlete's logged-in session can create or delete (`PATCH /api/guardian/[id]/scopes`).
5. Nothing in this flow asks who is actually typing on the athlete's device, checks the athlete's age, verifies the "parent" account belongs to someone with real legal authority over that specific minor, or revisits consent when the athlete turns 18.

That gap is the subject of this document.

## 1. Verification of athlete identity

**Problem:** "the account logged in as the athlete clicked approve" assumes the person at the keyboard is the athlete. Today nothing distinguishes that from a parent who already knows the athlete's password, a sibling, or anyone else with device access clicking through an approval screen on the athlete's behalf.

**Options, not a decision:**
- Accept this as an acceptable risk for a training-and-development app (not a lower bar than most consumer apps' "click to agree" patterns), and rely on the existing account-security controls (password, session) as the identity boundary — i.e., "whoever controls the athlete's MENTA account" is the policy's definition of "the athlete," full stop, documented as such.
- Add a lightweight re-authentication step (re-enter password) specifically on the approve-guardian-link and grant-scope actions, raising the bar above a device left unlocked, without full identity verification.
- Something stronger (e.g., tied to school-roster verification during onboarding) — likely overkill for v1 and a real product/cost question, not an engineering default to reach for.

**Recommendation for someone with product/legal authority to decide:** pick one of the above explicitly; don't let it default silently to the first option by omission.

## 2. Verification of parent or legal guardian authority

**Problem:** `GuardianLink` proves a *relationship was asserted and the athlete's account agreed to it*. It proves nothing about legal custody, guardianship, or parental rights — not even that the "parent" account's name matches a real guardian on file anywhere. In a custody dispute, a non-custodial parent, a estranged relative, or someone the athlete's account mistakenly (or coercively) approved all look identical to a legitimate guardian in this schema.

**This is explicitly a legal question, not an engineering one.** MENTA holding itself out as verifying legal guardianship, when it only verifies "an in-app relationship was clicked through," is a real liability surface if it's ever relied upon in a dispute.

**Recommendation:** the product surface (onboarding copy, the guardian-link request flow, any marketing language) should say plainly that an approved link reflects the athlete's own choice to share, not a verified legal determination — language review belongs to whoever owns that copy, not this document. If MENTA ever wants to offer verified-guardianship as a feature (e.g., for school-issued accounts or when a school administrator is the one establishing the link), that is new, separate scope requiring its own design — not an extension of today's self-service flow.

## 3. Athlete-controlled sharing vs. legally authorized guardian access

**This is the most important distinction to get right, and the current system already makes a defensible choice here that's worth stating explicitly rather than leaving implicit:** `GuardianScopeGrant` is **athlete-controlled sharing** — the athlete decides what a guardian sees, scope by scope, and can revoke at any time. It is *not* "legally authorized guardian access," which would mean a legal guardian can see what they're entitled to see **regardless of whether the athlete agrees**.

For a legal minor, these two models can conflict: a parent with real legal authority may be entitled to information the athlete doesn't want to share (and in many jurisdictions, for a minor below a certain age, parental access to their child's records isn't something the child gets to veto). The current system only implements the athlete-controlled model. If product/legal direction is that minors below some age threshold should **not** have unilateral control over what a legal guardian can see — i.e., a parent should get a baseline of access by virtue of legal guardianship, independent of the athlete's own consent — that is a fundamentally different authorization model than what's built, not a configuration change.

**Recommendation:** decide explicitly which model MENTA intends for which age ranges before enabling this for real minors. Do not let the current athlete-controlled model stand in as the answer by default — it was built because it was the buildable v1, not because it was confirmed as the intended policy.

## 4. Age-of-majority transitions and re-consent

**What exists:** `isMinor(dateOfBirth)` in `src/lib/permissions.ts` is accurate and already used elsewhere in the app for minor-status checks. It is **not** currently wired into any guardian-access decision — a `GuardianScopeGrant` created when an athlete was 15 stays valid with no re-prompt, no expiry, and no notice to the athlete when they turn 18.

**Recommendation to evaluate:** when an athlete crosses the age-of-majority threshold (jurisdiction-dependent — another reason this needs non-engineering input, not a hardcoded "18"), the system should at minimum notify the now-adult athlete that active guardian grants exist and let them review/revoke, rather than silently continuing indefinite access that may no longer reflect the athlete's wishes or the legal basis for the original grant. Whether this should be a notification, a forced re-consent (access pauses until re-approved), or something else is a product decision.

## 5. Revocation, audit logging, and data retention

**What exists today (verified, not aspirational):**
- Revocation is real and immediate: deleting a `GuardianScopeGrant` row removes access on the very next read of the Parent Next Move queue or either scope-gated page — tested explicitly (`e2e/parent-next-move.spec.ts`), including that a previously-generated recommendation disappears from both the active queue and resolved history, not just new ones.
- Every grant/revoke action is written to `AuditLog` (`guardian.scope_granted`/`guardian.scope_revoked`, with `scope` and `athleteId` as metadata — never the underlying sensitive content itself).
- `GuardianLink`/`GuardianScopeGrant` rows are deleted, not soft-revoked-and-retained, when the athlete revokes — there's no "revoked but still stored for records" state today.

**Not yet decided:**
- Retention: should a revoked relationship's audit trail (who had access, when, to what) be kept indefinitely for accountability, or purged after some period? This is a real data-retention policy question with no current answer in the codebase.
- Should the *guardian* also be notified when their access is revoked (today only the base `GuardianLink` revocation sends a notification; per-scope revocation does not)? Minor product decision, flagged here so it isn't lost.

## 6. Handling of school-sourced academic information

**What exists:** `Assignment`/`EligibilityChecklistItem` are MENTA-native records — entered by the athlete directly, or (per `src/lib/integrations/google-classroom.ts`, unrelated to this feature) synced from a connected Google Classroom account. Nothing here currently distinguishes "academic data the athlete typed in themselves" from "academic data synced from an actual school system" when deciding what a guardian scope exposes — both flow through the same `Assignment` table and the same `VIEW_ACADEMIC_ASSIGNMENTS` scope.

**Why this matters:** data that originates from a school's own system may carry different handling obligations than data an athlete self-reports, depending on jurisdiction and the specific data (this document deliberately does not name a specific law, per the explicit instruction not to assume which one applies to a given deployment — that determination depends on facts this document doesn't have: which schools, which students, which state, whether MENTA has any agreement with a school district, etc.).

**Recommendation:** before enabling `VIEW_ACADEMIC_ASSIGNMENTS`/`VIEW_ACADEMIC_STATUS` for any athlete whose academic data includes school-system-sourced records (i.e., has a connected Google Classroom integration), confirm with whoever handles MENTA's school/district relationships (if any exist) what obligations apply, rather than assuming self-reported and school-sourced data can be treated identically just because they share a database table today.

## Summary: what's safe to ship as-is, what isn't

**The engineering is sound for what it claims to be:** a revocable, athlete-controlled, narrowly-scoped sharing mechanism, with real tests proving isolation and immediate revocation. Nothing in this document found a bug in that mechanism.

**What's not resolved, and what this document asks be decided before real minors' data depends on it:**
1. Identity verification bar for the approving account (§1) — a product decision.
2. Whether MENTA ever represents a `GuardianLink` as verified legal guardianship (it shouldn't, as built) — a legal/copy decision.
3. Athlete-controlled vs. legally-authorized-access model, per age range (§3) — a legal/product decision, the most consequential one here.
4. Age-of-majority re-consent behavior (§4) — a product decision.
5. Retention policy for revoked relationships (§5) — a policy decision.
6. School-sourced data handling (§6) — depends on facts (school relationships, jurisdictions) this document doesn't have access to.

None of these are resolved by this document. They're handed off, explicitly, to whoever at MENTA owns legal/product policy — engineering should not make these calls by default or by omission.
