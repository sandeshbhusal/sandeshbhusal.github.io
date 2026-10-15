# Garden

A reusable Hugo theme preserving Sandesh’s knowledge garden design. Requires Hugo 0.162.1 or newer. No Node build step.

Use the root `hugo.toml` as the configuration example. The theme expects posts in `content/notes/`, an Archives section with `url: /archives/`, home outputs `HTML`, `RSS`, and `JSON`, and the supplied Goldmark passthrough settings for math. The configuration also enables trusted HTML for existing articles. Use `:contentbasename` for filename-based post URLs.

Optional site parameters: `description`, `footer`, `favicon`, `bluejay` (path relative to the static directory), and `recentCount` (defaults to 5). Override assets through the site’s `static/` directory and templates through the site’s `layouts/` directory.

The `columns`, `column`, and `note` shortcodes are documented in the root README. Math and diagrams require JavaScript; article content and tag archives do not. Search and the graph consume Hugo’s generated home JSON output. Vendor files and licenses are in `static/vendor/`; replace them there if upgrading their versions. `static/ASSET-CREDITS.md` records illustration sources.

To reuse, copy this directory into `themes/garden/` in another Hugo site and select `theme = 'garden'`. The theme has no React dependency.
