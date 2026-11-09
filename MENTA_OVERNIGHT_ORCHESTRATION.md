# MENTA overnight launch audit

Targets: `elias4mayor/Menta` (web) and `elias4mayor/Menta-iOS` (native). The web audit follows PR #27. The iOS audit follows its own branch and workflow. The two reports identify their exact revisions.

This file is the audit directive and runbook. The workflows in `.github/workflows/` execute on GitHub-hosted runners when triggered. Each run stops after writing evidence or reaching its timeout. The run uses repository-local read access, an isolated database with synthetic fixtures, and unsigned simulator builds. Passwords, personal records, production databases, signing credentials, and deployment are out of scope.

## Specialist handoffs

1. **Legal review.** Inventory public-facing brand and provider references and record the sources used to review them. Preserve integration identifiers. Flag possible sponsor conflicts for qualified review using explicit school policy, effective dates, sponsor categories, and the asset or agreement involved. A reviewer must confirm the applicable rule and the proposed remedy before any submission changes.
2. **Security review.** Rehearse the web migration with synthetic users, athlete profiles, performance entries, and academic terms. Snapshot the sandbox, compare rows after migration, induce a failure, and restore into a fresh sandbox database. Record what happened. Production incident recovery remains a separate runbook.
3. **Core review.** Build web and native independently, then compare supported contracts. Check assistant name round-trips through web and iOS, Forge timestamps and delivery cadence, and permission-checked film links on each client. Keep the tutoring boundaries in place. Report any missing client implementation as a gap.
4. **Packaging.** Collect job outcomes and artifacts. Review the checked-in production-readiness manifest for the remaining release gates, Uniform Election contract, and App Store copy. A passing build establishes buildability for that revision.

## Running

- **Web:** Open PR #27 checks and select **MENTA overnight launch audit**. After the workflow lands on the default branch, it can also be started from the Actions tab.
- **iOS:** Run the companion workflow from its own repository. Keep native source and build logs in that private repository.
- **Review first:** Read the migration status and fixture comparison, then inspect the cross-platform gaps and brand review paths. Run outputs are short-lived artifacts. The root manifest is the durable release checklist.
