// v2 capture: real Ask/analyst flow (fixture mode). Run from repo root with app on :3100.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = "brag-output-v2/composition/assets/ui";
mkdirSync(OUT, { recursive: true });
const PROMPT = "I'm a content creator. Where do I lose potential scrollers, and what should I change to keep them watching?";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-gl=angle", "--use-angle=metal"] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2, colorScheme: "dark" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const boxes = {};
const box = async (key, loc) => { const b = await loc.boundingBox(); boxes[key] = b; return b; };

await page.goto(BASE + "/");
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByText("Synthetic Attention Laboratory").waitFor();
await page.getByRole("button", { name: /Run on development fixture/ }).click();
await page.getByText("DEV FIXTURE · NOT ORIANE OUTPUT").waitFor({ timeout: 60000 });
await page.waitForTimeout(2500);
for (let k = 0; k < 40; k++) await page.keyboard.press("Shift+ArrowLeft");
for (let k = 0; k < 44; k++) await page.keyboard.press("ArrowRight");
await page.waitForTimeout(500);
await shot("A-workspace");

const ask = page.getByLabel("Ask NEURASCOPE");
await box("ask", ask);
await ask.click();
await page.waitForTimeout(250);
await shot("B-ask-focus");

// accelerated typing states (12 cumulative prefixes)
const N = 12;
for (let i = 1; i <= N; i++) {
  const len = Math.round((PROMPT.length * i) / N);
  await ask.fill(PROMPT.slice(0, len));
  await page.waitForTimeout(80);
  await shot(`C-type-${String(i).padStart(2, "0")}`);
}
await ask.press("Enter");
await page.getByLabel("Dismiss answer").waitFor({ timeout: 20000 });
await page.waitForTimeout(700);
await shot("D-answer");
const card = page.getByLabel("Dismiss answer").locator("xpath=ancestor::div[contains(@class,'glass')][1]");
await box("answer1", card);
boxes.answer1Text = await card.locator("p").innerText();
const focus = page.getByRole("button", { name: /^Focus F\d$/ });
await box("focusBtn", focus);
await focus.click();
await page.getByText(/^ATTENTION FRACTURE /).waitFor();
await page.waitForTimeout(1200);
await shot("E-focus-fracture");

const chip = page.getByRole("button", { name: "Which patch has the most upside?" });
await box("chip", chip);
await chip.click();
await page.getByText(/Start with F\d/).waitFor({ timeout: 20000 });
await page.waitForTimeout(700);
await shot("F-answer-upside");
const card2 = page.getByLabel("Dismiss answer").locator("xpath=ancestor::div[contains(@class,'glass')][1]");
await box("answer2", card2);
boxes.answer2Text = await card2.locator("p").innerText();
const sim = card2.getByRole("button", { name: /^Simulate / });
await box("simulate", sim);
await sim.click();
await page.getByText(/^COUNTERFACTUAL · /).waitFor();
await page.getByText(/[+−-]?\d+\.\d pts/).first().waitFor();
await page.waitForTimeout(1500);
await shot("G-counterfactual");

const toggle = page.getByTestId("brief-toggle");
await box("briefToggle", toggle);
await toggle.click();
const brief = page.getByTestId("preflight-brief");
await brief.waitFor();
await page.waitForTimeout(700);
await shot("H-brief");
const bsim = brief.getByTestId("brief-simulate");
if (await bsim.isVisible()) { await bsim.click(); await page.waitForTimeout(150); await shot("H-brief-rerunning"); }
await brief.getByTestId("brief-result").waitFor({ timeout: 30000 });
await page.waitForTimeout(1200);
await shot("I-brief-result");
await page.setViewportSize({ width: 1440, height: 1100 });
await page.waitForTimeout(900);
await shot("T-brief-result");

writeFileSync(`${OUT}/boxes.json`, JSON.stringify(boxes, null, 2));
console.log(JSON.stringify(boxes, null, 1));
console.log("errors:", errors);
await browser.close();
