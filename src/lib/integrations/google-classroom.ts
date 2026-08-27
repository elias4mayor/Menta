import "server-only";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

/**
 * Google Classroom integration — a separate OAuth flow from
 * src/lib/oauth.ts's login-with-Google. That flow is one-shot (exchange
 * code for an identity, never persisted); this one requests offline
 * access and stores a refresh token long-term so MENTA can sync a
 * student's classes/assignments/grades on demand. Both reuse the same
 * GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET — one Google Cloud OAuth client,
 * two different scope/consent requests.
 *
 * Deliberately plain fetch() against Google's REST/token endpoints, no
 * googleapis SDK — matching oauth.ts's existing convention, and the
 * Classroom surface used here (list courses/coursework/submissions,
 * refresh a token) doesn't need the SDK's larger surface.
 */

export const CLASSROOM_STATE_COOKIE = "classroom_oauth_state";

const CLASSROOM_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
].join(" ");

function appUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}

function clientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not configured.");
  return id;
}

function clientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured.");
  return secret;
}

export function isGoogleClassroomConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function classroomRedirectUri(): string {
  return `${appUrl()}/api/integrations/google/classroom/callback`;
}

export function buildClassroomAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: classroomRedirectUri(),
    response_type: "code",
    scope: CLASSROOM_SCOPES,
    access_type: "offline",
    // Google only returns a refresh_token on the *first* consent, unless
    // we force the consent screen every time — required here since a
    // user might disconnect and reconnect and still needs a fresh one.
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

async function requestToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString(),
  });
  if (!res.ok) {
    // Never log the request body (contains the client secret / auth code).
    console.error("[google-classroom] token endpoint returned", res.status);
    throw new Error("classroom_token_exchange_failed");
  }
  return res.json();
}

export async function exchangeClassroomCode(code: string): Promise<TokenResponse> {
  return requestToken(
    new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: classroomRedirectUri(),
      code,
      grant_type: "authorization_code",
    })
  );
}

async function refreshClassroomToken(refreshToken: string): Promise<TokenResponse> {
  return requestToken(
    new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    })
  );
}

export async function fetchGoogleIdentity(accessToken: string): Promise<{ sub: string; email: string | null }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("classroom_identity_fetch_failed");
  const body: { sub?: string; email?: string } = await res.json();
  if (!body.sub) throw new Error("classroom_identity_fetch_failed");
  return { sub: body.sub, email: body.email ?? null };
}

/** Revoking the refresh token also invalidates any access tokens derived from it — best-effort, never blocks disconnect on failure. */
export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" });
  } catch (err) {
    console.error("[google-classroom] token revoke failed (continuing disconnect anyway)", err);
  }
}

/**
 * Returns a currently-valid access token for this integration, refreshing
 * and persisting a new one first if the stored one has expired (or is
 * within a minute of expiring). Never returns/logs the token itself
 * outside this module.
 */
async function getValidAccessToken(
  integration: NonNullable<Awaited<ReturnType<typeof prisma.googleClassroomIntegration.findUnique>>>
): Promise<string> {
  const expiresAt = integration.tokenExpiresAt?.getTime() ?? 0;
  const stillValid = expiresAt - Date.now() > 60_000 && integration.accessTokenEnc;
  if (stillValid) {
    return decryptSecret(integration.accessTokenEnc!);
  }

  if (!integration.refreshTokenEnc) {
    throw new Error("classroom_reauthorization_required");
  }
  const refreshToken = decryptSecret(integration.refreshTokenEnc);
  const refreshed = await refreshClassroomToken(refreshToken);

  await prisma.googleClassroomIntegration.update({
    where: { id: integration.id },
    data: {
      accessTokenEnc: encryptSecret(refreshed.access_token),
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      status: "CONNECTED",
    },
  });

  return refreshed.access_token;
}

/** Generic paginated Classroom GET — follows nextPageToken until exhausted, with a hard cap so a misbehaving API can't loop forever. */
async function listAllPages<T>(url: string, accessToken: string, itemsKey: string): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;
  const MAX_PAGES = 50;

  for (let page = 0; page < MAX_PAGES; page++) {
    const pageUrl = new URL(url);
    pageUrl.searchParams.set("pageSize", "100");
    if (pageToken) pageUrl.searchParams.set("pageToken", pageToken);

    const res = await fetch(pageUrl.toString(), { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      if (res.status === 401) throw new Error("classroom_reauthorization_required");
      if (res.status === 403) throw new Error("classroom_access_denied");
      if (res.status === 429) throw new Error("classroom_rate_limited");
      console.error("[google-classroom] list request failed", pageUrl.pathname, res.status);
      throw new Error("classroom_api_error");
    }
    const body = await res.json();
    items.push(...(body[itemsKey] ?? []));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }

  return items;
}

type GoogleCourse = {
  id: string;
  name: string;
  section?: string;
  description?: string;
  room?: string;
  courseState?: string;
  alternateLink?: string;
};

type GoogleCourseWork = {
  id: string;
  title: string;
  description?: string;
  state?: string;
  workType?: string;
  maxPoints?: number;
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  dueDate?: { year: number; month: number; day: number };
  dueTime?: { hours?: number; minutes?: number };
};

type GoogleSubmission = {
  id: string;
  state?: string;
  assignedGrade?: number;
  draftGrade?: number;
  late?: boolean;
  updateTime?: string;
};

function combineDueDateTime(courseWork: GoogleCourseWork): Date | null {
  if (!courseWork.dueDate) return null;
  const { year, month, day } = courseWork.dueDate;
  const hours = courseWork.dueTime?.hours ?? 23;
  const minutes = courseWork.dueTime?.minutes ?? 59;
  // Google's dueDate/dueTime are UTC per the Classroom API reference.
  return new Date(Date.UTC(year, month - 1, day, hours, minutes));
}

export type ClassroomSyncSummary = {
  coursesSynced: number;
  assignmentsSynced: number;
  submissionsSynced: number;
  lastSyncedAt: string;
};

/**
 * Full sync for one athlete: courses → coursework → "my" submissions,
 * upserted (never duplicated — Google's own ids are the stable keys),
 * then mirrored into CalendarEvent for anything with a real due date.
 * Idempotent: safe to call repeatedly, including on a schedule.
 */
export async function syncClassroomForUser(userId: string): Promise<ClassroomSyncSummary> {
  const integration = await prisma.googleClassroomIntegration.findUnique({ where: { userId } });
  if (!integration || integration.status === "DISCONNECTED") {
    throw new Error("classroom_not_connected");
  }

  const accessToken = await getValidAccessToken(integration);

  const googleCourses = await listAllPages<GoogleCourse>(
    `https://classroom.googleapis.com/v1/courses?studentId=me&courseStates=ACTIVE`,
    accessToken,
    "courses"
  );

  let assignmentsSynced = 0;
  let submissionsSynced = 0;

  for (const gc of googleCourses) {
    const course = await prisma.googleClassroomCourse.upsert({
      where: { integrationId_googleCourseId: { integrationId: integration.id, googleCourseId: gc.id } },
      create: {
        integrationId: integration.id,
        googleCourseId: gc.id,
        name: gc.name,
        section: gc.section ?? null,
        description: gc.description ?? null,
        room: gc.room ?? null,
        courseState: gc.courseState ?? null,
        alternateLink: gc.alternateLink ?? null,
      },
      update: {
        name: gc.name,
        section: gc.section ?? null,
        description: gc.description ?? null,
        room: gc.room ?? null,
        courseState: gc.courseState ?? null,
        alternateLink: gc.alternateLink ?? null,
      },
    });

    const coursework = await listAllPages<GoogleCourseWork>(
      `https://classroom.googleapis.com/v1/courses/${gc.id}/courseWork`,
      accessToken,
      "courseWork"
    );

    for (const cw of coursework) {
      const dueDate = combineDueDateTime(cw);
      const assignment = await prisma.googleClassroomAssignment.upsert({
        where: { courseId_googleCourseworkId: { courseId: course.id, googleCourseworkId: cw.id } },
        create: {
          courseId: course.id,
          googleCourseworkId: cw.id,
          title: cw.title,
          description: cw.description ?? null,
          state: cw.state ?? null,
          workType: cw.workType ?? null,
          dueDate,
          maxPoints: cw.maxPoints ?? null,
          alternateLink: cw.alternateLink ?? null,
          creationTime: cw.creationTime ? new Date(cw.creationTime) : null,
          updateTime: cw.updateTime ? new Date(cw.updateTime) : null,
        },
        update: {
          title: cw.title,
          description: cw.description ?? null,
          state: cw.state ?? null,
          workType: cw.workType ?? null,
          dueDate,
          maxPoints: cw.maxPoints ?? null,
          alternateLink: cw.alternateLink ?? null,
          updateTime: cw.updateTime ? new Date(cw.updateTime) : null,
          syncedAt: new Date(),
        },
      });
      assignmentsSynced++;

      // Submissions for "me" specifically — classroom.coursework.me.readonly
      // only covers the caller's own submissions, never classmates'.
      let submissions: GoogleSubmission[] = [];
      try {
        submissions = await listAllPages<GoogleSubmission>(
          `https://classroom.googleapis.com/v1/courses/${gc.id}/courseWork/${cw.id}/studentSubmissions?userId=me`,
          accessToken,
          "studentSubmissions"
        );
      } catch (err) {
        // A single course/assignment lacking submission access shouldn't
        // fail the whole sync — log and move on.
        console.error("[google-classroom] submissions fetch failed for", cw.id, err);
      }

      for (const sub of submissions) {
        await prisma.googleClassroomSubmission.upsert({
          where: { assignmentId_googleSubmissionId: { assignmentId: assignment.id, googleSubmissionId: sub.id } },
          create: {
            assignmentId: assignment.id,
            googleSubmissionId: sub.id,
            state: sub.state ?? null,
            assignedGrade: sub.assignedGrade ?? null,
            draftGrade: sub.draftGrade ?? null,
            late: sub.late ?? false,
            updateTime: sub.updateTime ? new Date(sub.updateTime) : null,
          },
          update: {
            state: sub.state ?? null,
            assignedGrade: sub.assignedGrade ?? null,
            draftGrade: sub.draftGrade ?? null,
            late: sub.late ?? false,
            updateTime: sub.updateTime ? new Date(sub.updateTime) : null,
            syncedAt: new Date(),
          },
        });
        submissionsSynced++;
      }

      // Mirror into the existing calendar — one stable event per
      // assignment (externalId = the Google coursework id), upserted so
      // reruns update rather than duplicate. Published + has a due date
      // → keep the event current. Anything else (draft, or Google marked
      // it deleted) → remove any calendar entry so MENTA never shows a
      // stale due date for work that no longer exists.
      const shouldHaveEvent = cw.state === "PUBLISHED" && dueDate !== null;
      if (shouldHaveEvent) {
        await prisma.calendarEvent.upsert({
          where: {
            createdById_source_externalId: {
              createdById: userId,
              source: "GOOGLE_CLASSROOM",
              externalId: cw.id,
            },
          },
          create: {
            title: `${course.name}: ${cw.title}`,
            description: cw.description ?? null,
            startsAt: dueDate!,
            createdById: userId,
            visibility: "PRIVATE",
            source: "GOOGLE_CLASSROOM",
            externalId: cw.id,
          },
          update: {
            title: `${course.name}: ${cw.title}`,
            description: cw.description ?? null,
            startsAt: dueDate!,
          },
        });
      } else {
        await prisma.calendarEvent
          .delete({
            where: {
              createdById_source_externalId: { createdById: userId, source: "GOOGLE_CLASSROOM", externalId: cw.id },
            },
          })
          .catch(() => undefined); // fine if it never existed
      }
    }
  }

  const lastSyncedAt = new Date();
  await prisma.googleClassroomIntegration.update({
    where: { id: integration.id },
    data: { lastSyncedAt, status: "CONNECTED" },
  });

  return {
    coursesSynced: googleCourses.length,
    assignmentsSynced,
    submissionsSynced,
    lastSyncedAt: lastSyncedAt.toISOString(),
  };
}
