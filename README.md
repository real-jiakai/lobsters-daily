# 🦞 Lobsters Daily

Daily AI-summarized digest of top [Lobsters](https://lobste.rs) stories.

## Architecture

- **Astro SSG** site on Cloudflare Pages (UnoCSS for styling)
- **Cloudflare Worker** runs daily cron at 23:00 UTC
- Worker fetches top 10 stories, gets article content via [pure.md](https://pure.md), summarizes with Gemini Flash
- Worker commits a new markdown file to this repo → triggers Pages rebuild

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

# Set secrets
pnpm wrangler secret put AI_WAVE_API_KEY
pnpm wrangler secret put GITHUB_TOKEN

# Edit wrangler.toml: set GITHUB_REPO, GEMINI_BASE_URL (default: https://api.ai-wave.org/gemini)

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
| `AI_WAVE_API_KEY` | Gemini API key via ai-wave proxy (secret) |
| `GEMINI_BASE_URL` | Gemini API base URL |
| `GITHUB_TOKEN` | GitHub PAT for committing (secret) |
| `GITHUB_REPO` | `owner/repo` format |
| `GITHUB_BRANCH` | Branch to commit to (default: `main`) |
| `DIGEST_TOP_N` | Number of stories to include (default: `10`) |
