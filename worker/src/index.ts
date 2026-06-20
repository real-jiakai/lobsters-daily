// ── Types ───────────────────────────────────────────────────────────

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  DIGEST_TOP_N: string;
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

// ── Fetch Lobsters hottest ──────────────────────────────────────────

async function fetchHottest(topN: number): Promise<LobstersItem[]> {
  const res = await fetch('https://lobste.rs/hottest.json', {
    headers: { 'User-Agent': 'lobsters-daily-digest/1.0' },
  });
  if (!res.ok) throw new Error(`Lobsters API error: ${res.status}`);
  const items: LobstersItem[] = await res.json();
  return items.slice(0, topN);
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

// ── Core digest logic (shared by cron + test) ───────────────────────

export async function runDigest(env: Env): Promise<string> {
  const topN = parseInt(env.DIGEST_TOP_N) || 10;
  const today = new Date().toISOString().split('T')[0];

  console.log(`Starting Lobsters daily digest for ${today}, top ${topN}`);

  // Fetch hottest stories — this single call already has everything we show.
  const stories = await fetchHottest(topN);
  console.log(`Fetched ${stories.length} stories`);

  const items: DigestItem[] = stories.map((story) => {
    // Discussion-only posts (Ask/Show Lobsters, etc.) have no external article,
    // so point the title at the Lobsters thread itself.
    const isDiscussionOnly =
      !story.url || story.url === story.comments_url || story.url.startsWith('https://lobste.rs/');

    return {
      title: story.title,
      url: isDiscussionOnly ? story.comments_url : story.url,
      lobsters_url: story.comments_url,
    };
  });

  return generateMarkdown(today, items);
}

// ── Main handler ────────────────────────────────────────────────────

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const markdown = await runDigest(env);

    await commitToGitHub(
      env,
      `src/content/digests/${today}.md`,
      markdown,
      `📝 Daily digest: ${today}`
    );

    console.log(`Daily digest for ${today} completed successfully`);
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname === '/trigger') {
      ctx.waitUntil(this.scheduled!({} as ScheduledEvent, env, ctx));
      return new Response('Digest generation triggered');
    }
    return new Response('Lobsters Daily Worker. GET /trigger to run manually.');
  },
} satisfies ExportedHandler<Env>;
