#!/usr/bin/env node
// Every relative link in a committed Markdown file points at a file or folder that exists.
//
//     node tools/links.mjs
//
// Links to other sites are not followed: a build should not depend on the network. A link's #fragment is
// not checked either, only its file.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// A Markdown link or image: ](target) or ](target "title"). Code spans and fenced blocks are skipped
// first, since an example there is not a link.
const LINK = /\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;

export function brokenLinks(file, text, exists) {
  const prose = text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
  const broken = [];
  for (const [, target] of prose.matchAll(LINK)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    const full = path.startsWith('/') ? join(root, path) : join(dirname(join(root, file)), path);
    if (!exists(full)) broken.push(target);
  }
  return broken;
}

function main() {
  const files = execFileSync('git', ['ls-files', '*.md'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  let failed = 0;
  for (const file of files) {
    for (const target of brokenLinks(file, readFileSync(join(root, file), 'utf8'), existsSync)) {
      console.error(`${file}: ${target} does not exist`);
      failed++;
    }
  }
  if (failed) {
    console.error(`${failed} broken link${failed === 1 ? '' : 's'}.`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
