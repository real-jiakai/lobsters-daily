import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

// Escape text for XML element content. Titles are third-party input from
// Lobsters — CDATA is NOT safe here (a title containing "]]>" would break
// out), so escape the five XML special characters instead.
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Digests are committed by the 23:00 UTC cron, so stamp items with the
// actual publish time rather than midnight.
function publishedAt(date: string): string {
  return new Date(`${date}T23:00:00Z`).toUTCString();
}

export async function GET(context: APIContext) {
  if (!context.site) throw new Error('`site` must be set in astro.config.mjs');
  const site = context.site.toString().replace(/\/$/, '');
  const digests = await getCollection('digests');

  // Sort by date descending
  const sortedDigests = digests.sort((a, b) => b.data.date.localeCompare(a.data.date));
  const newest = sortedDigests[0];

  // Build RSS items
  const items = sortedDigests.slice(0, 30).map((digest) => {
    const link = `${site}/digest/${digest.data.date}/`;

    // Build description from top items
    const description = digest.data.items
      .map((item, i) => `${i + 1}. ${item.title}`)
      .join('\n');

    return `    <item>
      <title>${escapeXml(digest.data.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${publishedAt(digest.data.date)}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
  });

  // lastBuildDate follows the newest digest instead of the build wall-clock,
  // so rebuilding without new content leaves the feed byte-identical.
  const lastBuildDate = newest ? publishedAt(newest.data.date) : new Date(0).toUTCString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/rss-style.xsl" type="text/xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Lobsters Daily</title>
    <description>Daily top 10 stories from Lobsters</description>
    <link>${site}</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
