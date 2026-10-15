# MENTA AI Team — shared coordination

This folder is a **human-reviewed coordination protocol**, not an automatic integration among ChatGPT, Claude, and Perplexity. GitHub is the shared record. Each assistant must read the latest files and relevant issues/PRs before making recommendations. The founder owns decisions.

## Responsibilities
- **Founder:** chooses priorities, authorizes writes, approves merges and deployments.
- **ChatGPT:** product planning, architecture and code review, issue/PR scoping, risk checks.
- **Claude:** scoped implementation, tests, technical handoffs; no overlapping changes without assignment.
- **Perplexity:** sourced external research, competitor/market/customer validation; distinguishes evidence from hypotheses.
- **GitHub:** issues, branches, PRs, documentation, decisions.
- **Vercel:** staging/production deployment, subject to explicit founder approval.

## Routine
1. Read MASTER_PLAN, TASK_BOARD, AI_HANDOFF, ENGINEERING_RULES and current GitHub issues/PRs.
2. Select one task with owner, branch, acceptance criteria and dependencies.
3. Researcher posts citations and dated findings; planner converts validated needs into a scoped issue.
4. Implementer works on a separate branch and draft PR; include tests and risks.
5. Reviewer checks diff, CI, privacy, and any manual tests; founder decides whether to merge or deploy.
6. Update TASK_BOARD and append an entry to AI_HANDOFF. Never claim another assistant has read a handoff until it has.

## Important
No API or cross-assistant messaging automation is installed by these files. Do not place credentials, transcripts, health data, or other sensitive information in this public repository. Avoid editing shared coordination files simultaneously; assign a single writer per task.
