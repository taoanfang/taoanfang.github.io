import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import mark from "markdown-it-mark";
import taskLists from "markdown-it-task-lists";
import hljs from "highlight.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "docs");
const config = JSON.parse(fs.readFileSync(path.join(root, "content", "courses.json"), "utf8"));
const hasResume = Boolean(config.resume?.path && fs.existsSync(path.join(root, config.resume.path)));
const generatedAt = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Singapore",
}).format(new Date());

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, "assets"), { recursive: true });

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, language) {
    if (language && hljs.getLanguage(language)) {
      return `<pre class="hljs"><code>${hljs.highlight(code, { language }).value}</code></pre>`;
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(code)}</code></pre>`;
  },
})
  .use(anchor, {
    slugify(value) {
      return value
        .trim()
        .toLowerCase()
        .replace(/[`~!@#$%^&*()+=[\]{};:'",.<>/?\\|]/g, "")
        .replace(/\s+/g, "-");
    },
  })
  .use(mark)
  .use(taskLists, { enabled: false });

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const stripTags = (value = "") =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~=|]/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const readingTime = (text) => {
  const cjk = (text.match(/[\u3400-\u9fff]/g) || []).length;
  const latin = (text.replace(/[\u3400-\u9fff]/g, " ").match(/[A-Za-z0-9_]+/g) || []).length;
  return Math.max(1, Math.ceil(cjk / 360 + latin / 220));
};

const coverImage = (course) => {
  if (!course.cover?.source) return "";
  if (course.cover.kind !== "image" && course.cover.kind !== "external-image") return "";
  const fileName = path.basename(course.cover.source);
  return `assets/images/${course.id}/${encodeURI(fileName)}`;
};

const courseGroups = {
  cs61b: [
    { title: "Java 语言基础", from: 1, to: 10 },
    { title: "数据结构基础", from: 11, to: 18 },
    { title: "复杂度与树结构", from: 19, to: 20 },
  ],
  python: [
    { title: "语言基础与程序流程", from: 1, to: 5 },
    { title: "对象模型与数据处理", from: 6, to: 9 },
    { title: "数据分析工具箱", from: 10, to: 12 },
  ],
  cs229: [
    { title: "监督学习基础", from: 1, to: 5 },
    { title: "间隔、对偶与核方法", from: 6, to: 7 },
  ],
};

const noteRecords = [];
for (const course of config.courses) {
  course.notes.forEach((note, index) => {
    note.order = index + 1;
    note.course = course;
    note.href = `${course.id}/${note.slug}.html`;
    note.path = path.join(root, "notes", course.id, `${note.slug}.md`);
    note.markdown = fs.readFileSync(note.path, "utf8").replace(/\r\n/g, "\n");
    note.plain = stripTags(note.markdown).slice(0, 1300);
    note.minutes = readingTime(note.plain);
    noteRecords.push(note);
  });
}

function themeHead(rootPrefix = "") {
  return `<script>
    (() => {
      const saved = localStorage.getItem("notes-theme");
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = saved || (dark ? "dark" : "light");
    })();
  </script>`;
}

function icon(name, size = 18) {
  return `<i data-lucide="${name}" width="${size}" height="${size}" aria-hidden="true"></i>`;
}

function siteHeader(rootPrefix = "", current = "") {
  const links = config.courses
    .map(
      (course) =>
        `<a class="${current === course.id ? "is-current" : ""}" href="${rootPrefix}${course.id}/index.html">${course.title}</a>`,
    )
    .join("");
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="${rootPrefix}index.html" aria-label="返回首页">
        <span class="brand-mark">LN</span>
        <span class="brand-text">Learning Notes</span>
      </a>
      <button class="menu-button" type="button" data-menu-toggle aria-label="展开导航" aria-expanded="false">
        ${icon("menu", 20)}
      </button>
      <nav class="site-nav" aria-label="课程导航">
        ${links}
        <a href="${rootPrefix}index.html#course-index">索引</a>
        ${hasResume ? `<a href="${rootPrefix}${config.resume.path}" target="_blank" rel="noopener">${escapeHtml(config.resume.title)}</a>` : ""}
      </nav>
      <div class="header-actions">
        <button class="search-trigger" type="button" data-search-open aria-label="搜索全部笔记">
          ${icon("search", 17)}
          <span>搜索</span>
          <kbd>/</kbd>
        </button>
        <button class="icon-button" type="button" data-theme-toggle aria-label="切换深浅色主题">
          ${icon("sun-moon", 18)}
        </button>
        <a class="icon-button" href="${config.repository}" target="_blank" rel="noopener" aria-label="打开 GitHub 仓库">
          ${icon("github", 18)}
        </a>
      </div>
    </div>
  </header>`;
}

function searchDialog(rootPrefix = "") {
  return `<dialog class="search-dialog" data-search-dialog>
    <div class="search-shell">
      <div class="search-field">
        ${icon("search", 20)}
        <input type="search" placeholder="搜索概念、课程或代码关键词" aria-label="搜索笔记" data-search-input autocomplete="off">
        <button class="icon-button" type="button" data-search-close aria-label="关闭搜索">${icon("x", 18)}</button>
      </div>
      <div class="search-meta" data-search-meta>输入关键词开始搜索</div>
      <div class="search-results" data-search-results></div>
    </div>
  </dialog>`;
}

function siteFooter(rootPrefix = "") {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>Learning Notes</strong>
        <p>${escapeHtml(config.subtitle)}</p>
      </div>
      <div class="footer-meta">
        <span>${noteRecords.length} 篇笔记</span>
        <span>更新于 ${escapeHtml(generatedAt)}</span>
        <a href="${rootPrefix}index.html#course-index">全部课程</a>
        <a href="${config.repository}" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
  </footer>`;
}

function pageShell({ title, description, rootPrefix, bodyClass, current, content }) {
  const safeTitle = title === config.title ? title : `${title} · ${config.title}`;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description || config.description)}">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(safeTitle)}</title>
  <link rel="icon" href="${rootPrefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${rootPrefix}assets/vendor/katex.min.css">
  <link rel="stylesheet" href="${rootPrefix}assets/styles.css">
  ${themeHead(rootPrefix)}
</head>
<body class="${bodyClass}" data-root="${rootPrefix}">
  <a class="skip-link" href="#main-content">跳到正文</a>
  ${siteHeader(rootPrefix, current)}
  ${content}
  ${siteFooter(rootPrefix)}
  ${searchDialog(rootPrefix)}
  <script src="${rootPrefix}assets/vendor/lucide.min.js"></script>
  <script src="${rootPrefix}assets/vendor/katex.min.js"></script>
  <script src="${rootPrefix}assets/vendor/auto-render.min.js"></script>
  <script src="${rootPrefix}assets/app.js"></script>
</body>
</html>`;
}

function courseCard(course, rootPrefix = "") {
  const cover = coverImage(course);
  let visual = "";
  if (cover) {
    visual = `<div class="course-visual course-visual-image">
      <img src="${rootPrefix}${cover}" alt="${escapeHtml(course.cover.alt || course.title)}" loading="lazy">
    </div>`;
  } else {
    visual = `<div class="course-visual course-visual-code" aria-label="${escapeHtml(course.cover?.alt || "Python 代码预览")}">
      <div class="code-dots"><i></i><i></i><i></i></div>
      <pre><code>${escapeHtml(course.cover?.code || "")}</code></pre>
    </div>`;
  }
  return `<article class="course-card accent-${course.accent}">
    ${visual}
    <div class="course-card-body">
      <div class="course-kicker"><span>${escapeHtml(course.eyebrow)}</span><span>${course.notes.length} 篇</span></div>
      <h2><a href="${rootPrefix}${course.id}/index.html">${escapeHtml(course.title)}</a></h2>
      <p class="course-subtitle">${escapeHtml(course.subtitle)}</p>
      <p class="course-description">${escapeHtml(course.description)}</p>
      <a class="text-link" href="${rootPrefix}${course.id}/index.html">进入课程 ${icon("arrow-up-right", 16)}</a>
    </div>
  </article>`;
}

function homePage() {
  const totalMinutes = noteRecords.reduce((sum, note) => sum + note.minutes, 0);
  const courseCards = config.courses.map((course) => courseCard(course)).join("");
  const spotlight = noteRecords
    .filter((note) => ["cs229", "cs61b"].includes(note.course.id))
    .slice(-3)
    .reverse()
    .map(
      (note) => `<a class="spotlight-item" href="${note.href}">
        <span>${escapeHtml(note.course.title)}</span>
        <strong>${escapeHtml(note.title)}</strong>
        <small>${note.minutes} 分钟</small>
      </a>`,
    )
    .join("");

  const content = `<main id="main-content">
    <section class="home-hero">
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="eyebrow">Computer Science · Notes Archive</p>
          <h1>把零散课堂笔记，整理成可以反复使用的知识库。</h1>
          <p class="hero-intro">三条课程线：Java 与数据结构、Python 程序设计、Stanford CS229 机器学习。内容从 Obsidian 整理而来，保留推导、代码、课堂图示与交叉主题。</p>
          <div class="hero-actions">
            <button class="primary-button" type="button" data-search-open>${icon("search", 17)} 搜索全部笔记</button>
            <a class="secondary-button" href="#course-index">浏览课程目录 ${icon("arrow-down", 16)}</a>
          </div>
        </div>
        <aside class="hero-ledger" aria-label="笔记库统计">
          <div><span>课程</span><strong>${config.courses.length}</strong></div>
          <div><span>笔记</span><strong>${noteRecords.length}</strong></div>
          <div><span>预计阅读</span><strong>${totalMinutes}<small> 分钟</small></strong></div>
          <p>Indexed for fast lookup. Written for review.</p>
        </aside>
      </div>
    </section>

    <section class="course-section" id="course-index">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Course Index</p>
          <h2>按课程开始复习</h2>
        </div>
        <p>每门课程都有独立目录、章节摘要和连续阅读导航。</p>
      </div>
      <div class="course-grid">${courseCards}</div>
    </section>

    <section class="study-map">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Study Map</p>
          <h2>最近适合回看的主题</h2>
        </div>
        <p>从公式推导到工程实现，按主题快速跳转。</p>
      </div>
      <div class="spotlight-list">${spotlight}</div>
    </section>
  </main>`;
  return pageShell({ title: config.title, description: config.description, rootPrefix: "", bodyClass: "home-page", current: "", content });
}

function noteGroups(course) {
  const groups = courseGroups[course.id] || [];
  return groups.length
    ? groups
    : [{ title: "全部笔记", from: 1, to: course.notes.length }];
}

function coursePage(course) {
  const groups = noteGroups(course)
    .map((group) => {
      const notes = course.notes.filter((note) => note.order >= group.from && note.order <= group.to);
      const items = notes
        .map(
          (note) => `<a class="note-row" href="${note.slug}.html">
            <span class="note-number">${String(note.order).padStart(2, "0")}</span>
            <span class="note-main">
              <strong>${escapeHtml(note.title)}</strong>
              <small>${escapeHtml(note.summary)}</small>
            </span>
            <span class="note-time">${note.minutes} 分钟</span>
            ${icon("arrow-right", 17)}
          </a>`,
        )
        .join("");
      return `<section class="course-group">
        <h2>${escapeHtml(group.title)}</h2>
        <div class="note-list">${items}</div>
      </section>`;
    })
    .join("");
  const minutes = course.notes.reduce((sum, note) => sum + note.minutes, 0);
  const content = `<main id="main-content" class="course-page accent-${course.accent}">
    <header class="page-hero course-hero">
      <div class="page-hero-inner">
        <div>
          <a class="back-link" href="../index.html">${icon("arrow-left", 15)} 全部课程</a>
          <p class="eyebrow">${escapeHtml(course.eyebrow)}</p>
          <h1>${escapeHtml(course.title)}</h1>
          <p class="page-subtitle">${escapeHtml(course.subtitle)}</p>
          <p class="page-intro">${escapeHtml(course.description)}</p>
        </div>
        <div class="course-summary">
          <span><strong>${course.notes.length}</strong> 篇笔记</span>
          <span><strong>${minutes}</strong> 分钟</span>
          <button class="search-trigger compact" type="button" data-search-open>${icon("search", 16)} 搜索本库</button>
        </div>
      </div>
    </header>
    <div class="course-content">
      ${groups}
    </div>
  </main>`;
  return pageShell({
    title: `${course.title} · ${course.subtitle}`,
    description: course.description,
    rootPrefix: "../",
    bodyClass: `course-index-page accent-${course.accent}`,
    current: course.id,
    content,
  });
}

function buildNotePage(note, course) {
  let markdown = note.markdown
    .replace(/^#\s+.+\n+/, "")
    .replace(/\(\.\.\/\.\.\/docs\/assets\//g, "(../assets/");
  const env = {};
  const tokens = md.parse(markdown, env);
  const headings = tokens
    .filter((token) => token.type === "heading_open" && Number(token.tag.slice(1)) <= 3)
    .map((token, index) => {
      const inline = tokens[tokens.indexOf(token) + 1];
      return {
        level: Number(token.tag.slice(1)),
        id: token.attrGet("id"),
        text: stripTags(inline?.content || "")
          .replace(/\$[^$]+\$/g, "")
          .replace(/\\\([^)]*\\\)/g, "")
          .replace(/\s+/g, " ")
          .trim(),
        index,
      };
    });
  const html = md.renderer.render(tokens, md.options, env);
  const toc = headings
    .filter((heading) => heading.level === 2 || heading.level === 3)
    .map(
      (heading) => `<a class="toc-level-${heading.level}" href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a>`,
    )
    .join("");
  const previous = course.notes[note.order - 2];
  const next = course.notes[note.order];
  const group = noteGroups(course).find((item) => note.order >= item.from && note.order <= item.to);
  const sidebarNotes = course.notes
    .map(
      (item) => `<a class="${item.slug === note.slug ? "is-current" : ""}" href="${item.slug}.html">
        <span>${String(item.order).padStart(2, "0")}</span>${escapeHtml(item.title)}
      </a>`,
    )
    .join("");
  const prevNext = `<nav class="prev-next" aria-label="相邻笔记">
    ${
      previous
        ? `<a class="prev" href="${previous.slug}.html"><span>上一篇</span><strong>${escapeHtml(previous.title)}</strong></a>`
        : `<a class="prev disabled"><span>上一篇</span><strong>已经是第一篇</strong></a>`
    }
    ${
      next
        ? `<a class="next" href="${next.slug}.html"><span>下一篇</span><strong>${escapeHtml(next.title)}</strong></a>`
        : `<a class="next disabled"><span>下一篇</span><strong>课程已读完</strong></a>`
    }
  </nav>`;

  const content = `<div class="reading-progress" data-reading-progress></div>
  <main id="main-content" class="note-page accent-${course.accent}">
    <div class="note-layout">
      <aside class="course-sidebar" data-course-sidebar>
        <div class="sidebar-heading">
          <a href="index.html">${escapeHtml(course.title)}</a>
          <span>${escapeHtml(course.subtitle)}</span>
        </div>
        <nav aria-label="课程目录">${sidebarNotes}</nav>
      </aside>
      <article class="note-article">
        <nav class="breadcrumbs" aria-label="面包屑">
          <a href="../index.html">首页</a><span>/</span><a href="index.html">${escapeHtml(course.title)}</a><span>/</span><span>${escapeHtml(group?.title || "课程")}</span>
        </nav>
        <header class="note-hero">
          <p class="eyebrow">${escapeHtml(course.title)} · ${escapeHtml(group?.title || "课程笔记")}</p>
          <h1>${escapeHtml(note.title)}</h1>
          <p class="note-summary">${escapeHtml(note.summary)}</p>
          <div class="note-meta">
            <span>${icon("clock-3", 15)} ${note.minutes} 分钟</span>
            <span>第 ${note.order} / ${course.notes.length} 篇</span>
            <button type="button" data-course-nav-toggle>${icon("list", 15)} 课程目录</button>
          </div>
        </header>
        <div class="article-body">${html}</div>
        ${prevNext}
      </article>
      <aside class="toc-sidebar">
        <strong>本页目录</strong>
        <nav aria-label="本页目录">${toc || '<span class="muted">本页内容较短</span>'}</nav>
      </aside>
    </div>
  </main>`;
  return pageShell({
    title: note.title,
    description: note.summary,
    rootPrefix: "../",
    bodyClass: `note-detail-page accent-${course.accent}`,
    current: course.id,
    content,
  });
}

function writeFile(relativePath, content) {
  const target = path.join(output, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function generateCourseReadmes() {
  const rootLines = [
    "# 课程笔记目录",
    "",
    "本目录由 Obsidian 源笔记整理而成，图片与公式在 GitHub 和 Pages 站点中均可阅读。",
    "",
  ];
  for (const course of config.courses) {
    rootLines.push(`## ${course.title} · ${course.subtitle}`, "", course.description, "");
    const readmeLines = [`# ${course.title} · ${course.subtitle}`, "", course.description, ""];
    for (const group of noteGroups(course)) {
      const notes = course.notes.filter((note) => note.order >= group.from && note.order <= group.to);
      rootLines.push(`### ${group.title}`, "");
      readmeLines.push(`## ${group.title}`, "");
      for (const note of notes) {
        rootLines.push(`${note.order}. [${note.title}](${course.id}/${note.slug}.md) — ${note.summary}`);
        readmeLines.push(`${note.order}. [${note.title}](${note.slug}.md) — ${note.summary}`);
      }
      rootLines.push("");
      readmeLines.push("");
    }
    fs.writeFileSync(path.join(root, "notes", course.id, "README.md"), readmeLines.join("\n"), "utf8");
  }
  fs.writeFileSync(path.join(root, "notes", "README.md"), rootLines.join("\n"), "utf8");
}

function generateRootReadme() {
  const stats = config.courses
    .map((course) => `| [${course.title}](notes/${course.id}/README.md) | ${course.subtitle} | ${course.notes.length} |`)
    .join("\n");
  const lines = [
    "# Learning Notes",
    "",
    "> CS61B · Python · CS229",
    "",
    "这是一个从 Obsidian 整理并发布到 GitHub Pages 的学习笔记库。原始笔记保留在 Obsidian 中；本仓库保存适合 GitHub 阅读的 Markdown 版本、课程索引和静态网站。",
    "",
    `当前收录 **${noteRecords.length} 篇笔记**，按三条课程线组织。`,
    "",
    "## 课程目录",
    "",
    "| 课程 | 内容 | 笔记数 |",
    "| --- | --- | ---: |",
    stats,
    "",
    "完整目录：[notes/README.md](notes/README.md)",
    "仓库内站点入口：[docs/index.html](docs/index.html)",
    "",
    "## 目录结构",
    "",
    "```text",
    ".",
    "├── assets/              # 网站源样式、脚本与笔记图片",
    "├── content/courses.json # 课程、章节与站点元数据",
    "├── docs/                # 构建后的 GitHub Pages 站点",
    "├── notes/               # GitHub 可读的 Markdown 笔记",
    "├── scripts/             # 笔记导入、站点构建、校验与本地预览",
    "└── README.md",
    "```",
    "",
    "## 本地运行",
    "",
    "```bash",
    "npm install",
    "npm run sync   # 从 Obsidian 重新导入笔记",
    "npm run build  # 生成 docs/ 站点",
    "npm run dev    # 预览站点",
    "```",
    "",
    "默认 Obsidian 路径为 `C:\\obisdian\\CPP\\PY`，也可通过 `OBSIDIAN_VAULT` 环境变量覆盖。",
    "",
    "## GitHub Pages",
    "",
    "推荐将仓库命名为 `<你的 GitHub 用户名>.github.io`，然后在仓库 `Settings → Pages` 中选择：",
    "",
    "- Source: `Deploy from a branch`",
    "- Branch: `main`",
    "- Folder: `/docs`",
    "",
    `发布后的地址为 ${config.siteUrl}`,
    "",
    `GitHub 仓库：${config.repository}`,
    "",
    "## 整理说明",
    "",
    "- CS61B 没有单独命名的目录，本仓库将现有 Java、数据结构与算法笔记按 CS61B 学习路径重新编排，不把课程标签当作官方课程声明。",
    "- 空白草稿、重复欢迎页和仅剩标题的页面未发布。",
    "- Obsidian 图片引用已转换为仓库相对路径，内部双链已展开为普通文本。",
    "- 数学公式使用 KaTeX，代码块使用 Highlight.js。",
    "",
    `站点内容更新于 ${generatedAt}。`,
    "",
  ];
  fs.writeFileSync(path.join(root, "README.md"), lines.join("\n"), "utf8");
}

function copyStaticAssets() {
  fs.cpSync(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
  fs.mkdirSync(path.join(output, "assets", "vendor"), { recursive: true });
  fs.copyFileSync(
    path.join(root, "node_modules", "lucide", "dist", "umd", "lucide.min.js"),
    path.join(output, "assets", "vendor", "lucide.min.js"),
  );
  fs.copyFileSync(
    path.join(root, "node_modules", "katex", "dist", "katex.min.js"),
    path.join(output, "assets", "vendor", "katex.min.js"),
  );
  fs.copyFileSync(
    path.join(root, "node_modules", "katex", "dist", "contrib", "auto-render.min.js"),
    path.join(output, "assets", "vendor", "auto-render.min.js"),
  );
  fs.copyFileSync(
    path.join(root, "node_modules", "katex", "dist", "katex.min.css"),
    path.join(output, "assets", "vendor", "katex.min.css"),
  );
  fs.cpSync(path.join(root, "node_modules", "katex", "dist", "fonts"), path.join(output, "assets", "vendor", "fonts"), {
    recursive: true,
  });
}

const searchIndex = noteRecords.map((note) => ({
  title: note.title,
  course: note.course.title,
  summary: note.summary,
  href: note.href,
  text: note.plain,
}));

copyStaticAssets();
writeFile("index.html", homePage());
for (const course of config.courses) {
  writeFile(`${course.id}/index.html`, coursePage(course));
  for (const note of course.notes) {
    writeFile(`${course.id}/${note.slug}.html`, buildNotePage(note, course));
  }
}
writeFile("assets/search-index.json", JSON.stringify(searchIndex));
writeFile(".nojekyll", "");
generateCourseReadmes();
generateRootReadme();

console.log(`Built ${noteRecords.length} note pages in ${path.relative(root, output)}`);
