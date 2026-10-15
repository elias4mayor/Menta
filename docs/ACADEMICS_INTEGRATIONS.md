# MENTA school integrations

## Delivery status

Google Classroom remains on its existing independent flow. This change implements **Canvas and Blackboard Learn** student-delegated OAuth, token refresh, read-only course/assignment-score snapshots, manual sync, and local disconnect. It is an implementation awaiting institution sandbox/live validation, not a claim of production compatibility with every school.

The Academics page includes an honest platform catalog covering Brightspace, Schoology, Moodle, Microsoft Teams for Education, PowerSchool, Infinite Campus, Skyward, Aeries, Edupoint Synergy, Blackbaud, Clever, and ClassLink. Their adapters are **not implemented** by this change. No active Connect buttons or API compatibility claims are shown for those providers. The catalog is a roadmap, not an exhaustive market ranking.

## Activation

1. Apply `prisma migrate deploy` against the intended environment. Regenerate Prisma Client with `prisma generate`.
2. Set `APP_URL` to the exact environment origin and `TOKEN_ENCRYPTION_KEY` to the existing 32-byte base64 encryption key. Preserve this key across deployments to keep saved tokens readable.
3. Register MENTA as a school-approved OAuth application. Students do not create developer credentials and MENTA never asks for their school password.
4. Set server-only `SCHOOL_OAUTH_INSTANCES` to a JSON array of `{id,name,provider,baseUrl,clientId,clientSecret}`. The ID is a stable lowercase slug. Provider is `canvas` or `blackboard`. Base URL is the institution's public HTTPS origin, no path. Only operators can configure instances; students cannot supply arbitrary hosts or tokens. Configure only institution-controlled public hosts. This trust boundary is not a general-purpose URL proxy and is not a substitute for infrastructure egress controls.
5. Register the exact callback `APP_URL/api/integrations/school/<id>/callback` with each provider. Do not reuse Google login or Classroom credentials.
6. Canvas: root administrator enables MENTA's scoped developer key. Required scopes: `url:GET|/api/v1/courses` and `url:GET|/api/v1/courses/:course_id/assignments`.
7. Blackboard: institution installs the REST application and enables end-user authorization/3LO. Use the application's OAuth key as clientId, not Application ID. MENTA requests `read offline` and PKCE S256. Check the school's Learn version, student entitlements, and student visibility of gradebook endpoints. Do not configure a system/service-account flow as a substitute.
8. On `/school`, connect as a test student, verify actual released grades and due dates, sync after a grade changes, expire access to exercise refresh, revoke consent, and disconnect. Confirm teacher-only courses and hidden grades are not imported. Institution/custom course-role variants need explicit testing.

## Data handling and limits

- OAuth state is encrypted, expires in ten minutes, and is bound to the signed-in MENTA user, school, and nonce in an HttpOnly SameSite cookie. Blackboard additionally uses PKCE.
- Tokens use existing AES-256-GCM encryption; only connection metadata and normalized course snapshots are serialized to the browser. No teacher, coach, recruiting-profile or public-profile access is added.
- API reads are delegated to the school user, restricted to self/student courses. Blackboard grades use the authenticated user's ID, never an arbitrary student ID supplied by the browser.
- Cross-origin pagination and redirects are rejected. Network calls have a 15-second timeout and a 4-million-character response check. Pagination is capped at 20 pages; courses at 30, Blackboard gradebook columns at 200 per course. Exceeding limits fails the entire read and preserves the previous snapshot. Large institutions may require background jobs before activation. Response-size validation currently happens after reading the body.
- Sync mutations require the configured APP_URL Origin and use the repository's existing in-memory rate limiter. That limiter is not coordinated across server instances.
- Missing/unreleased scores remain null, distinct from zero. No GPA, eligibility, NCAA certification, or percentage is inferred from assignment scores. Data stays separate from manual academic records and the existing Classroom integration. This change does not feed snapshots into AI, recruiting, calendars, or parent/coach views.
- Disconnect deletes MENTA tokens and cached snapshot. It does not claim to revoke provider consent: the UI directs the user to revoke that in their school account too. Retention/backups follow the deployment's database policy.
- Plan school-instance URL/credential changes as migrations: reconnect the affected users. Never repoint an existing ID to another school while saved connections remain.

## Next adapters and verified reference paths

| Platform | API path | Required work before enabling |
| --- | --- | --- |
| Brightspace | [Valence grades](https://docs.valence.desire2learn.com/res/grade.html) | Institution OAuth scopes, supported LP/LE versions, self enrollment/grade adapter |
| Schoology | [REST API and OAuth 1.0a](https://developers.schoology.com/api-documentation/) | Approved credentials, signed OAuth flow, user/section assignment and grade adapters |
| Moodle | [External services](https://moodledev.io/docs/5.0/apis/subsystems/external) | School-enabled restricted functions and student-scoped token flow; never collect passwords |
| Teams Education | [Graph education/me/assignments](https://learn.microsoft.com/en-us/graph/api/educationuser-list-assignments?view=graph-rest-1.0) | Entra app, tenant permissions/consent, delegated education identity, submissions/outcomes adapter |
| District SIS products | [OneRoster 1.2](https://www.imsglobal.org/spec/oneroster/v1p2) | Vendor/district-approved endpoint, supported version, roster-to-student identity mapping, separately verified gradebook read capability |
| Clever | [Developer portal](https://dev.clever.com/) | Approved application and district data sharing; SSO is not gradebook access |
| ClassLink | [OneClick and Roster Server](https://help.classlink.com/s/article/pp-about-oc-rs) | Partner integration and district authorization; verify data contract separately from SSO |

OneRoster support does not mean every SIS implements gradebook retrieval. Grade passback/write access also does not establish student grade-read access. Blackboard and Blackbaud are different products.

## Verification

Run `node scripts/test-school-integrations.cjs`. It uses mocked provider responses, not actual school accounts, and checks OAuth scopes/PKCE, student-only reads, zero/null distinctions, cross-origin pagination, access denial, limits, signed-out routes, origin checks, per-user queries, and missing state rejection. Run TypeScript and ESLint as well. The new migration and full browser flow still require a disposable PostgreSQL database and an approved school sandbox before merge.

Official primary references:
- [Blackboard 3LO, scopes and PKCE](https://docs.blackboard.com/docs/blackboard/rest-apis/getting-started/3lo)
- [Blackboard memberships API mapping](https://docs.blackboard.com/docs/blackboard/rest-apis/advanced/soap-to-rest)
- [Canvas OAuth endpoints](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth_endpoints)
- [Canvas developer keys](https://developerdocs.instructure.com/services/canvas/oauth2/file.developer_keys)
