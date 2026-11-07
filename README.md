# Mingjv Li · Personal Website Source

> Computer Science Undergraduate · Communication University of China

这是个人主页的源仓库，不是主页本身。公开个人主页是唯一的主站入口。

个人主页：https://taoanfang.github.io/

个人主页重点介绍研究兴趣、DeepSeek-OCR 复现项目、教育背景与技能。课程笔记只是主站下的辅助页面，当前收录 **39 篇**。

## 页面

- [个人主页](https://taoanfang.github.io/)
- [DeepSeek-OCR 项目案例](https://taoanfang.github.io/project/deepseek-ocr-reproduction.html)
- [辅助课程笔记页](https://taoanfang.github.io/notes.html)
- [CV](https://taoanfang.github.io/cv.html)

## 课程笔记

| 课程 | 内容 | 笔记数 |
| --- | --- | ---: |
| [CS61B](notes/cs61b/README.md) | Java 与数据结构 | 20 |
| [Python](notes/python/README.md) | 程序设计基础 | 12 |
| [CS229](notes/cs229/README.md) | Machine Learning | 7 |

完整目录：[notes/README.md](notes/README.md)

## 目录结构

```text
.
├── assets/              # 网站源样式、脚本与笔记图片
├── content/             # 个人资料、课程与章节元数据
├── docs/                # 构建后的 GitHub Pages 站点
├── notes/               # GitHub 可读的 Markdown 笔记
├── scripts/             # 笔记导入、站点构建、校验与本地预览
└── README.md
```

## 本地运行

```bash
npm install
npm run sync   # 从 Obsidian 重新导入笔记
npm run build  # 生成/更新 docs/ 站点
npm run dev    # 预览站点
```

默认 Obsidian 路径为 `C:\obisdian\CPP\PY`，也可通过 `OBSIDIAN_VAULT` 环境变量覆盖。

## GitHub Pages

仓库使用 `Deploy from a branch`：`main` 分支的 `/docs` 目录直接发布。更新笔记和页面后运行 `npm run build`，提交 `docs/` 即可。

发布后的地址为 https://taoanfang.github.io/

GitHub 仓库：https://github.com/taoanfang/taoanfang.github.io

## 整理说明

- CS61B 没有单独命名的目录，本仓库将现有 Java、数据结构与算法笔记按 CS61B 学习路径重新编排，不把课程标签当作官方课程声明。
- 空白草稿、重复欢迎页和仅剩标题的页面未发布。
- Obsidian 图片引用已转换为仓库相对路径，内部双链已展开为普通文本。
- 数学公式使用 KaTeX，代码块使用 Highlight.js。
- `node_modules/` 和本地检查截图不进入仓库。

站点内容更新于 2026年11月7日。
