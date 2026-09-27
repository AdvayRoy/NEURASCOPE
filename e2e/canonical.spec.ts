import { expect, test, type Page } from "@playwright/test";

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `e2e/.results/shots/${test.info().project.name}-${name}.png` });

async function stateTime(page: Page) {
  const t = await page.getByText(/^CORTEX state · [\d.]+ s$/).textContent();
  return Number(t!.match(/([\d.]+) s/)![1]);
}

test("fixture → analysis → playback → scrub → cohort → fracture → evidence → patch → refresh restore", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/api/oriane/resolve")) errors.push(`${r.status()} ${r.url()}`);
  });

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByText("Synthetic Attention Laboratory")).toBeVisible();

  await page.getByRole("button", { name: /Run on development fixture/ }).click();
  const badge = page.getByText("DEV FIXTURE · NOT ORIANE OUTPUT");
  await expect(badge).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("ORIANE LIVE")).toHaveCount(0);
  await shot(page, "01-workspace");

  // Playback advances the shared clock.
  const t0 = await stateTime(page);
  await page.getByRole("button", { name: "Play" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Pause" }).click();
  expect(await stateTime(page)).toBeGreaterThan(t0 + 0.5);

  // Scrub the temporal instrument.
  const tl = page.locator('section[aria-label="Temporal instrument"] svg').first();
  const box = (await tl.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.3);
  const scrubbed = await stateTime(page);
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.3);
  expect(Math.abs((await stateTime(page)) - scrubbed)).toBeGreaterThan(1);

  // Cohort selection drives the inspector.
  await page.getByTestId("reviewer-cold").click();
  await expect(page.getByText(/^Cold Scroller · hazard/)).toBeVisible();
  await shot(page, "02-cohort");

  // Fracture → forensic view.
  await page.getByTestId("fracture-item").first().click();
  await expect(page.getByText(/^ATTENTION FRACTURE /)).toBeVisible();
  await shot(page, "03-fracture");

  // Evidence drawer.
  await page.locator('button[title*="open evidence"]').first().click();
  const drawer = page.getByRole("dialog", { name: "Evidence" }).or(page.locator('[aria-label="Evidence"]'));
  await expect(drawer.first()).toBeVisible();
  await shot(page, "04-evidence");
  await page.keyboard.press("Escape");
  await expect(drawer.first()).toBeHidden();

  // Counterfactual rerun.
  await page.getByRole("button", { name: "Simulate patch" }).first().click();
  await expect(page.getByText(/^COUNTERFACTUAL · /)).toBeVisible();
  await expect(page.getByText(/[+−-]?\d+\.\d pts/).first()).toBeVisible();
  await shot(page, "05-counterfactual");

  // Pre-flight brief: primary risk → simulate → real delta → jump to the fracture.
  await page.keyboard.press("Escape");
  await page.getByTestId("brief-toggle").click();
  const brief = page.getByTestId("preflight-brief");
  await expect(brief).toBeVisible();
  const primary = (await brief.getByText(/^F\d$/).first().textContent())!;
  await expect(brief.getByText(/pts survival$/)).toBeVisible();
  await expect(brief.getByText(/Corpus evidence · not retention ground truth|Oriane/).first()).toBeVisible();
  const simulate = brief.getByTestId("brief-simulate");
  if (await simulate.isVisible()) await simulate.click();
  await expect(brief.getByTestId("brief-result")).toBeVisible({ timeout: 30_000 });
  await expect(brief.getByText(/[+−-]?\d+\.\d pts/).first()).toBeVisible();
  await shot(page, "05b-brief");
  await brief.getByTestId("brief-jump").click();
  await expect(brief).toBeHidden();
  await expect(page.getByText(`ATTENTION FRACTURE ${primary}`)).toBeVisible();
  await expect(page.getByText(/^COUNTERFACTUAL · /)).toBeVisible();

  // Refresh restores the prior completed analysis with its provenance.
  await page.reload();
  await expect(badge).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId("fracture-item").first()).toBeVisible();
  await shot(page, "06-restored");

  expect(errors).toEqual([]);
});
