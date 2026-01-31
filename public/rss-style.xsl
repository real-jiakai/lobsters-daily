<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html>
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="/rss/channel/title"/> — RSS Feed</title>
        <style>
          :root {
            --bg: #1a1a2e;
            --text: #e0e0e0;
            --muted: #888;
            --accent: #ff6b6b;
            --card-bg: #252542;
            --border: rgba(255,255,255,0.1);
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 2rem 1rem;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
          }
          header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid var(--border);
          }
          h1 {
            color: var(--accent);
            font-size: 1.75rem;
            margin-bottom: 0.5rem;
          }
          .badge {
            display: inline-block;
            background: var(--accent);
            color: var(--bg);
            font-size: 0.75rem;
            font-weight: 600;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            margin-bottom: 1rem;
          }
          .description {
            color: var(--muted);
            font-size: 0.95rem;
          }
          .subscribe-box {
            background: var(--card-bg);
            border-radius: 0.5rem;
            padding: 1rem;
            margin: 1.5rem 0;
          }
          .subscribe-box p {
            color: var(--muted);
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
          }
          .feed-url {
            width: 100%;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 0.375rem;
            padding: 0.5rem 0.75rem;
            color: var(--text);
            font-family: monospace;
            font-size: 0.875rem;
          }
          .items {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }
          .item {
            background: var(--card-bg);
            border-radius: 0.5rem;
            padding: 1rem 1.25rem;
          }
          .item-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }
          .item-title a {
            color: var(--text);
            text-decoration: none;
          }
          .item-title a:hover {
            color: var(--accent);
          }
          .item-date {
            color: var(--muted);
            font-size: 0.8rem;
            margin-bottom: 0.75rem;
          }
          .item-desc {
            color: var(--muted);
            font-size: 0.9rem;
            white-space: pre-line;
          }
          footer {
            text-align: center;
            margin-top: 2rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border);
            color: var(--muted);
            font-size: 0.875rem;
          }
          footer a {
            color: var(--accent);
            text-decoration: none;
          }
          footer a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <span class="badge">RSS Feed</span>
            <h1>🦞 <xsl:value-of select="/rss/channel/title"/></h1>
            <p class="description"><xsl:value-of select="/rss/channel/description"/></p>
            <div class="subscribe-box">
              <p>Subscribe to this feed by copying the URL below into your RSS reader:</p>
              <input class="feed-url" type="text" readonly="readonly">
                <xsl:attribute name="value">
                  <xsl:value-of select="/rss/channel/link"/>/rss.xml
                </xsl:attribute>
              </input>
            </div>
          </header>
          <main class="items">
            <xsl:for-each select="/rss/channel/item">
              <article class="item">
                <h2 class="item-title">
                  <a>
                    <xsl:attribute name="href">
                      <xsl:value-of select="link"/>
                    </xsl:attribute>
                    <xsl:value-of select="title"/>
                  </a>
                </h2>
                <p class="item-date"><xsl:value-of select="pubDate"/></p>
                <p class="item-desc"><xsl:value-of select="description"/></p>
              </article>
            </xsl:for-each>
          </main>
          <footer>
            <p>
              <a>
                <xsl:attribute name="href">
                  <xsl:value-of select="/rss/channel/link"/>
                </xsl:attribute>
                Visit Lobsters Daily
              </a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
