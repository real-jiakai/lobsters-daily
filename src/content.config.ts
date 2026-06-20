import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const digests = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/digests' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    items: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        lobsters_url: z.string(),
      })
    ),
  }),
});

export const collections = { digests };
