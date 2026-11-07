# Mingjv Li · Personal Website Source

这是个人主页的源仓库，不是主页本身。

个人主页：https://taoanfang.github.io/

## 页面

- [Personal homepage](https://taoanfang.github.io/)
- [DeepSeek-OCR project](https://taoanfang.github.io/project/deepseek-ocr-reproduction.html)
- [CV](https://taoanfang.github.io/cv.html)
- [Supporting course notes](https://taoanfang.github.io/learning-notes/)

课程笔记已经拆分到独立仓库：

- Notes site: https://taoanfang.github.io/learning-notes/
- Notes repository: https://github.com/taoanfang/learning-notes

## Structure

```text
.
├── assets/        # Site styles, scripts, and favicon
├── content/       # Profile and notes-summary metadata
├── docs/          # Generated GitHub Pages site
├── scripts/       # Build, preview, and browser checks
└── README.md
```

## Development

```bash
npm install
npm run build
npm run dev
```

GitHub Pages publishes the generated `docs/` directory from the `main` branch.
