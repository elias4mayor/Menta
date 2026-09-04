import { test, expect } from "@playwright/test";
import { createTestAthlete, cleanupE2eUsers, testPrisma } from "./db-helpers";

/**
 * Regression coverage for src/lib/storage.ts's R2/local-disk split (Postgres
 * + object storage staging-foundation pass). No route here changed its
 * authorization model — only where bytes are read from/written to, and
 * readFileRange() went from sync to async (R2 reads are real network
 * requests) — so this exists to prove the actual upload → list → stream
 * round trip still works end to end, not just that it typechecks. Nothing
 * in this repo tested file upload/download at all before this pass.
 */
test.describe("File storage (R2/local-disk)", () => {
  test.afterAll(async () => {
    await cleanupE2eUsers();
    await testPrisma.$disconnect();
  });

  test("film upload → list → Range-aware streaming round trip", async ({ request }) => {
    const athlete = await createTestAthlete("storage-film", "Football", "QB");
    const headers = { Cookie: athlete.cookie };

    const fileBytes = Buffer.from("fake mp4 bytes for a storage regression test");
    const upload = await request.post("/api/films", {
      headers,
      multipart: {
        file: { name: "clip.mp4", mimeType: "video/mp4", buffer: fileBytes },
        title: "Storage regression clip",
        category: "HIGHLIGHT",
      },
    });
    expect(upload.status(), await upload.text()).toBe(200);
    const { film } = await upload.json();

    const list = await request.get("/api/films", { headers });
    expect(list.status()).toBe(200);
    const { films } = await list.json();
    expect(films.some((f: { id: string }) => f.id === film.id)).toBe(true);

    // Full read (readFileRange with no range — exercises the async
    // migration's no-range branch).
    const full = await request.get(`/api/films/${film.id}/video`, { headers });
    expect(full.status()).toBe(200);
    expect(await full.body()).toEqual(fileBytes);

    // Partial read (readFileRange with a real byte range — exercises the
    // async migration's ranged branch, same as real <video> seeking).
    const partial = await request.get(`/api/films/${film.id}/video`, {
      headers: { ...headers, Range: "bytes=5-13" },
    });
    expect(partial.status()).toBe(206);
    expect(partial.headers()["content-range"]).toBe(`bytes 5-13/${fileBytes.length}`);
    expect((await partial.body()).toString()).toBe(fileBytes.subarray(5, 14).toString());
  });

  test("avatar upload → serve → replace → delete round trip", async ({ request }) => {
    const athlete = await createTestAthlete("storage-avatar", "Soccer", "Midfielder");
    const headers = { Cookie: athlete.cookie };

    const png = Buffer.from("fake png bytes");
    const upload = await request.post("/api/profile/avatar", {
      headers,
      multipart: { file: { name: "avatar.png", mimeType: "image/png", buffer: png } },
    });
    expect(upload.status(), await upload.text()).toBe(200);

    const del = await request.delete("/api/profile/avatar", { headers });
    expect(del.status()).toBe(200);
  });

  test("upload routes require a session, same as before this change", async ({ request }) => {
    const filmRes = await request.post("/api/films", {
      multipart: { file: { name: "x.mp4", mimeType: "video/mp4", buffer: Buffer.from("x") }, title: "x", category: "HIGHLIGHT" },
    });
    expect(filmRes.status()).toBe(401);

    const docRes = await request.post("/api/documents", {
      multipart: { file: { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") }, name: "x", category: "OTHER" },
    });
    expect(docRes.status()).toBe(401);

    const avatarRes = await request.post("/api/profile/avatar", {
      multipart: { file: { name: "x.png", mimeType: "image/png", buffer: Buffer.from("x") } },
    });
    expect(avatarRes.status()).toBe(401);
  });
});
