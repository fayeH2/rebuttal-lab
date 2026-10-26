# Rebuttal Lab

一个零依赖、浏览器本地运行的学术 rebuttal 流程模拟器。

网站无需账号或登录。每位访问者的方案和草稿均保存在自己的浏览器中。

## 在线访问

直接访问已部署的网站：[https://fayeh2.github.io/rebuttal-lab/](https://fayeh2.github.io/rebuttal-lab/)

## 功能

- 单次回复、多个回复框、多轮讨论三种交互模式
- 每个回复框独立配置字符数或词数限制、说明与必填状态
- PDF、Word、LaTeX、ZIP、图片等附件类型及大小/数量限制
- 常规 PDF 页数的浏览器端辅助校验
- 方案导入/导出、草稿自动保存、模拟提交回执
- 完整响应式布局

## 本地运行

项目是纯静态站点。由于页面使用 ES Module，请通过任意静态服务器运行：

```bash
python3 -m http.server 4173 --directory dist
```

然后访问 `http://localhost:4173`。

## 部署到 GitHub Pages

仓库已包含 GitHub Pages 自动部署工作流。创建一个公开 GitHub 仓库并推送代码后：

1. 进入仓库的 **Settings → Pages**。
2. 将 **Build and deployment → Source** 设置为 **GitHub Actions**。
3. 推送到 `main` 分支；工作流会自动把 `dist/` 发布到 Pages。

对应的公开地址通常为 `https://<用户名>.github.io/<仓库名>/`。页面资源使用相对路径，因此支持项目型 Pages 地址。

## 数据说明

方案和文字草稿保存在浏览器 `localStorage` 中。附件只在当前页面内做本地校验，不会上传到服务器，刷新页面后需要重新选择附件。

PDF 页数检查使用轻量本地解析，部分采用特殊压缩或对象流的 PDF 可能只显示“待最终校验”；生产系统建议接入服务端 PDF 解析器进行强校验。
