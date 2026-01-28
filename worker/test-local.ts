/**
 * Local test script — runs the digest pipeline and writes output to a file.
 * Usage: npx tsx test-local.ts
 */
import { runDigest, type Env } from './src/index.ts';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const env: Env = {
  AI_WAVE_API_KEY: process.env.AI_WAVE_API_KEY || '',
  GEMINI_BASE_URL: 'https://www.ai-wave.org/gemini',
  GITHUB_TOKEN: '',
  GITHUB_REPO: '',
  GITHUB_BRANCH: 'main',
  DIGEST_TOP_N: '10',
};

async function main() {
  console.log('🦞 Running local digest test...\n');

  const markdown = await runDigest(env);

  const today = new Date().toISOString().split('T')[0];
  const outPath = join(__dirname, '..', 'src', 'content', 'digests', `${today}.md`);
  writeFileSync(outPath, markdown, 'utf-8');

  console.log(`\n✅ Written to ${outPath}`);
  console.log(`\nPreview (first 500 chars):\n`);
  console.log(markdown.slice(0, 500));
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
