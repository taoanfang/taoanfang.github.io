# Learning Notes

> CS61B · Python · CS229

这是一个从 Obsidian 整理并发布到 GitHub Pages 的学习笔记库。原始笔记保留在 Obsidian 中；本仓库保存适合 GitHub 阅读的 Markdown 版本、课程索引和静态网站。

当前收录 **39 篇笔记**，按三条课程线组织。

## 课程目录

| 课程 | 内容 | 笔记数 |
| --- | --- | ---: |
| [CS61B](notes/cs61b/README.md) | Java 与数据结构 | 20 |
| [Python](notes/python/README.md) | 程序设计基础 | 12 |
| [CS229](notes/cs229/README.md) | Machine Learning | 7 |

完整目录：[notes/README.md](notes/README.md)
仓库内站点入口：[docs/index.html](docs/index.html)

## 目录结构

```text
.
├── assets/              # 网站源样式、脚本与笔记图片
├── content/courses.json # 课程、章节与站点元数据
├── docs/                # 构建后的 GitHub Pages 站点
├── notes/               # GitHub 可读的 Markdown 笔记
├── scripts/             # 笔记导入、站点构建、校验与本地预览
└── README.md
```

## 本地运行

```bash
npm install
npm run sync   # 从 Obsidian 重新导入笔记
npm run build  # 生成 docs/ 站点
npm run dev    # 预览站点
```

默认 Obsidian 路径为 `C:\obisdian\CPP\PY`，也可通过 `OBSIDIAN_VAULT` 环境变量覆盖。

## GitHub Pages

推荐将仓库命名为 `<你的 GitHub 用户名>.github.io`，然后在仓库 `Settings → Pages` 中选择：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/docs`

发布后的地址为 https://taoanfang.github.io/

GitHub 仓库：https://github.com/taoanfang/taoanfang.github.io

## 整理说明

- CS61B 没有单独命名的目录，本仓库将现有 Java、数据结构与算法笔记按 CS61B 学习路径重新编排，不把课程标签当作官方课程声明。
- 空白草稿、重复欢迎页和仅剩标题的页面未发布。
- Obsidian 图片引用已转换为仓库相对路径，内部双链已展开为普通文本。
- 数学公式使用 KaTeX，代码块使用 Highlight.js。

站点内容更新于 2026年11月6日。
