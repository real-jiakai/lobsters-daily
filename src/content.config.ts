import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const digests = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/digests' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    items: z.array(
      z.object({
        rank: z.number(),
        title: z.string(),
        url: z.string(),
        lobsters_url: z.string(),
        score: z.number(),
        comment_count: z.number(),
        tags: z.array(z.string()),
        one_line_summary: z.string(),
        article_summary: z.string(),
        discussion_summary: z.string(),
      })
    ),
  }),
});

export const collections = { digests };
