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
  GITHUB_TOKEN: '',
  GITHUB_REPO: '',
  GITHUB_BRANCH: 'main',
  DIGEST_TOP_N: '10',
};

async function main() {
  console.log('🦞 Running local digest test...\n');

  const today = new Date().toISOString().split('T')[0];
  const markdown = await runDigest(env, today);

  // Deliberately NOT src/content/digests/ — never clobber the real archive.
  const outPath = join(__dirname, 'test-output.md');
  writeFileSync(outPath, markdown, 'utf-8');

  console.log(`\n✅ Written to ${outPath}`);
  console.log(`\nPreview (first 500 chars):\n`);
  console.log(markdown.slice(0, 500));
}

main().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
