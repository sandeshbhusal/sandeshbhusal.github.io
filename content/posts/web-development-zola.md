+++
title = "Building Websites with Zola"
date = 2024-02-20
description = "How to create fast static websites using the Zola static site generator"
[taxonomies]
tags = ["zola", "web-development", "static-sites"]
categories = ["tutorials"]
+++

Zola is a fast static site generator written in Rust. It's perfect for blogs, documentation sites, and portfolios.

## Why Zola?

- **Fast**: Built in Rust for maximum performance
- **Simple**: No complex dependencies or setup
- **Flexible**: Powerful templating with Tera

*Zola can build most sites in under a second, even with hundreds of pages.*

## Getting Started

### Installation

Download the binary from the [Zola releases page](https://github.com/getzola/zola/releases) or install via package manager:

```bash,linenos
# macOS
brew install zola

# Ubuntu/Debian
snap install zola --edge
```

### Creating a Site

```bash,linenos
zola init my-site
cd my-site
zola serve
```

## Site Structure

```
content/
  _index.md
  posts/
    _index.md
    my-first-post.md
templates/
  index.html
  base.html
static/
config.toml
```

## Themes

Zola has a great ecosystem of themes. Popular ones include:

- **Serene**: Minimal and clean
- **DeepThought**: Feature-rich blog theme
- **Tranquil**: Simple and elegant

*This site uses a customized version of the Serene theme.*

## Deployment

Deploy to any static hosting service:

- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

## Conclusion

Zola makes static site generation simple and fast. Perfect for developers who want control without complexity.
