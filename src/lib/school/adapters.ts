import "server-only";
import { z } from "zod";
import { schoolApiUrl, schoolFetch, SchoolHttpError } from "./http";
import type { SchoolInstance } from "./config";
import type { SchoolSnapshot } from "./catalog";

const id = z.union([z.number(), z.string()]).transform(String);
const number = z.number().finite().nullable().optional();
const date = (v: string | null | undefined) => v && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
const encode = encodeURIComponent;
async function pages(config: SchoolInstance, token: string, path: string): Promise<unknown[]> {
  const prefix = config.provider === "canvas" ? "/api/v1/" : "/learn/api/public/";
  const result: unknown[] = [];
  let next: string | undefined = path;
  for (let count = 0; next && count < 20; count++) {
    const { data, headers } = await schoolFetch(schoolApiUrl(config.baseUrl, next, prefix), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (config.provider === "canvas") {
      result.push(...z.array(z.unknown()).parse(data));
      next = headers.get("link")?.split(",").map((link) => link.match(/<([^>]+)>;\s*rel="next"/)).find(Boolean)?.[1];
    } else {
      const page = z.object({ results: z.array(z.unknown()), paging: z.object({ nextPage: z.string().optional() }).optional() }).parse(data);
      result.push(...page.results); next = page.paging?.nextPage;
    }
  }
  if (next) throw new Error("school_pagination_limit"); // Never silently label a partial import as complete.
  return result;
}
export async function readSchool(config: SchoolInstance, token: string): Promise<SchoolSnapshot> {
  const courses: SchoolSnapshot["courses"] = [];
  if (config.provider === "canvas") {
    const all = await pages(config, token, "/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100");
    const parsed = z.array(z.object({ id, name: z.string().optional(), enrollments: z.array(z.object({ type: z.string() })).optional() })).parse(all);
    if (parsed.length > 30) throw new Error("school_course_limit");
    for (const course of parsed) {
      // Explicit enrollment filter on the request; don't import teacher-only courses.
      if (course.enrollments && !course.enrollments.some((e) => e.type === "student")) continue;
      const items = z.array(z.object({ id, name: z.string(), due_at: z.string().nullable().optional(), points_possible: number, submission: z.object({ score: number }).nullable().optional() })).parse(await pages(config, token, `/api/v1/courses/${encode(course.id)}/assignments?include[]=submission&per_page=100`));
      courses.push({ id: course.id, name: course.name || "Course", items: items.map((a) => ({ id: a.id, title: a.name, dueAt: date(a.due_at), score: a.submission?.score ?? null, possible: a.points_possible ?? null })) });
    }
  } else {
    const me = await schoolFetch(schoolApiUrl(config.baseUrl, "/learn/api/public/v1/users/me", "/learn/api/public/"), { headers: { Authorization: `Bearer ${token}` } });
    const userId = z.object({ id }).parse(me.data).id;
    const memberships = z.array(z.object({ courseId: id, courseRoleId: z.string(), course: z.object({ name: z.string() }).optional() })).parse(await pages(config, token, "/learn/api/public/v1/users/me/courses?expand=course"));
    if (memberships.length > 30) throw new Error("school_course_limit");
    for (const membership of memberships.filter((m) => m.courseRoleId === "Student")) {
      const columns = z.array(z.object({ id, name: z.string(), score: z.object({ possible: number }).optional(), grading: z.object({ due: z.string().nullable().optional() }).optional(), availability: z.object({ available: z.string().optional() }).optional() })).parse(await pages(config, token, `/learn/api/public/v2/courses/${encode(membership.courseId)}/gradebook/columns`));
      if (columns.length > 200) throw new Error("school_item_limit");
      const items: SchoolSnapshot["courses"][number]["items"] = [];
      for (const column of columns.filter((c) => c.availability?.available !== "No")) {
        let score: number | null = null;
        try {
          const grade = await schoolFetch(schoolApiUrl(config.baseUrl, `/learn/api/public/v1/courses/${encode(membership.courseId)}/gradebook/columns/${encode(column.id)}/users/${encode(userId)}`, "/learn/api/public/"), { headers: { Authorization: `Bearer ${token}` } });
          score = z.object({ score: number }).parse(grade.data).score ?? null;
        } catch (error) { if (!(error instanceof SchoolHttpError) || error.status !== 404) throw error; }
        items.push({ id: column.id, title: column.name, dueAt: date(column.grading?.due), score, possible: column.score?.possible ?? null });
      }
      courses.push({ id: membership.courseId, name: membership.course?.name || "Course", items });
    }
  }
  return { courses };
}
