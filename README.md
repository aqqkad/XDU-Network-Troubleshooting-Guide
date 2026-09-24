# 校园网排障指南网页

这是一个面向 Cloudflare Pages 的纯静态网站。正文、标题锚点和页首目录都由根目录中的 `校园网排障指南.md` 自动生成。

## 更新内容

首次使用先安装依赖：

```bash
npm install
```

之后的更新流程：

1. 编辑 `校园网排障指南.md`。
2. 运行 `npm run build` 生成网站。
3. 运行 `npm run dev`，再打开终端显示的本地地址预览。

生成器会自动读取二级、三级标题并更新目录，不需要手工维护 HTML。

## 发布到 Cloudflare Pages

推荐把本目录提交到 GitHub 或 GitLab，再在 Cloudflare 的 Workers & Pages 中连接仓库：

- 构建命令：`npm run build`
- 构建输出目录：`dist`
- 根目录：仓库根目录
- Node.js 版本：项目通过 `.nvmrc` 指定为 22

完成一次配置后，每次推送 Markdown 或样式修改，Cloudflare Pages 都会自动构建并发布；分支和 Pull Request 也可获得预览地址。

已登录 Wrangler 时，也可以直接运行：

```bash
npm run deploy
```

项目名默认为 `xidian-campus-network-guide`；如果在 Cloudflare 中使用了其他名称，请同步修改 `package.json` 和 `wrangler.jsonc`。
