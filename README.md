# Sandesh’s Garden

A Hugo site with Markdown content and a reusable theme. Requires Hugo **0.162.1 or newer**. No Docker, Node.js, npm, or helper scripts are needed.

## Preview and build

Run these commands inside this folder:

```sh
hugo server -D    # Preview at http://localhost:1313, including drafts
hugo --minify    # Build into public/
```

For a repository site or custom domain:

```sh
hugo --minify --baseURL https://sandeshbhusal.github.io/flower/
hugo --minify --baseURL https://example.com/
```

Generated output and caches are ignored by Git and can be deleted after use.

## Edit content

- `content/_index.md`: homepage introduction and social links.
- `content/notes/*.md`: posts and metadata.
- `content/thoughts/*.md`: short snippets shown in full on the Thoughts feed.
- `hugo.toml`: site title, base URL, description, footer, favicon, and other settings.
- `themes/garden/`: reusable theme, templates, CSS, JavaScript, and bundled browser assets.
- `data/import.json`: import provenance and known missing illustrations.

Create a draft:

```sh
hugo new content notes/my-new-post.md
```

Fill in its title, date, tags, summary, and body; set `draft: false` to publish. Hugo omits drafts and future-dated posts from production builds. The filename sets the URL: `my-new-post.md` becomes `/notes/my-new-post/`.

Use ordinary Markdown links such as `[Binary search](binary-search.md#conclusion)`. Hugo resolves note links, preserves anchors, and generates backlinks. An optional shortcode uses a post’s title as its label:

```go-html-template
{{< note "binary-search" >}}
{{< note "binary-search" "Read about binary search" "conclusion" >}}
```

Put your own images in `static/images/` and link to `/images/example.png`.

## Thoughts

`/thoughts/` is a separate feed for snippets, observations, links, and unfinished ideas. It shows the full Markdown body, newest first, with 20 thoughts per page. Each timestamp links to a permanent page; `/thoughts/index.xml` provides a full-content RSS feed. Thoughts appear in site search, while the homepage posts, archives, and knowledge graph stay focused on notes.

Create a thought:

```sh
hugo new content thoughts/something-on-my-mind.md
```

Use the title as a short label for search, the permalink page, and RSS; the feed itself leads with the body. The date includes a time and timezone so multiple thoughts in a day sort correctly. Optional `topics: [rust, reading]` appear as labels without adding them to the blog’s tag archives. Markdown, images, code, math, and diagrams work here too.

Preview with `hugo server -D`, then set `draft: false` to publish. The included `a-small-thought.md` is a draft example; replace or remove it as you like. Production shows an empty state until you publish your first thought. Set `lastmod` to show an updated date after editing. The feed uses a pixel-art bluejay profile picture; customize `params.thoughtAvatar` and `params.thoughtHandle` in `hugo.toml` to make it your own.

## Revisions and related posts

Set `lastmod` in a post's front matter after a meaningful revision. An “Updated” date appears only when it is later than the original `date`; checkout times and theme changes do not affect it.

```yaml
lastmod: 2026-10-15
related:
  - stm32-bootloader
  - simple-kernel-debug
```

`related` lists note filenames without `.md`, in the order you want them shown. The theme adds topic matches after these choices, up to three posts total, skips posts already shown in backlinks, and hides the section when there are no matches. Use normal Markdown links in the article for connections that should also appear in the graph and backlinks.

Share cards are generated as 1200×630 PNGs during the Hugo build, with Open Graph and Twitter metadata. No image service or extra font downloads are needed to build them. The author name and correction form URL are configured with `params.author` and `params.issueURL`; the “Found a mistake?” link opens a prefilled GitHub issue form for the reader to submit.

## Rich content

The theme supports tables, task lists, footnotes, trusted HTML, code highlighting, line numbers, a TOC, tags, archives, and RSS. Search, graph interactions, copying, hover previews, and theme preferences use plain browser JavaScript. Math uses `$...$` or `$$...$$`; diagrams use fenced `mermaid` blocks. IBM Plex Sans and JetBrains Mono are loaded from Google Fonts. Icons, KaTeX (including its math fonts), and Mermaid assets are bundled locally with their licenses.

Optional columns stack on mobile:

````markdown
{{< columns >}}
{{< column title="C source" >}}
```c
int value = 42;
```
{{< /column >}}
{{< column title="Assembly" >}}
```asm
mov w0, 42
```
{{< /column >}}
{{< /columns >}}
````

Raw HTML is enabled for existing articles; only add HTML from trusted authors. Two images missing from the original source show descriptive placeholders. See [asset credits](themes/garden/static/ASSET-CREDITS.md).

## GitHub Pages

Publish the **contents of this folder** as your GitHub repository root, so `.github/workflows/pages.yml` is at the repository root. GitHub does not detect workflows inside a nested `hugo/.github/` directory. Then choose **Settings → Pages → Source → GitHub Actions**. The included workflow installs Hugo directly, builds on pushes to `main` or manual runs, and deploys `public/`. It uses the configured Pages URL for root sites, repository paths, and custom domains. Change the branch trigger if needed.

For other static hosts, upload the contents of `public/` after building with the correct base URL.

## Reuse the theme

Copy `themes/garden/` into another Hugo project’s `themes/` folder and use `hugo.toml` as the configuration example. See [the theme README](themes/garden/README.md).
