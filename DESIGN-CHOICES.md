# Design direction checkpoint

Date: 2026-11-23

## Selected: Warm field notes

Status: **approved by user; implemented across `themes/garden`**

Prototype: `http://localhost:1314/` (single page: `content/notes/on-volatile.md`)
Prototype source: `/tmp/opencode/knowledge-prototype/field-template.html`

Why this one:
- User: “I like this one. Change the blog based on this design.”
- Keeps the plain structure of the personal-wiki choice, but adds warmth: cream paper, rust ink, Inter headings, a notebook left rule, and a small “Working note” stamp.
- Knowledge-forward without peacockiness: no ticker, stickers, hard shadows, or oversized grotesk display.
- Light and dark themes both pass Lighthouse 1.0.

## Strong alternative (checkpointed)

- **Personal wiki / catalog** — user liked it “a lot.” Plain sans + mono, breadcrumb, catalog record, `##` section markers, inline contents, Connections block. Source: `/tmp/opencode/knowledge-prototype/wiki-template.html`. Can be revisited without losing this direction.

## Rejected directions

- **Apple/editorial reading design** — too restrained and generic; user said it felt “soulless.”
- **Developer zine** — too noisy and bold; user said it “peacocked.”
- **Quiet editorial prototype** (serif, italic lede, numbered sections, boxed TOC) — “too elegant,” not plain enough.

## Decision rule

1. Prototype one page on a dedicated port first.
2. Get approval before touching `themes/garden`.
3. Preserve features: search, TOC, code copy, math, Mermaid, dark mode, thoughts, archive filters, revision decks.
4. Do not reintroduce the globe/graph.
