# 🦞 Lobsters Daily

Daily list of the top 10 [Lobsters](https://lobste.rs) stories. Just the links — no summaries, no noise.

Inspired by [Hacker News Daily](https://www.daemonology.net/hn-daily/).

## Architecture

- **Astro SSG** site on Cloudflare Pages (UnoCSS for styling)
- **Cloudflare Worker** runs a daily cron at 23:00 UTC
- Worker fetches the top 10 stories from `lobste.rs/hottest.json` and commits a new markdown file to this repo → triggers a Pages rebuild

Each story is stored as a title, its article URL, and its Lobsters discussion URL — that's all the site renders (a bulleted link list with a `(comments)` link per story).

## Setup

### 1. Astro Site

```bash
pnpm install
pnpm dev       # local dev
pnpm build     # production build
```

### 2. Cloudflare Pages

Connect this repo to Cloudflare Pages:
- Build command: `pnpm build`
- Build output: `dist`

### 3. Worker

```bash
cd worker
pnpm install

# Set the GitHub token secret
pnpm wrangler secret put GITHUB_TOKEN

# Edit wrangler.toml: set GITHUB_REPO

# Deploy
pnpm run deploy
```

### 4. GitHub Token

Create a fine-grained personal access token with:
- Repository access: this repo only
- Permissions: Contents (read & write)

### Environment Variables (Worker)

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub PAT for committing (secret) |
| `GITHUB_REPO` | `owner/repo` format |
| `GITHUB_BRANCH` | Branch to commit to (default: `main`) |
| `DIGEST_TOP_N` | Number of stories to include (default: `10`) |
