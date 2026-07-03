import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const digests = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/digests' }),
  schema: z.object({
    title: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
    items: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        lobsters_url: z.string().url(),
      })
    ),
  }),
});

export const collections = { digests };
