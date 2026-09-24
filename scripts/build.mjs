import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(rootDirectory, "校园网排障指南.md");
const outputDirectory = path.join(rootDirectory, "dist");
const assetsDirectory = path.join(outputDirectory, "assets");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/[\s_-]+/g, "-") || "section";

const markdownSource = await readFile(sourcePath, "utf8");
const sourceLines = markdownSource.split(/\r?\n/);
const title = sourceLines.find((line) => line.startsWith("# "))?.slice(2).trim() ?? "校园网排障指南";

let bodyStart = 1;
while (bodyStart < sourceLines.length && sourceLines[bodyStart].trim() !== "---") bodyStart += 1;
if (sourceLines[bodyStart]?.trim() === "---") bodyStart += 1;
const bodySource = sourceLines.slice(bodyStart).join("\n").trim();

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true
});

const defaultLinkOpen = markdown.renderer.rules.link_open ?? ((tokens, index, options, environment, self) => self.renderToken(tokens, index, options));
markdown.renderer.rules.link_open = (tokens, index, options, environment, self) => {
  const href = tokens[index].attrGet("href") ?? "";
  if (/^https?:\/\//.test(href)) {
    tokens[index].attrSet("target", "_blank");
    tokens[index].attrSet("rel", "noopener noreferrer");
  }
  return defaultLinkOpen(tokens, index, options, environment, self);
};

const defaultCodeInline = markdown.renderer.rules.code_inline;
markdown.renderer.rules.code_inline = (tokens, index, options, environment, self) => {
  const value = tokens[index].content;
  if (/^https?:\/\/[^\s]+$/.test(value)) {
    const safeUrl = escapeHtml(value);
    return `<a class="direct-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a>`;
  }
  return defaultCodeInline(tokens, index, options, environment, self);
};

markdown.renderer.rules.table_open = () => '<div class="table-scroll" tabindex="0"><table>\n';
markdown.renderer.rules.table_close = () => "</table></div>\n";

const tokens = markdown.parse(bodySource, {});
const headings = [];
const usedSlugs = new Map();

for (let index = 0; index < tokens.length; index += 1) {
  const token = tokens[index];
  if (token.type !== "heading_open") continue;

  const level = Number(token.tag.slice(1));
  const label = tokens[index + 1]?.content?.trim() ?? "";
  const baseSlug = slugify(label);
  const seenCount = usedSlugs.get(baseSlug) ?? 0;
  usedSlugs.set(baseSlug, seenCount + 1);
  const id = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`;

  token.attrSet("id", id);
  token.attrJoin("class", "section-heading");
  token.meta = { ...(token.meta ?? {}), id };
  headings.push({ level, label, id });
}

const defaultHeadingOpen = markdown.renderer.rules.heading_open ?? ((renderTokens, index, options, environment, self) => self.renderToken(renderTokens, index, options));
markdown.renderer.rules.heading_open = (renderTokens, index, options, environment, self) => {
  const token = renderTokens[index];
  const id = token.attrGet("id");
  const openingTag = defaultHeadingOpen(renderTokens, index, options, environment, self);
  return `${openingTag}<a class="heading-anchor" href="#${id}" aria-label="复制此节链接">`;
};

const defaultHeadingClose = markdown.renderer.rules.heading_close ?? ((renderTokens, index, options, environment, self) => self.renderToken(renderTokens, index, options));
markdown.renderer.rules.heading_close = (renderTokens, index, options, environment, self) =>
  `</a>${defaultHeadingClose(renderTokens, index, options, environment, self)}`;

const articleHtml = markdown.renderer.render(tokens, markdown.options, {});
const tableOfContents = headings.filter(({ level }) => level === 2 || level === 3);
const commonLinksId = headings.find(({ level, label }) => level === 2 && label.includes("常用入口"))?.id ?? "top";

const tocHtml = tableOfContents
  .map(({ level, label, id }) => {
    const shortLabel = label.replace(/^([一二三四五六七八九十]+、|\d+\.\s*)/, "");
    return `<li class="toc-level-${level}"><a href="#${id}">${escapeHtml(shortLabel)}</a></li>`;
  })
  .join("\n");

const styleSource = await readFile(path.join(rootDirectory, "src", "styles.css"), "utf8");
const scriptSource = await readFile(path.join(rootDirectory, "src", "app.js"), "utf8");
const assetHash = createHash("sha256")
  .update(styleSource)
  .update(scriptSource)
  .digest("hex")
  .slice(0, 10);
const styleFileName = `styles.${assetHash}.css`;
const scriptFileName = `app.${assetHash}.js`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f5f4ef">
  <meta name="description" content="西安电子科技大学长安校区校园网接入、认证、PPPoE、掉线与网速问题排查指南。">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="从现象出发，快速找到校园网排障步骤和报修入口。">
  <meta property="og:type" content="website">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/${styleFileName}">
  <script src="/assets/${scriptFileName}" defer></script>
</head>
<body>
  <a class="skip-link" href="#main-content">跳到正文</a>
  <div class="reading-progress" aria-hidden="true"><span></span></div>

  <header class="site-header">
    <a class="brand" href="#top" aria-label="返回页面顶部">
      <span class="brand-mark" aria-hidden="true">X</span>
      <span>校园网排障</span>
    </a>
    <a class="header-link" href="#${commonLinksId}">常用入口</a>
  </header>

  <main id="main-content" class="docs-shell">
    <aside class="docs-sidebar" id="top">
      <nav class="toc" aria-labelledby="toc-title">
        <details class="toc-panel" open>
          <summary id="toc-title">目录</summary>
          <ol class="toc-list">
            ${tocHtml}
          </ol>
        </details>
      </nav>
    </aside>

    <div class="docs-main">
      <article class="guide-content">
        ${articleHtml}
      </article>
    </div>
  </main>

  <footer class="site-footer">
    <p>内容由 <code>校园网排障指南.md</code> 自动生成</p>
    <a href="#top">返回顶部 ↑</a>
  </footer>

  <button class="back-to-top" type="button" aria-label="返回顶部">↑</button>
</body>
</html>`;

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(assetsDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "index.html"), html);
await writeFile(path.join(assetsDirectory, styleFileName), styleSource);
await writeFile(path.join(assetsDirectory, scriptFileName), scriptSource);
await cp(path.join(rootDirectory, "public"), outputDirectory, { recursive: true });

console.log(`Built dist/index.html from ${path.basename(sourcePath)}`);
console.log(`Generated ${tableOfContents.length} table-of-contents links`);
