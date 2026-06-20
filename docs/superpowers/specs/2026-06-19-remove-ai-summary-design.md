# Remove AI summaries → daily top-10 link list

**Date:** 2026-06-19
**Status:** Approved

## Goal

Drop the AI-summary feature entirely. The site becomes a minimal daily list of the
top 10 Lobsters stories — just a title link and a `(comments)` link per story, in the
spirit of [daemonology.net/hn-daily](https://www.daemonology.net/hn-daily/). *Less is
more.*

## What each story shows

A bulleted list (no numbers, no upvotes, no comment counts, no tags, no domain):

```
Lobsters Daily — 2026-06-19

• Offpunk 3.0
  (comments)
• Computers can be understood
  (comments)
• ...
```

- **title** → the article (`url`), opens in a new tab
- **`(comments)`** → the Lobsters thread (`lobsters_url`), small/muted, on its own line
- Discussion-only posts (Ask/Show Lobsters with no external link): `url === lobsters_url`,
  so both links point at the same thread. Rendered identically — no special case.

## Data shape

Per-item frontmatter shrinks to exactly three fields. We store only what we display;
`score`/`comment_count`/`tags` come free from the API and are trivially re-addable later,
but we don't carry data we don't show.

```yaml
items:
  - title: "..."
    url: "..."          # article (or the thread, for discussion-only posts)
    lobsters_url: "..."  # the Lobsters discussion
```

Top-level `title` and `date` stay.

## Changes by layer

| File | Change |
|---|---|
| `worker/src/index.ts` | Delete Gemini (`@google/genai`), `fetchArticleContent`, `fetchComments`, `fetchWithTimeout`, `summarize*`, rate-limit sleeps. `runDigest` = one `hottest.json` call → map to `{title,url,lobsters_url}` → `generateMarkdown` → commit. Keep the discussion-only check. Trim `Env`. |
| `worker/wrangler.toml` | Remove `GEMINI_BASE_URL`; drop the `AI_WAVE_API_KEY` comment. Keep `GITHUB_*`, `DIGEST_TOP_N`. |
| `worker/package.json` | Remove `@google/genai` dependency. |
| `worker/test-local.ts` | Drop `AI_WAVE_API_KEY` / `GEMINI_BASE_URL` from the test `Env`. |
| `src/content.config.ts` | `items` schema = `{ title, url, lobsters_url }` only. |
| `src/pages/index.astro` | Remove the "今日概览" overview block, per-item summary cards, and the right-hand TOC `aside`. Render a bulleted `title` + `(comments)` list. Keep `ArchiveNav`, `MobileDrawer`, theme, header/footer. Update page title (drop "AI-Summarized"). |
| `src/pages/digest/[date].astro` | Same row redesign; keep the "← Back to latest" link. |
| `src/pages/rss.xml.ts` | Item `<description>` built from titles, not `one_line_summary`. Channel description → "Daily top 10 stories from Lobsters." `<language>` → `en`. |
| `src/layouts/Base.astro` | Meta description → "Daily top 10 stories from Lobsters." |
| `README.md` | Rewrite architecture (no Gemini / pure.md / r.jina.ai); env table keeps only `GITHUB_*` + `DIGEST_TOP_N`. |
| `src/content/digests/*.md` (~140) | Re-emit via the shared `generateMarkdown` keeping only `title`/`url`/`lobsters_url`. |

## Migration

A one-off `tsx` script under `worker/` re-emits every existing digest through the same
`generateMarkdown` formatter (imported from `worker/src/index.ts`), so old and new files
are byte-identical in shape. Parsing is dependency-free (the files are machine-generated
with a fixed layout); the script asserts each file's parsed item count matches its
original `- ` item count before writing, then is removed.

## Verification

- `pnpm build` — validates the new schema across all ~140 digests and builds the pages.
- `cd worker && npx tsc --noEmit` — worker typechecks with the trimmed `Env`.
- `grep -rn "one_line_summary\|article_summary\|discussion_summary\|article fetch\|gemini"`
  returns nothing in `src/` and `worker/src/`.

## Non-goals

- No change to the cron schedule, GitHub-commit flow, archive nav, mobile drawer, or RSS plumbing.
- Not deleting historical digests — only stripping their summary/metadata fields.
