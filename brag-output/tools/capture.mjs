// Captures real NEURASCOPE UI states (fixture mode) for the /brag composition.
// Run from repo root: node brag-output/tools/capture.mjs   (app on http://localhost:3100)
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = "brag-output/composition/assets/ui";
mkdirSync(`${OUT}/seq`, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-gl=angle", "--use-angle=metal"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2, colorScheme: "dark" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const elshot = async (loc, name) => { try { await loc.screenshot({ path: `${OUT}/${name}.png` }); } catch (e) { console.log("elshot skip", name, e.message); } };

await page.goto(BASE + "/");
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByText("Synthetic Attention Laboratory").waitFor();
await page.waitForTimeout(800);
await shot("01-input");

// Loading sequence
await page.getByRole("button", { name: /Run on development fixture/ }).click();
const badge = page.getByText("DEV FIXTURE · NOT ORIANE OUTPUT");
let i = 0;
const t0 = Date.now();
while (!(await badge.isVisible().catch(() => false)) && Date.now() - t0 < 60000) {
  await page.screenshot({ path: `${OUT}/02-loading-${String(i++).padStart(2, "0")}.png` });
  await page.waitForTimeout(250);
}
await badge.waitFor({ timeout: 60000 });
await page.waitForTimeout(2500); // let GLB / brain settle
await shot("03-workspace");

// Rewind to 0 then step 0.1s per frame → deterministic playback sequence
for (let k = 0; k < 40; k++) await page.keyboard.press("Shift+ArrowLeft");
await page.waitForTimeout(300);
for (let f = 0; f < 70; f++) {
  await page.screenshot({ path: `${OUT}/seq/frame-${String(f).padStart(3, "0")}.png` });
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(60);
}

// Brain modes
await page.getByRole("tab", { name: "NETWORKS" }).click(); await page.waitForTimeout(900); await shot("04-networks");
await page.getByRole("tab", { name: "NEURAL" }).click(); await page.waitForTimeout(900); await shot("04-neural");
await page.getByRole("tab", { name: "CORTEX" }).click(); await page.waitForTimeout(600);

// Fracture F1
await page.keyboard.press("1");
await page.getByText(/^ATTENTION FRACTURE /).waitFor();
await page.waitForTimeout(1200);
await shot("05-fracture-f1");
const inspector = page.getByText(/^ATTENTION FRACTURE /).locator("xpath=ancestor::*[self::aside or self::section][1]");
await elshot(inspector, "05-inspector");
await elshot(page.locator('section[aria-label="Temporal instrument"]'), "05-timeline");

// Evidence drawer
await page.locator('button[title*="open evidence"]').first().click();
const drawer = page.getByRole("dialog", { name: "Evidence" }).or(page.locator('[aria-label="Evidence"]'));
await drawer.first().waitFor();
await page.waitForTimeout(800);
await shot("06-evidence");
await page.keyboard.press("Escape");
await drawer.first().waitFor({ state: "hidden" });

// Counterfactual
await page.getByRole("button", { name: "Simulate patch" }).first().click();
await page.getByText(/^COUNTERFACTUAL · /).waitFor();
await page.getByText(/[+−-]?\d+\.\d pts/).first().waitFor();
await page.waitForTimeout(1500);
await shot("07-counterfactual");
await elshot(page.getByText(/^COUNTERFACTUAL · /).locator("xpath=ancestor::*[self::aside or self::section][1]"), "07-inspector-cf");

// Pre-flight brief
await page.keyboard.press("Escape");
await page.getByTestId("brief-toggle").click();
const brief = page.getByTestId("preflight-brief");
await brief.waitFor();
await page.waitForTimeout(900);
await shot("08-brief");
const sim = brief.getByTestId("brief-simulate");
if (await sim.isVisible()) {
  await sim.click();
  await page.waitForTimeout(200);
  await shot("08-brief-rerunning");
}
await brief.getByTestId("brief-result").waitFor({ timeout: 30000 });
await page.waitForTimeout(1500);
await shot("09-brief-result");
await elshot(brief, "09-brief-panel");

// Ask bar
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.keyboard.press("1");
await page.getByText(/^ATTENTION FRACTURE /).waitFor();
const ask = page.getByLabel("Ask NEURASCOPE");
await ask.click();
await ask.type("Why do people drop here?", { delay: 35 });
await page.waitForTimeout(300);
await shot("10-ask-typed");
await ask.press("Enter");
await page.getByLabel("Dismiss answer").waitFor({ timeout: 20000 });
await page.waitForTimeout(1200);
await shot("10-ask-answer");

console.log("errors:", errors);
await browser.close();
