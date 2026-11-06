import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "content", "courses.json"), "utf8"));
const sourceRoot = process.env.OBSIDIAN_VAULT || config.sourceRoot;

if (!fs.existsSync(sourceRoot)) {
  throw new Error(`Obsidian source root not found: ${sourceRoot}`);
}

const imageNames = new Set();
for (const course of config.courses) {
  for (const note of course.notes) {
    const sourcePath = path.join(sourceRoot, note.source);
    const markdown = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
    for (const match of markdown.matchAll(/!\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
      imageNames.add(match[1].trim());
    }
  }
  if (course.cover?.kind === "image" && course.cover.source) {
    imageNames.add(course.cover.source);
  }
}

const imageIndex = new Map();
function findImages(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".obsidian" || entry.name === "node_modules") continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      findImages(fullPath);
    } else if (/\.(png|jpe?g|gif|webp|svg)$/i.test(entry.name) && imageNames.has(entry.name)) {
      if (!imageIndex.has(entry.name)) imageIndex.set(entry.name, fullPath);
    }
  }
}
findImages(sourceRoot);

function copyImage(name, courseId) {
  const source = imageIndex.get(name);
  if (!source) {
    console.warn(`Missing image: ${name}`);
    return;
  }
  const targetDir = path.join(root, "assets", "images", courseId);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(source, path.join(targetDir, name));
}

function stripLeadingTitle(markdown) {
  const lines = markdown.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n");
  while (lines.length && !lines[0].trim()) lines.shift();
  if (lines.length && /^#\s+/.test(lines[0])) {
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  }
  return lines.join("\n").trim();
}

function normalizeObsidian(markdown, courseId) {
  return markdown
    .replace(/!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, rawName, size) => {
      const name = rawName.trim();
      copyImage(name, courseId);
      const width = size && /^\d+$/.test(size.trim()) ? ` width="${size.trim()}"` : "";
      return `<img src="../../docs/assets/images/${courseId}/${encodeURI(name)}" alt="${path.parse(name).name}"${width}>`;
    })
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
    .replace(/==([^=\n]+)==/g, "==$1==")
    .replace(/[ \t]+$/gm, "");
}

for (const course of config.courses) {
  const noteDir = path.join(root, "notes", course.id);
  fs.rmSync(noteDir, { recursive: true, force: true });
  fs.mkdirSync(noteDir, { recursive: true });
  for (const note of course.notes) {
    const source = fs.readFileSync(path.join(sourceRoot, note.source), "utf8");
    const body = normalizeObsidian(stripLeadingTitle(source), course.id);
    const output = `# ${note.title}\n\n${body}\n`;
    fs.writeFileSync(path.join(noteDir, `${note.slug}.md`), output, "utf8");
  }

  if (course.cover?.kind === "image" && course.cover.source) {
    copyImage(course.cover.source, course.id);
  } else if (course.cover?.kind === "external-image" && course.cover.source) {
    const targetDir = path.join(root, "assets", "images", course.id);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.copyFileSync(course.cover.source, path.join(targetDir, path.basename(course.cover.source)));
  }
}

console.log(`Imported ${config.courses.reduce((sum, course) => sum + course.notes.length, 0)} notes from ${sourceRoot}`);
