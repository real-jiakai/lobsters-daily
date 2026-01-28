import { GoogleGenAI } from '@google/genai';

// ── Types ───────────────────────────────────────────────────────────

export interface Env {
  AI_WAVE_API_KEY: string;
  GEMINI_BASE_URL: string;
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  DIGEST_TOP_N: string;
}

interface LobstersItem {
  title: string;
  url: string;
  score: number;
  comment_count: number;
  comments_url: string;
  tags: string[];
  short_id: string;
}

interface LobstersComment {
  comment: string;
  commenting_user: { username: string };
  score: number;
}

interface DigestItem {
  rank: number;
  title: string;
  url: string;
  lobsters_url: string;
  score: number;
  comment_count: number;
  tags: string[];
  article_summary: string;
  discussion_summary: string;
  one_line_summary: string;
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

// ── Fetch with timeout helper ────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'lobsters-daily-digest/1.0' },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Fetch article content: pure.md → r.jina.ai → null ──────────────

async function fetchArticleContent(url: string): Promise<string | null> {
  // 1. Try pure.md (10s timeout)
  try {
    console.log(`  Fetching via pure.md: ${url}`);
    const res = await fetchWithTimeout(`https://pure.md/${url}`, 10000);
    if (res.ok) {
      const text = await res.text();
      if (text.trim().length > 100) return text.slice(0, 8000);
    }
    console.log(`  pure.md failed: HTTP ${res.status}`);
  } catch (e) {
    console.log(`  pure.md failed: ${e}`);
  }

  // 2. Fallback: r.jina.ai (10s timeout)
  try {
    console.log(`  Fallback to r.jina.ai: ${url}`);
    const res = await fetchWithTimeout(`https://r.jina.ai/${url}`, 10000);
    if (res.ok) {
      const text = await res.text();
      if (text.trim().length > 100) return text.slice(0, 8000);
    }
    console.log(`  r.jina.ai failed: HTTP ${res.status}`);
  } catch (e) {
    console.log(`  r.jina.ai failed: ${e}`);
  }

  // 3. Both failed
  console.log(`  ❌ All fetch methods failed for: ${url}`);
  return null;
}

// ── Fetch Lobsters comments ─────────────────────────────────────────

async function fetchComments(commentsUrl: string): Promise<string> {
  try {
    const res = await fetch(`${commentsUrl}.json`, {
      headers: { 'User-Agent': 'lobsters-daily-digest/1.0' },
    });
    if (!res.ok) return '[No comments available]';
    const data: any = await res.json();
    const comments: LobstersComment[] = data.comments || [];
    const topComments = comments
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((c) => `[${c.commenting_user.username} (↑${c.score})]: ${c.comment}`)
      .join('\n\n');
    return topComments.slice(0, 6000) || '[No comments]';
  } catch (e) {
    return `[Failed to fetch comments: ${e}]`;
  }
}

// ── Gemini summarization ────────────────────────────────────────────

async function summarizeWithGemini(
  ai: GoogleGenAI,
  articleContent: string,
  commentsText: string,
  title: string
): Promise<{ article_summary: string; discussion_summary: string; one_line_summary: string }> {
  const prompt = `你是一位技术新闻摘要编辑，负责总结来自 Lobsters (lobste.rs) 的技术文章及其社区讨论。

文章标题: ${title}

文章内容:
${articleContent}

社区讨论（热门评论）:
${commentsText}

请提供以下信息:

1. **一句话总结** (one_line_summary): 用一句简洁的中文概括文章核心内容和要点（不超过80字）。
2. **文章摘要** (article_summary): 用3-5句中文总结文章的主要内容、关键论点和技术细节。
3. **讨论摘要** (discussion_summary): 用2-4句中文总结社区讨论的主要观点，包括：
   - 讨论的整体情绪和态度
   - 排名靠前的3-5条评论的核心观点
   - 任何值得关注的争议或独到见解

以如下 JSON 格式回复:
{"one_line_summary": "...", "article_summary": "...", "discussion_summary": "..."}

全部使用简体中文回复，不要包含 markdown 格式。`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    return JSON.parse(text);
  } catch (e) {
    console.error('Gemini summarization failed:', e);
    return {
      one_line_summary: '[摘要生成失败]',
      article_summary: '[摘要生成失败]',
      discussion_summary: '[摘要生成失败]',
    };
  }
}

// ── Generate markdown content ───────────────────────────────────────

export function generateMarkdown(date: string, items: DigestItem[]): string {
  // Front matter
  const yamlItems = items
    .map(
      (item) => `  - rank: ${item.rank}
    title: ${JSON.stringify(item.title)}
    url: ${JSON.stringify(item.url)}
    lobsters_url: ${JSON.stringify(item.lobsters_url)}
    score: ${item.score}
    comment_count: ${item.comment_count}
    tags: [${item.tags.map((t) => JSON.stringify(t)).join(', ')}]
    one_line_summary: ${JSON.stringify(item.one_line_summary)}
    article_summary: ${JSON.stringify(item.article_summary)}
    discussion_summary: ${JSON.stringify(item.discussion_summary)}`
    )
    .join('\n');

  // Top-10 overview list
  const overviewList = items
    .map((item) => `${item.rank}. ${item.one_line_summary}`)
    .join('\n');

  // Detailed sections
  const detailedSections = items
    .map(
      (item) => `## ${item.rank}. ${item.title}

- **链接:** [${item.url}](${item.url})
- **评分:** ↑${item.score} | **评论数:** ${item.comment_count} | **标签:** ${item.tags.join(', ')}
- **讨论:** [Lobsters 讨论](${item.lobsters_url})

### 文章摘要

${item.article_summary}

### 社区讨论

${item.discussion_summary}`
    )
    .join('\n\n---\n\n');

  return `---
title: "Lobsters Daily Digest — ${date}"
date: "${date}"
items:
${yamlItems}
---

# 🦞 Lobsters 每日精选 — ${date}

## 今日概览

${overviewList}

---

${detailedSections}
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

  const ai = new GoogleGenAI({
    apiKey: env.AI_WAVE_API_KEY,
    httpOptions: { baseUrl: env.GEMINI_BASE_URL },
  });

  // 1. Fetch hottest stories
  const stories = await fetchHottest(topN);
  console.log(`Fetched ${stories.length} stories`);

  // 2. Process each story
  const digestItems: DigestItem[] = [];

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i];
    console.log(`Processing #${i + 1}: ${story.title}`);

    // Fetch article and comments in parallel
    const [articleContent, commentsText] = await Promise.all([
      fetchArticleContent(story.url),
      fetchComments(story.comments_url),
    ]);

    // If article content fetch failed entirely, skip Gemini and mark as unavailable
    if (articleContent === null) {
      console.log(`  ⏭️ Skipping Gemini for #${i + 1} — article content unavailable`);
      digestItems.push({
        rank: i + 1,
        title: story.title,
        url: story.url,
        lobsters_url: story.comments_url,
        score: story.score,
        comment_count: story.comment_count,
        tags: story.tags,
        one_line_summary: `⚠️ 无法获取文章内容（${story.title}）`,
        article_summary: '无法获取文章内容，摘要不可用。',
        discussion_summary: '由于文章内容无法获取，未进行总结。',
      });
      continue;
    }

    // Summarize with Gemini (1 call per item, includes both article + discussion)
    const summary = await summarizeWithGemini(ai, articleContent, commentsText, story.title);

    digestItems.push({
      rank: i + 1,
      title: story.title,
      url: story.url,
      lobsters_url: story.comments_url,
      score: story.score,
      comment_count: story.comment_count,
      tags: story.tags,
      one_line_summary: summary.one_line_summary,
      article_summary: summary.article_summary,
      discussion_summary: summary.discussion_summary,
    });

    // Respect rate limit: 3 req/s → wait ~400ms between Gemini calls
    await new Promise((r) => setTimeout(r, 400));
  }

  // 3. Generate markdown
  const markdown = generateMarkdown(today, digestItems);
  return markdown;
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
