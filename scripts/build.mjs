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
const site = JSON.parse(fs.readFileSync(path.join(root, "content", "profile.json"), "utf8"));
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
  const links = [
    ["about", `${rootPrefix}index.html#about`, "About"],
    ["research", `${rootPrefix}index.html#research`, "Research"],
    ["project", `${rootPrefix}project/${site.project.slug}.html`, "Project"],
    ["notes", `${rootPrefix}notes.html`, "Notes"],
    ["cv", `${rootPrefix}cv.html`, "CV"],
  ]
    .map(
      ([key, href, label]) =>
        `<a class="${current === key ? "is-current" : ""}" href="${href}">${label}</a>`,
    )
    .join("");
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="${rootPrefix}index.html" aria-label="返回首页">
        <span class="brand-mark">ML</span>
        <span class="brand-text">${escapeHtml(site.name)}</span>
      </a>
      <button class="menu-button" type="button" data-menu-toggle aria-label="Open navigation" aria-expanded="false">
        ${icon("menu", 20)}
      </button>
      <nav class="site-nav" aria-label="Main navigation">
        ${links}
      </nav>
      <div class="header-actions">
        <button class="search-trigger" type="button" data-search-open aria-label="Search notes">
          ${icon("search", 17)}
          <span>Search</span>
          <kbd>/</kbd>
        </button>
        <button class="icon-button" type="button" data-theme-toggle aria-label="Toggle color theme">
          ${icon("sun-moon", 18)}
        </button>
        <a class="icon-button" href="${site.github}" target="_blank" rel="noopener" aria-label="Open GitHub profile">
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
        <input type="search" placeholder="Search concepts, courses, or code" aria-label="Search notes" data-search-input autocomplete="off">
        <button class="icon-button" type="button" data-search-close aria-label="Close search">${icon("x", 18)}</button>
      </div>
      <div class="search-meta" data-search-meta>Start typing to search</div>
      <div class="search-results" data-search-results></div>
    </div>
  </dialog>`;
}

function siteFooter(rootPrefix = "") {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div>
        <strong>${escapeHtml(site.name)}</strong>
        <p>${escapeHtml(site.title)} · ${escapeHtml(site.institution)}</p>
      </div>
      <div class="footer-meta">
        <a href="mailto:${escapeHtml(site.email)}">Email</a>
        <a href="${site.github}" target="_blank" rel="noopener">GitHub</a>
        <a href="${rootPrefix}notes.html">${noteRecords.length} course notes</a>
        <span>Updated ${escapeHtml(generatedAt)}</span>
      </div>
    </div>
  </footer>`;
}

function pageShell({ title, description, rootPrefix, bodyClass, current, content, lang = "en" }) {
  const safeTitle =
    title === site.name ? `${site.name} · ${site.title}` : `${title} · ${site.name}`;
  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description || config.description)}">
  <meta name="author" content="${escapeHtml(site.name)}">
  <meta name="color-scheme" content="light dark">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(safeTitle)}">
  <meta property="og:description" content="${escapeHtml(description || site.intro)}">
  <meta property="og:url" content="${escapeHtml(config.siteUrl)}">
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
      <img src="${rootPrefix}${cover}" alt="${escapeHtml(course.cover.alt || course.title)}" loading="eager" decoding="async">
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
  const directions = site.directions
    .map(
      (item) => `<article class="direction-item">
        <span>${escapeHtml(item.index)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </article>`,
    )
    .join("");
  const education = site.education
    .map(
      (item) => `<article class="education-entry">
        <div class="education-heading">
          <div>
            <h3>${escapeHtml(item.school)}</h3>
            <p>${escapeHtml(item.degree)}</p>
          </div>
          <span>${escapeHtml(item.period)}</span>
        </div>
        <ul>${item.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>
      </article>`,
    )
    .join("");
  const skills = site.skills
    .map(
      (group) => `<div class="skill-group">
        <span>${escapeHtml(group.label)}</span>
        <p>${group.items.map((item) => `<em>${escapeHtml(item)}</em>`).join("")}</p>
      </div>`,
    )
    .join("");
  const projectMetrics = site.project.headlineMetrics
    .map(
      (metric) => `<div class="project-metric">
        <strong>${escapeHtml(metric.value)}</strong>
        <span>${escapeHtml(metric.label)}</span>
      </div>`,
    )
    .join("");
  const projectHighlights = site.project.highlights
    .slice(0, 3)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const courseRows = config.courses
    .map(
      (course) => `<a class="notes-course-row accent-${course.accent}" href="${course.id}/index.html">
        <span>${escapeHtml(course.title)}</span>
        <strong>${escapeHtml(course.subtitle)}</strong>
        <small>${course.notes.length} notes</small>
        ${icon("arrow-right", 17)}
      </a>`,
    )
    .join("");
  const learningList = site.learningNow
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const content = `<main id="main-content">
    <section class="academic-hero" id="about">
      <div class="academic-hero-inner">
        <div class="academic-identity">
          <p class="eyebrow">Computer Science · Multimodal Machine Learning</p>
          <h1>${escapeHtml(site.name)}</h1>
          <p class="academic-role">${escapeHtml(site.title)} at ${escapeHtml(site.institution)}</p>
          <p class="academic-intro">${escapeHtml(site.intro)}</p>
          <div class="academic-actions">
            <a class="primary-button" href="mailto:${escapeHtml(site.email)}">${icon("mail", 17)} ${escapeHtml(site.email)}</a>
            <a class="secondary-button" href="${site.github}" target="_blank" rel="noopener">${icon("github", 17)} GitHub</a>
            <a class="secondary-button" href="cv.html">${icon("file-text", 17)} CV</a>
          </div>
        </div>
        <aside class="academic-profile-card" aria-label="Profile at a glance">
          <div class="profile-monogram">ML</div>
          <dl>
            <div><dt>Based in</dt><dd>${escapeHtml(site.location)}</dd></div>
            <div><dt>Degree</dt><dd>B.Eng. Computer Science</dd></div>
            <div><dt>GPA</dt><dd>${escapeHtml(site.gpa)}</dd></div>
            <div><dt>Average</dt><dd>${escapeHtml(site.average)}</dd></div>
          </dl>
          <p><span></span>${escapeHtml(site.availability)}</p>
        </aside>
      </div>
    </section>

    <section class="research-direction" id="research">
      <div class="section-heading academic-heading">
        <div>
          <p class="eyebrow">Research Direction</p>
          <h2>Learning to ask questions that experiments can answer.</h2>
        </div>
        <p>${escapeHtml(site.researchStatement)}</p>
      </div>
      <div class="direction-grid">${directions}</div>
    </section>

    <section class="academic-background">
      <div class="academic-background-inner">
        <div class="background-block">
          <p class="eyebrow">Education</p>
          ${education}
        </div>
        <div class="background-block">
          <p class="eyebrow">Technical Foundation</p>
          <div class="skills-list">${skills}</div>
        </div>
      </div>
    </section>

    <section class="featured-project" id="project">
      <div class="featured-project-inner">
        <div class="project-copy">
          <p class="eyebrow">${escapeHtml(site.project.eyebrow)}</p>
          <h2>When the model learned the page style, but not the page.</h2>
          <p class="project-summary">${escapeHtml(site.project.summary)}</p>
          <ul class="project-highlights">${projectHighlights}</ul>
          <a class="text-link project-link" href="project/${site.project.slug}.html">Read the project case study ${icon("arrow-up-right", 16)}</a>
        </div>
        <div class="project-visual-panel" aria-label="Document to Markdown pipeline">
          <div class="pipeline-flow">
            <div><span>01</span><strong>Page image</strong><small>896 × 896</small></div>
            <i>${icon("arrow-down", 18)}</i>
            <div><span>02</span><strong>Vision encoder</strong><small>SigLIP + compressor</small></div>
            <i>${icon("arrow-down", 18)}</i>
            <div><span>03</span><strong>Visual tokens</strong><small>256 / 1024 budget</small></div>
            <i>${icon("arrow-down", 18)}</i>
            <div><span>04</span><strong>Language decoder</strong><small>Qwen2.5 + LoRA</small></div>
          </div>
          <div class="project-metric-grid">${projectMetrics}</div>
        </div>
      </div>
    </section>

    <section class="learning-section">
      <div class="learning-inner">
        <div>
          <p class="eyebrow">How I Work</p>
          <h2>Build the smallest useful system, then measure what it gets wrong.</h2>
        </div>
        <ul class="learning-list">${learningList}</ul>
      </div>
    </section>

    <section class="home-notes-section" id="notes">
      <div class="section-heading academic-heading">
        <div>
          <p class="eyebrow">Supporting Work</p>
          <h2>Course notes, kept as a working record.</h2>
        </div>
        <p>${noteRecords.length} notes across Java and data structures, Python, and Stanford CS229. These are study records, not claims of completed research.</p>
      </div>
      <div class="notes-course-list">${courseRows}</div>
      <a class="text-link notes-library-link" href="notes.html">Open the full notes library ${icon("arrow-right", 16)}</a>
    </section>

    <section class="contact-section">
      <div class="contact-inner">
        <div>
          <p class="eyebrow">Contact</p>
          <h2>I am looking for a place to learn how rigorous research is done.</h2>
        </div>
        <div class="contact-copy">
          <p>If my background is relevant to your group, I would be glad to discuss how I can contribute as an undergraduate researcher.</p>
          <a class="primary-button" href="mailto:${escapeHtml(site.email)}">${icon("mail", 17)} ${escapeHtml(site.email)}</a>
        </div>
      </div>
    </section>
  </main>`;
  return pageShell({
    title: site.name,
    description: site.intro,
    rootPrefix: "",
    bodyClass: "home-page academic-home",
    current: "about",
    content,
  });
}

function notesPage() {
  const courseCards = config.courses.map((course) => courseCard(course)).join("");
  const totalMinutes = noteRecords.reduce((sum, note) => sum + note.minutes, 0);
  const content = `<main id="main-content" class="notes-library-page">
    <header class="notes-library-hero">
      <div class="notes-library-inner">
        <a class="back-link" href="index.html">${icon("arrow-left", 15)} Mingjv Li</a>
        <p class="eyebrow">Course Notes · ${noteRecords.length} Notes</p>
        <h1>Learning Notes</h1>
        <p>A searchable record of coursework and independent study across data structures, Python, and machine learning.</p>
        <div class="notes-library-meta">
          <span>${config.courses.length} courses</span>
          <span>${noteRecords.length} notes</span>
          <span>${totalMinutes} min reading</span>
          <button class="search-trigger compact" type="button" data-search-open>${icon("search", 16)} Search notes</button>
        </div>
      </div>
    </header>
    <section class="course-section notes-library-content">
      <div class="course-grid">${courseCards}</div>
    </section>
  </main>`;
  return pageShell({
    title: "Course Notes",
    description: "Course notes in data structures, Python, and machine learning.",
    rootPrefix: "",
    bodyClass: "notes-library-page",
    current: "notes",
    content,
  });
}

function projectPage() {
  const tags = site.project.stack
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join("");
  const metrics = site.project.headlineMetrics
    .map(
      (metric) => `<div class="case-metric">
        <strong>${escapeHtml(metric.value)}</strong>
        <span>${escapeHtml(metric.label)}</span>
      </div>`,
    )
    .join("");
  const resultRows = site.project.results
    .map(
      (result) => `<tr>
        <td>${escapeHtml(result.setting)}</td>
        <td>${escapeHtml(result.metric)}</td>
        <td><strong>${escapeHtml(result.value)}</strong></td>
      </tr>`,
    )
    .join("");
  const content = `<main id="main-content" class="project-detail-page">
    <header class="case-hero">
      <div class="case-hero-inner">
        <a class="back-link" href="../index.html#project">${icon("arrow-left", 15)} Back to homepage</a>
        <p class="eyebrow">${escapeHtml(site.project.eyebrow)}</p>
        <h1>When the model learned the page style, but not the page.</h1>
        <p class="case-lede">${escapeHtml(site.project.summary)}</p>
        <div class="project-tags">${tags}</div>
      </div>
    </header>

    <div class="case-layout">
      <aside class="case-sidebar">
        <div class="case-metrics">${metrics}</div>
        <p><strong>My role</strong>Independent implementation, training, evaluation, failure analysis, and technical reporting.</p>
        <p><strong>Project type</strong>Paper reproduction and diagnostic study. This is not a claim of a novel OCR model.</p>
      </aside>

      <article class="case-article">
        <section>
          <p class="eyebrow">Question</p>
          <h2>Where does visual information disappear?</h2>
          <p>DeepSeek-OCR motivated a simple question: can a page image be compressed into a small number of visual tokens and decoded into Markdown by a compact language model? I wanted to reproduce the core architecture under a much smaller budget, then determine whether failures came from token compression, the frozen vision encoder, the language decoder, or the evaluation protocol.</p>
        </section>

        <section>
          <p class="eyebrow">System</p>
          <h2>A complete pipeline, small enough to inspect.</h2>
          <div class="case-pipeline">
            <div><span>01</span><strong>Document page</strong><small>896 × 896 image</small></div>
            <i>${icon("arrow-right", 18)}</i>
            <div><span>02</span><strong>SigLIP encoder</strong><small>frozen vision features</small></div>
            <i>${icon("arrow-right", 18)}</i>
            <div><span>03</span><strong>Conv compressor</strong><small>256 / 1024 visual tokens</small></div>
            <i>${icon("arrow-right", 18)}</i>
            <div><span>04</span><strong>Qwen2.5 + LoRA</strong><small>document to Markdown</small></div>
          </div>
          <p>The first stage trained the visual connector and projection layer. The second stage added LoRA adapters to Qwen2.5-0.5B or Qwen2.5-1.5B. The local experiments used an 8GB RTX 5060 Laptop GPU; larger decoder, hybrid-input, and formula experiments used rented GPUs.</p>
        </section>

        <section>
          <p class="eyebrow">Diagnosis</p>
          <h2>The training loss looked plausible. The model was not reading the image.</h2>
          <p>Aggregate validation loss was misleading. The generated Markdown was fluent, but pages with different content received nearly identical outputs. I combined four diagnostics:</p>
          <ul class="case-list">
            <li><strong>First-token loss:</strong> with no text prefix available, the model could not identify the first character from the image.</li>
            <li><strong>Cross-page similarity:</strong> compressed visual features became so similar that different pages were almost indistinguishable.</li>
            <li><strong>Self-retrieval:</strong> outputs were not more similar to their source page than to other pages.</li>
            <li><strong>Linear probes:</strong> character identity was preserved in the temporal OCR sequence but disappeared after pooling and cross-modal projection.</li>
          </ul>
          <blockquote>The most useful result was not a higher score. It was evidence that the model had learned a document-style prior while the image-to-text path remained effectively disconnected.</blockquote>
        </section>

        <section>
          <p class="eyebrow">Experiments</p>
          <h2>Changing the obvious variable did not fix the failure.</h2>
          <p>I compared visual-token budgets, decoder sizes, soft CTC OCR tokens, hybrid text-plus-soft-token inputs, and formula-page oversampling. Increasing the visual budget from 256 to 1024 tokens did not produce page-specific text. A larger decoder and explicit OCR context improved accuracy, but did not remove the information bottleneck.</p>
          <div class="results-table-wrap">
            <table class="results-table">
              <thead><tr><th>Setting</th><th>Metric</th><th>Result</th></tr></thead>
              <tbody>${resultRows}</tbody>
            </table>
          </div>
        </section>

        <section>
          <p class="eyebrow">Takeaway</p>
          <h2>What this project changed in how I work.</h2>
          <ul class="case-list">
            <li>I now treat a fluent generated example as a hypothesis, not evidence that a model uses its input.</li>
            <li>I design negative controls before spending time on larger models or longer training.</li>
            <li>I document failed experiments and their boundary conditions so that the next decision is based on evidence.</li>
            <li>I learned that a well-explained failure can be more informative than an untrustworthy improvement.</li>
          </ul>
        </section>

        <section class="case-limitations">
          <p class="eyebrow">Limitations</p>
          <h2>What this study does not establish.</h2>
          <p>The main evaluations use small fixed subsets of 20 or 50 pages, and some comparisons were run with a single seed. The results are useful for engineering decisions and failure diagnosis, but they are not a statistically complete benchmark study. The project is a reproduction and analysis, not peer-reviewed research.</p>
        </section>
      </article>
    </div>
  </main>`;
  return pageShell({
    title: "DeepSeek-OCR Reproduction",
    description: site.project.summary,
    rootPrefix: "../",
    bodyClass: "project-detail-page",
    current: "project",
    content,
  });
}

function cvPage() {
  const education = site.education
    .map(
      (item) => `<section class="cv-block">
        <div class="cv-block-heading">
          <div><h2>${escapeHtml(item.school)}</h2><p>${escapeHtml(item.degree)}</p></div>
          <span>${escapeHtml(item.period)}</span>
        </div>
        <ul>${item.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>
      </section>`,
    )
    .join("");
  const skills = site.skills
    .map(
      (group) => `<div class="cv-skill-row">
        <strong>${escapeHtml(group.label)}</strong>
        <span>${group.items.map(escapeHtml).join(" · ")}</span>
      </div>`,
    )
    .join("");
  const content = `<main id="main-content" class="cv-page">
    <div class="cv-toolbar">
      <a class="back-link" href="index.html">${icon("arrow-left", 15)} Back to homepage</a>
      <button class="secondary-button print-cv" type="button" data-print>${icon("printer", 16)} Print CV</button>
    </div>
    <article class="cv-sheet">
      <header class="cv-header">
        <div>
          <h1>${escapeHtml(site.name)}</h1>
          <p>${escapeHtml(site.title)} · ${escapeHtml(site.institution)}</p>
        </div>
        <div class="cv-contact">
          <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a>
          <a href="${site.github}" target="_blank" rel="noopener">${escapeHtml(site.github.replace("https://", ""))}</a>
          <span>${escapeHtml(site.location)}</span>
        </div>
      </header>

      <section class="cv-section">
        <h2>Research Direction</h2>
        <p>${escapeHtml(site.researchStatement)}</p>
      </section>

      <section class="cv-section">
        <h2>Education</h2>
        ${education}
      </section>

      <section class="cv-section">
        <h2>Selected Project</h2>
        <div class="cv-project">
          <div class="cv-block-heading">
            <div><h3>${escapeHtml(site.project.title)}</h3><p>${escapeHtml(site.project.eyebrow)}</p></div>
            <span>2026</span>
          </div>
          <p>${escapeHtml(site.project.summary)}</p>
          <ul>${site.project.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </section>

      <section class="cv-section">
        <h2>Technical Skills</h2>
        <div class="cv-skills">${skills}</div>
      </section>

      <section class="cv-section">
        <h2>Leadership</h2>
        <div class="cv-block-heading">
          <div><h3>${escapeHtml(site.leadership.role)}</h3><p>${escapeHtml(site.leadership.organization)}</p></div>
        </div>
        <p>${escapeHtml(site.leadership.description)}</p>
      </section>
    </article>
  </main>`;
  return pageShell({
    title: "Curriculum Vitae",
    description: `Curriculum vitae for ${site.name}.`,
    rootPrefix: "",
    bodyClass: "cv-page cv-document-page",
    current: "cv",
    content,
  });
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
          <a class="back-link" href="../notes.html">${icon("arrow-left", 15)} 全部课程</a>
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
    current: "notes",
    content,
    lang: "zh-CN",
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
          <a href="../index.html">首页</a><span>/</span><a href="../notes.html">Notes</a><span>/</span><a href="index.html">${escapeHtml(course.title)}</a><span>/</span><span>${escapeHtml(group?.title || "课程")}</span>
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
    current: "notes",
    content,
    lang: "zh-CN",
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
    `# ${site.name} · Personal Homepage`,
    "",
    `> ${site.title} · ${site.institution}`,
    "",
    `个人学术主页与课程笔记库：${config.siteUrl}`,
    "",
    `主页重点介绍我的研究兴趣、DeepSeek-OCR 复现项目、教育背景与技能。课程笔记作为辅助学习记录保留，当前收录 **${noteRecords.length} 篇**。`,
    "",
    "## 页面",
    "",
    `- [个人主页](${config.siteUrl})`,
    `- [DeepSeek-OCR 项目案例](${config.siteUrl}project/deepseek-ocr-reproduction.html)`,
    `- [课程笔记库](${config.siteUrl}notes.html)`,
    `- [CV](${config.siteUrl}cv.html)`,
    "",
    "## 课程笔记",
    "",
    "| 课程 | 内容 | 笔记数 |",
    "| --- | --- | ---: |",
    stats,
    "",
    "完整目录：[notes/README.md](notes/README.md)",
    "",
    "## 目录结构",
    "",
    "```text",
    ".",
    "├── assets/              # 网站源样式、脚本与笔记图片",
    "├── content/             # 个人资料、课程与章节元数据",
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
    "npm run build  # 生成/更新 docs/ 站点",
    "npm run dev    # 预览站点",
    "```",
    "",
    "默认 Obsidian 路径为 `C:\\obisdian\\CPP\\PY`，也可通过 `OBSIDIAN_VAULT` 环境变量覆盖。",
    "",
    "## GitHub Pages",
    "",
    "仓库使用 `Deploy from a branch`：`main` 分支的 `/docs` 目录直接发布。更新笔记和页面后运行 `npm run build`，提交 `docs/` 即可。",
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
    "- `node_modules/` 和本地检查截图不进入仓库。",
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
writeFile("notes.html", notesPage());
writeFile("project/deepseek-ocr-reproduction.html", projectPage());
writeFile("cv.html", cvPage());
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
