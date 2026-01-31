import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';

export async function GET(context: APIContext) {
  const site = (context.site?.toString() || 'https://lobsters-daily.pages.dev').replace(/\/$/, '');
  const digests = await getCollection('digests');

  // Sort by date descending
  const sortedDigests = digests.sort(
    (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  // Build RSS items
  const items = sortedDigests.slice(0, 30).map((digest) => {
    const link = `${site}/digest/${digest.data.date}/`;
    const pubDate = new Date(digest.data.date).toUTCString();

    // Build description from top items
    const description = digest.data.items
      .map((item, i) => `${i + 1}. ${item.one_line_summary}`)
      .join('\n');

    return `    <item>
      <title><![CDATA[${digest.data.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
    </item>`;
  });

  // Build full RSS XML with rss.style script
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet href="/rss-style.xsl" type="text/xsl"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Lobsters Daily</title>
    <description>Daily digest of top Lobsters stories, summarized by AI</description>
    <link>${site}</link>
    <atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items.join('\n')}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
