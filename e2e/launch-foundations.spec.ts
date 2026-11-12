import { test, expect } from "@playwright/test";
import { signupSchema } from "../src/lib/validation";
import { isEligibleBirthDate, LEGAL_VERSION } from "../src/lib/legal-version";

const signup = { name: "Test Athlete", email: "athlete@example.test", password: "a-long-test-password", dateOfBirth: "2000-01-01", acceptedTerms: true, legalVersion: LEGAL_VERSION };

test("birthday boundary and invalid calendar dates", () => {
  const now = new Date("2026-11-12T12:00:00Z");
  expect(isEligibleBirthDate("2012-11-12", now)).toBe(true);
  expect(isEligibleBirthDate("2012-11-13", now)).toBe(false);
  expect(isEligibleBirthDate("2027-01-01", now)).toBe(false);
  expect(isEligibleBirthDate("2000-02-30", now)).toBe(false);
  expect(isEligibleBirthDate("2000-02-29", now)).toBe(true);
  expect(isEligibleBirthDate("not-a-date", now)).toBe(false);
});

test("signup schema requires current affirmative acknowledgement and date of birth", () => {
  expect(signupSchema.safeParse(signup).success).toBe(true);
  for (const change of [{ acceptedTerms: false }, { acceptedTerms: undefined }, { legalVersion: "old" }, { dateOfBirth: undefined }, { dateOfBirth: "2020-01-01" }]) {
    expect(signupSchema.safeParse({ ...signup, ...change }).success).toBe(false);
  }
});

test("signup API rejects a direct request bypassing the checkbox", async ({ request }) => {
  const response = await request.post("/api/auth/signup", { data: { ...signup, acceptedTerms: false } });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("accept");
});

test("signup API rejects a stale legal version", async ({ request }) => {
  const response = await request.post("/api/auth/signup", { data: { ...signup, legalVersion: "old" } });
  expect(response.status()).toBe(400);
  expect((await response.json()).error).toContain("Refresh");
});

test("product catalog advertises concepts without fabricated sales data", async ({ request }) => {
  const response = await request.get("/api/products");
  expect(response.status()).toBe(200);
  const catalog = await response.json();
  expect(catalog.products).toHaveLength(5);
  expect(new Set(catalog.products.map((p: { id: string }) => p.id)).size).toBe(5);
  for (const product of catalog.products) {
    expect(["Concept", "Prototype idea"]).toContain(product.status);
    expect(product.price).toBeUndefined();
    expect(product.checkoutUrl).toBeUndefined();
  }
});

test("gear page offers a usable packing checklist on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/gear");
  await expect(page.getByRole("heading", { name: "Built around your game." })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("0 / 6 packed");
  await page.getByRole("checkbox", { name: "Water bottle" }).check();
  await expect(page.getByRole("status")).toHaveText("1 / 6 packed");
  await page.getByRole("button", { name: "Reset checklist" }).click();
  await expect(page.getByRole("status")).toHaveText("0 / 6 packed");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
