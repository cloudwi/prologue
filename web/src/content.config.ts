import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    /** 내용을 손봤을 때만 적는다 — 검색 엔진에 '수정일'로 전달된다. */
    updatedDate: z.coerce.date().optional(),
  }),
});

export const collections = { blog };
