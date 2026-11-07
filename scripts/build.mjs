import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "docs");
const site = JSON.parse(fs.readFileSync(path.join(root, "content", "profile.json"), "utf8"));
const notes = JSON.parse(fs.readFileSync(path.join(root, "content", "courses.json"), "utf8"));
const generatedAt = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Singapore",
}).format(new Date());

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function icon(name, size = 18) {
  return `<i data-lucide="${name}" width="${size}" height="${size}" aria-hidden="true"></i>`;
}

function themeScript() {
  return `<script>
    (() => {
      const saved = localStorage.getItem("notes-theme");
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = saved || (dark ? "dark" : "light");
    })();
  </script>`;
}

function siteHeader(rootPrefix = "", current = "") {
  const links = [
    ["about", `${rootPrefix}index.html#about`, "About"],
    ["research", `${rootPrefix}index.html#research`, "Research"],
    ["project", `${rootPrefix}project/${site.project.slug}.html`, "Project"],
    ["notes", notes.notesSiteUrl, "Notes"],
    ["cv", `${rootPrefix}cv.html`, "CV"],
  ]
    .map(([key, href, label]) => `<a class="${current === key ? "is-current" : ""}" href="${href}">${label}</a>`)
    .join("");
  return `<header class="site-header">
    <div class="header-inner">
      <a class="brand" href="${rootPrefix}index.html" aria-label="Back to homepage">
        <span class="brand-mark">ML</span>
        <span class="brand-text">${escapeHtml(site.name)}</span>
      </a>
      <button class="menu-button" type="button" data-menu-toggle aria-label="Open navigation" aria-expanded="false">
        ${icon("menu", 20)}
      </button>
      <nav class="site-nav" aria-label="Main navigation">${links}</nav>
      <div class="header-actions">
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
        <a href="${notes.notesSiteUrl}">Notes</a>
        <a href="${rootPrefix}cv.html">CV</a>
        <span>Updated ${escapeHtml(generatedAt)}</span>
      </div>
    </div>
  </footer>`;
}

function pageShell({ title, description, rootPrefix, bodyClass, current, content }) {
  const safeTitle = title === site.name ? `${site.name} · ${site.title}` : `${title} · ${site.name}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description || site.intro)}">
  <meta name="author" content="${escapeHtml(site.name)}">
  <meta name="color-scheme" content="light dark">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(safeTitle)}">
  <meta property="og:description" content="${escapeHtml(description || site.intro)}">
  <meta property="og:url" content="${site.homepage}">
  <title>${escapeHtml(safeTitle)}</title>
  <link rel="icon" href="${rootPrefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${rootPrefix}assets/styles.css">
  ${themeScript()}
</head>
<body class="${bodyClass}" data-root="${rootPrefix}">
  <a class="skip-link" href="#main-content">跳到正文</a>
  ${siteHeader(rootPrefix, current)}
  ${content}
  ${siteFooter(rootPrefix)}
  <script src="${rootPrefix}assets/vendor/lucide.min.js"></script>
  <script src="${rootPrefix}assets/app.js"></script>
</body>
</html>`;
}

function homePage() {
  const totalNotes = notes.courses.reduce((sum, course) => sum + course.count, 0);
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
          <div><h3>${escapeHtml(item.school)}</h3><p>${escapeHtml(item.degree)}</p></div>
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
  const courseRows = notes.courses
    .map(
      (course) => `<a class="notes-course-row accent-${course.accent}" href="${notes.notesSiteUrl}${course.id}/index.html">
        <span>${escapeHtml(course.title)}</span>
        <strong>${escapeHtml(course.subtitle)}</strong>
        <small>${course.count} notes</small>
        ${icon("arrow-up-right", 17)}
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
        <div><p class="eyebrow">Research Direction</p><h2>Learning to ask questions that experiments can answer.</h2></div>
        <p>${escapeHtml(site.researchStatement)}</p>
      </div>
      <div class="direction-grid">${directions}</div>
    </section>

    <section class="academic-background">
      <div class="academic-background-inner">
        <div class="background-block"><p class="eyebrow">Education</p>${education}</div>
        <div class="background-block"><p class="eyebrow">Technical Foundation</p><div class="skills-list">${skills}</div></div>
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
        <div><p class="eyebrow">How I Work</p><h2>Build the smallest useful system, then measure what it gets wrong.</h2></div>
        <ul class="learning-list">${learningList}</ul>
      </div>
    </section>

    <section class="home-notes-section" id="notes">
      <div class="section-heading academic-heading">
        <div><p class="eyebrow">Supporting Work</p><h2>Course notes, kept as a separate working record.</h2></div>
        <p>${totalNotes} notes across Java and data structures, Python, and Stanford CS229. The notes archive has its own repository and is not the personal homepage.</p>
      </div>
      <div class="notes-course-list">${courseRows}</div>
      <a class="text-link notes-library-link" href="${notes.notesSiteUrl}">Open the notes archive ${icon("arrow-up-right", 16)}</a>
    </section>

    <section class="contact-section">
      <div class="contact-inner">
        <div><p class="eyebrow">Contact</p><h2>I am looking for a place to learn how rigorous research is done.</h2></div>
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

function projectPage() {
  const tags = site.project.stack.map((item) => `<span>${escapeHtml(item)}</span>`).join("");
  const metrics = site.project.headlineMetrics
    .map(
      (metric) => `<div class="case-metric"><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(metric.label)}</span></div>`,
    )
    .join("");
  const resultRows = site.project.results
    .map(
      (result) => `<tr><td>${escapeHtml(result.setting)}</td><td>${escapeHtml(result.metric)}</td><td><strong>${escapeHtml(result.value)}</strong></td></tr>`,
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
        <section><p class="eyebrow">Question</p><h2>Where does visual information disappear?</h2><p>DeepSeek-OCR motivated a simple question: can a page image be compressed into a small number of visual tokens and decoded into Markdown by a compact language model? I wanted to reproduce the core architecture under a much smaller budget, then determine whether failures came from token compression, the frozen vision encoder, the language decoder, or the evaluation protocol.</p></section>
        <section><p class="eyebrow">System</p><h2>A complete pipeline, small enough to inspect.</h2>
          <div class="case-pipeline">
            <div><span>01</span><strong>Document page</strong><small>896 × 896 image</small></div><i>${icon("arrow-right", 18)}</i>
            <div><span>02</span><strong>SigLIP encoder</strong><small>frozen vision features</small></div><i>${icon("arrow-right", 18)}</i>
            <div><span>03</span><strong>Conv compressor</strong><small>256 / 1024 visual tokens</small></div><i>${icon("arrow-right", 18)}</i>
            <div><span>04</span><strong>Qwen2.5 + LoRA</strong><small>document to Markdown</small></div>
          </div>
          <p>The first stage trained the visual connector and projection layer. The second stage added LoRA adapters to Qwen2.5-0.5B or Qwen2.5-1.5B. Local experiments used an 8GB RTX 5060 Laptop GPU; larger decoder, hybrid-input, and formula experiments used rented GPUs.</p>
        </section>
        <section><p class="eyebrow">Diagnosis</p><h2>The training loss looked plausible. The model was not reading the image.</h2>
          <p>Aggregate validation loss was misleading. Generated Markdown was fluent, but pages with different content received nearly identical outputs. I combined four diagnostics:</p>
          <ul class="case-list">
            <li><strong>First-token loss:</strong> with no text prefix available, the model could not identify the first character from the image.</li>
            <li><strong>Cross-page similarity:</strong> compressed visual features became so similar that different pages were almost indistinguishable.</li>
            <li><strong>Self-retrieval:</strong> outputs were not more similar to their source page than to other pages.</li>
            <li><strong>Linear probes:</strong> character identity was preserved in temporal OCR features but disappeared after pooling and cross-modal projection.</li>
          </ul>
          <blockquote>The most useful result was not a higher score. It was evidence that the model learned a document-style prior while the image-to-text path remained effectively disconnected.</blockquote>
        </section>
        <section><p class="eyebrow">Experiments</p><h2>Changing the obvious variable did not fix the failure.</h2>
          <p>I compared visual-token budgets, decoder sizes, soft CTC OCR tokens, hybrid text-plus-soft-token inputs, and formula-page oversampling. Increasing the visual budget from 256 to 1024 tokens did not produce page-specific text. A larger decoder and explicit OCR context improved accuracy, but did not remove the information bottleneck.</p>
          <div class="results-table-wrap"><table class="results-table"><thead><tr><th>Setting</th><th>Metric</th><th>Result</th></tr></thead><tbody>${resultRows}</tbody></table></div>
        </section>
        <section><p class="eyebrow">Takeaway</p><h2>What this project changed in how I work.</h2>
          <ul class="case-list">
            <li>I now treat a fluent generated example as a hypothesis, not evidence that a model uses its input.</li>
            <li>I design negative controls before spending time on larger models or longer training.</li>
            <li>I document failed experiments and boundary conditions so the next decision is based on evidence.</li>
            <li>I learned that a well-explained failure can be more informative than an untrustworthy improvement.</li>
          </ul>
        </section>
        <section class="case-limitations"><p class="eyebrow">Limitations</p><h2>What this study does not establish.</h2><p>The main evaluations use small fixed subsets of 20 or 50 pages, and some comparisons were run with a single seed. The results are useful for engineering decisions and failure diagnosis, but not a statistically complete benchmark study. This is a reproduction and analysis, not peer-reviewed research.</p></section>
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
        <div class="cv-block-heading"><div><h2>${escapeHtml(item.school)}</h2><p>${escapeHtml(item.degree)}</p></div><span>${escapeHtml(item.period)}</span></div>
        <ul>${item.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}</ul>
      </section>`,
    )
    .join("");
  const skills = site.skills
    .map(
      (group) => `<div class="cv-skill-row"><strong>${escapeHtml(group.label)}</strong><span>${group.items.map(escapeHtml).join(" · ")}</span></div>`,
    )
    .join("");
  const content = `<main id="main-content" class="cv-page">
    <div class="cv-toolbar"><a class="back-link" href="index.html">${icon("arrow-left", 15)} Back to homepage</a><button class="secondary-button print-cv" type="button" data-print>${icon("printer", 16)} Print CV</button></div>
    <article class="cv-sheet">
      <header class="cv-header">
        <div><h1>${escapeHtml(site.name)}</h1><p>${escapeHtml(site.title)} · ${escapeHtml(site.institution)}</p></div>
        <div class="cv-contact"><a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a><a href="${site.github}" target="_blank" rel="noopener">github.com/taoanfang</a><span>${escapeHtml(site.location)}</span></div>
      </header>
      <section class="cv-section"><h2>Research Direction</h2><p>${escapeHtml(site.researchStatement)}</p></section>
      <section class="cv-section"><h2>Education</h2>${education}</section>
      <section class="cv-section"><h2>Selected Project</h2><div class="cv-project"><div class="cv-block-heading"><div><h3>${escapeHtml(site.project.title)}</h3><p>${escapeHtml(site.project.eyebrow)}</p></div><span>2026</span></div><p>${escapeHtml(site.project.summary)}</p><ul>${site.project.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></section>
      <section class="cv-section"><h2>Technical Skills</h2><div class="cv-skills">${skills}</div></section>
      <section class="cv-section"><h2>Leadership</h2><div class="cv-block-heading"><div><h3>${escapeHtml(site.leadership.role)}</h3><p>${escapeHtml(site.leadership.organization)}</p></div></div><p>${escapeHtml(site.leadership.description)}</p></section>
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

function writeFile(relativePath, content) {
  const target = path.join(output, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function copyStaticAssets() {
  fs.cpSync(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
  fs.mkdirSync(path.join(output, "assets", "vendor"), { recursive: true });
  fs.copyFileSync(path.join(root, "node_modules", "lucide", "dist", "umd", "lucide.min.js"), path.join(output, "assets", "vendor", "lucide.min.js"));
}

function writeReadme() {
  const lines = [
    `# ${site.name} · Personal Website Source`,
    "",
    "这是个人主页的源仓库，不是主页本身。",
    "",
    `个人主页：${site.homepage}`,
    "",
    "## 页面",
    "",
    `- [Personal homepage](${site.homepage})`,
    `- [DeepSeek-OCR project](${site.homepage}project/${site.project.slug}.html)`,
    `- [CV](${site.homepage}cv.html)`,
    `- [Supporting course notes](${notes.notesSiteUrl})`,
    "",
    "课程笔记已经拆分到独立仓库：",
    "",
    `- Notes site: ${notes.notesSiteUrl}`,
    `- Notes repository: ${notes.notesRepository}`,
    "",
    "## Structure",
    "",
    "```text",
    ".",
    "├── assets/        # Site styles, scripts, and favicon",
    "├── content/       # Profile and notes-summary metadata",
    "├── docs/          # Generated GitHub Pages site",
    "├── scripts/       # Build, preview, and browser checks",
    "└── README.md",
    "```",
    "",
    "## Development",
    "",
    "```bash",
    "npm install",
    "npm run build",
    "npm run dev",
    "```",
    "",
    "GitHub Pages publishes the generated `docs/` directory from the `main` branch.",
    "",
  ];
  fs.writeFileSync(path.join(root, "README.md"), lines.join("\n"), "utf8");
}

copyStaticAssets();
writeFile("index.html", homePage());
writeFile(`project/${site.project.slug}.html`, projectPage());
writeFile("cv.html", cvPage());
writeFile(".nojekyll", "");
writeReadme();

console.log("Built personal homepage in docs");
