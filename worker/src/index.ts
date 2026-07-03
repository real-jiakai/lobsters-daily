// ── Types ───────────────────────────────────────────────────────────

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  DIGEST_TOP_N: string;
  /** Optional secret. When unset, GET /trigger is disabled entirely. */
  TRIGGER_TOKEN?: string;
  /** Optional secret. URL POSTed a plain-text message when a run fails (e.g. an ntfy.sh topic). */
  ALERT_WEBHOOK?: string;
}

interface LobstersItem {
  title: string;
  url: string;
  comments_url: string;
}

interface DigestItem {
  title: string;
  url: string;
  lobsters_url: string;
}

// ── Retry helper ────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3;

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      console.error(`${label} failed (attempt ${attempt}/${MAX_ATTEMPTS}): ${err instanceof Error ? err.message : err}`);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
      }
    }
  }
  throw lastErr;
}

// ── Fetch Lobsters hottest ──────────────────────────────────────────

function isValidItem(item: unknown): item is LobstersItem {
  if (typeof item !== 'object' || item === null) return false;
  const it = item as Record<string, unknown>;
  return (
    typeof it.title === 'string' &&
    it.title.length > 0 &&
    typeof it.comments_url === 'string' &&
    it.comments_url.startsWith('https://lobste.rs/') &&
    (it.url === undefined || it.url === null || typeof it.url === 'string')
  );
}

async function fetchHottest(topN: number): Promise<LobstersItem[]> {
  const res = await fetch('https://lobste.rs/hottest.json', {
    headers: { 'User-Agent': 'lobsters-daily-digest/1.0' },
  });
  if (!res.ok) throw new Error(`Lobsters API error: ${res.status}`);
  const items: unknown = await res.json();
  if (!Array.isArray(items)) throw new Error('Lobsters API returned a non-array response');
  const valid = items.filter(isValidItem);
  if (valid.length === 0) throw new Error(`Lobsters API returned no valid stories (${items.length} raw items)`);
  if (valid.length < items.length) {
    console.warn(`Dropped ${items.length - valid.length} malformed items from Lobsters response`);
  }
  return valid.slice(0, topN);
}

// ── Generate markdown content ───────────────────────────────────────

export function generateMarkdown(date: string, items: DigestItem[]): string {
  const yamlItems = items
    .map(
      (item) => `  - title: ${JSON.stringify(item.title)}
    url: ${JSON.stringify(item.url)}
    lobsters_url: ${JSON.stringify(item.lobsters_url)}`
    )
    .join('\n');

  return `---
title: "Lobsters Daily — ${date}"
date: "${date}"
items:
${yamlItems}
---
`;
}

// ── Commit to GitHub ────────────────────────────────────────────────

async function commitToGitHub(
  env: Env,
  filePath: string,
  content: string,
  message: string
): Promise<void> {
  const apiBase = `https://api.github.com/repos/${env.GITHUB_REPO}`;
  const headers: Record<string, string> = {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'lobsters-daily-worker/1.0',
  };

  // Fetched inside every attempt so a 409 sha race resolves itself on retry.
  let sha: string | undefined;
  const getRes = await fetch(`${apiBase}/contents/${filePath}?ref=${env.GITHUB_BRANCH}`, { headers });
  if (getRes.ok) {
    const existing: any = await getRes.json();
    sha = existing.sha;
  }

  const body: Record<string, string> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: env.GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(`${apiBase}/contents/${filePath}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub API error: ${putRes.status} ${errText}`);
  }

  console.log(`Committed ${filePath} to ${env.GITHUB_REPO}`);
}

// ── Failure alerting ────────────────────────────────────────────────

async function alertFailure(env: Env, date: string, err: unknown): Promise<void> {
  const detail = err instanceof Error ? err.message : String(err);
  const message = `🦞 lobsters-daily digest FAILED for ${date}: ${detail}`;
  console.error(message);
  if (!env.ALERT_WEBHOOK) return;
  try {
    await fetch(env.ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: message,
    });
  } catch (webhookErr) {
    console.error(`Alert webhook also failed: ${webhookErr instanceof Error ? webhookErr.message : webhookErr}`);
  }
}

// ── Core digest logic (shared by cron + trigger + test) ─────────────

export async function runDigest(env: Env, date: string): Promise<string> {
  const rawTopN = parseInt(env.DIGEST_TOP_N, 10);
  const topN = Number.isInteger(rawTopN) && rawTopN > 0 ? Math.min(rawTopN, 25) : 10;

  console.log(`Starting Lobsters daily digest for ${date}, top ${topN}`);

  // Fetch hottest stories — this single call already has everything we show.
  const stories = await fetchHottest(topN);
  console.log(`Fetched ${stories.length} stories`);

  const isHttp = (u: string) => /^https?:\/\//i.test(u);

  const items: DigestItem[] = stories.map((story) => {
    // Discussion-only posts (Ask/Show Lobsters, etc.) have no external article,
    // so point the title at the Lobsters thread itself. Non-http(s) URLs get the
    // same fallback so nothing like javascript: can ever reach an href.
    const isDiscussionOnly =
      !story.url ||
      story.url === story.comments_url ||
      story.url.startsWith('https://lobste.rs/') ||
      !isHttp(story.url);

    return {
      title: story.title,
      url: isDiscussionOnly ? story.comments_url : story.url,
      lobsters_url: story.comments_url,
    };
  });

  return generateMarkdown(date, items);
}

async function generateAndCommit(env: Env, date: string): Promise<void> {
  const markdown = await withRetry('runDigest', () => runDigest(env, date));
  await withRetry('commitToGitHub', () =>
    commitToGitHub(env, `src/content/digests/${date}.md`, markdown, `📝 Daily digest: ${date}`)
  );
}

// ── Main handler ────────────────────────────────────────────────────

export default {
  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    try {
      await generateAndCommit(env, date);
      console.log(`Daily digest for ${date} completed successfully`);
    } catch (err) {
      await alertFailure(env, date, err);
      throw err; // keep the invocation marked as failed in Cloudflare metrics
    }
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname === '/trigger') {
      if (!env.TRIGGER_TOKEN) {
        return new Response('Not found\n', { status: 404 });
      }
      if (request.headers.get('Authorization') !== `Bearer ${env.TRIGGER_TOKEN}`) {
        return new Response('Unauthorized\n', { status: 401 });
      }
      const date = new Date().toISOString().split('T')[0];
      try {
        await generateAndCommit(env, date);
        return new Response(`Digest committed for ${date}\n`);
      } catch (err) {
        await alertFailure(env, date, err);
        return new Response('Digest failed — see worker logs\n', { status: 500 });
      }
    }
    return new Response('Lobsters Daily Worker\n');
  },
} satisfies ExportedHandler<Env>;
