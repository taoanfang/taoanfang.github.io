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
const htmlFiles = [];
const markdownFiles = [path.join(root, "README.md"), path.join(root, "notes", "README.md")];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else {
      if (entry.name.endsWith(".html")) htmlFiles.push(fullPath);
      if (entry.name.endsWith(".md")) markdownFiles.push(fullPath);
    }
  }
}
walk(docs);
walk(path.join(root, "notes"));

for (const file of [...new Set(markdownFiles)]) {
  const markdown = fs.readFileSync(file, "utf8");
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#|data:)/.test(target)) continue;
    const clean = decodeURIComponent(target.split("#")[0].split("?")[0]);
    if (!clean) continue;
    const resolved = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(resolved)) failures.push(`Broken Markdown link: ${path.relative(root, file)} -> ${target}`);
  }
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#|data:)/.test(target)) continue;
    const clean = decodeURIComponent(target.split("#")[0].split("?")[0]);
    if (!clean) continue;
    const resolved = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(resolved)) failures.push(`Broken asset: ${path.relative(root, file)} -> ${target}`);
  }
}

const browser = await chromium.launch({ executablePath: browserPath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const runtimeErrors = [];
page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});
page.on("requestfailed", (request) => {
  runtimeErrors.push(`Request failed: ${request.url()} (${request.failure()?.errorText})`);
});

async function inspect(url, screenshotName, checks = {}) {
  await page.goto(`${baseUrl}${url}`, { waitUntil: "networkidle" });
  if (checks.katex) {
    await page.waitForFunction(() => document.querySelectorAll(".katex").length > 0, null, { timeout: 5000 });
  }
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
    headings: document.querySelectorAll("h1").length,
  }));
  if (metrics.scrollWidth > metrics.clientWidth + 1) {
    failures.push(`${url} overflows horizontally: ${metrics.scrollWidth}px > ${metrics.clientWidth}px`);
  }
  if (metrics.brokenImages.length) failures.push(`${url} has broken images: ${metrics.brokenImages.join(", ")}`);
  if (metrics.headings !== 1) failures.push(`${url} should have exactly one h1, found ${metrics.headings}`);
  await page.screenshot({ path: path.join(work, screenshotName), fullPage: false });
}

await inspect("/", "home-desktop.png");
await inspect("/cs61b/", "course-desktop.png");
await inspect("/cs229/01-linear-regression.html", "note-desktop.png", { katex: true });

await page.getByRole("button", { name: "切换深浅色主题" }).click();
await page.screenshot({ path: path.join(work, "note-dark-desktop.png") });
await page.getByRole("button", { name: "切换深浅色主题" }).click();

await page.getByRole("button", { name: "搜索全部笔记" }).first().click();
await page.locator("[data-search-input]").fill("梯度下降");
await page.waitForTimeout(250);
const searchCount = await page.locator(".search-result").count();
if (!searchCount) failures.push("Search returned no results for 梯度下降");
await page.screenshot({ path: path.join(work, "search-desktop.png") });
await page.locator("[data-search-close]").click();

await page.setViewportSize({ width: 390, height: 844 });
await inspect("/", "home-mobile.png");
await inspect("/cs61b/", "course-mobile.png");
await inspect("/python/10-numpy-matplotlib.html", "note-mobile.png");

await page.getByRole("button", { name: "展开导航" }).click();
const navVisible = await page.locator(".site-nav").evaluate((element) => getComputedStyle(element).display !== "none");
if (!navVisible) failures.push("Mobile navigation did not open");
await page.screenshot({ path: path.join(work, "nav-mobile.png") });

await browser.close();

if (runtimeErrors.length) failures.push(...runtimeErrors);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Checked ${htmlFiles.length} HTML files at desktop and mobile sizes.`);
}
