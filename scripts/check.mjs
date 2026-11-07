import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");
const work = path.join(root, "work");
const baseUrl = process.env.PREVIEW_URL || "http://127.0.0.1:4173";
const browserPath =
  process.env.BROWSER_PATH ||
  (fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");

fs.mkdirSync(work, { recursive: true });
const failures = [];

const browser = await chromium.launch({ executablePath: browserPath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (error) => failures.push(error.message));

async function inspect(url, screenshot) {
  await page.goto(`${baseUrl}${url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(600);
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    brokenImages: [...document.images].filter((image) => image.complete && !image.naturalWidth).map((image) => image.src),
    headings: document.querySelectorAll("h1").length,
  }));
  if (metrics.scrollWidth > metrics.clientWidth + 1) failures.push(`${url} overflows horizontally`);
  if (metrics.brokenImages.length) failures.push(`${url} has broken images`);
  if (metrics.headings !== 1) failures.push(`${url} should have one h1, found ${metrics.headings}`);
  await page.screenshot({ path: path.join(work, screenshot) });
}

await inspect("/", "homepage-desktop.png");
await inspect("/project/deepseek-ocr-reproduction.html", "project-desktop.png");
await inspect("/cv.html", "cv-desktop.png");

await page.getByRole("button", { name: "Toggle color theme" }).click();
await page.screenshot({ path: path.join(work, "homepage-dark.png") });
await page.getByRole("button", { name: "Toggle color theme" }).click();

await page.setViewportSize({ width: 390, height: 844 });
await inspect("/", "homepage-mobile.png");
await inspect("/project/deepseek-ocr-reproduction.html", "project-mobile.png");
await page.getByRole("button", { name: "Open navigation" }).click();

if (fs.existsSync(path.join(docs, "notes.html")) || fs.existsSync(path.join(docs, "cs61b"))) {
  failures.push("Course notes should not be generated in the personal homepage repository");
}

await browser.close();
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Checked personal homepage at desktop and mobile sizes.");
}
