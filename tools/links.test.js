import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { brokenLinks, root } from './links.mjs';

const only = (...paths) => (full) => paths.some((p) => full === join(root, p));

test('a relative link to a missing file is broken, and one to a file that exists is not', () => {
  const text = '[here](docs/a.md) and [gone](docs/b.md)';
  assert.deepEqual(brokenLinks('README.md', text, only('docs/a.md')), ['docs/b.md']);
});

test('a link is read from the folder of the file it is in, and its fragment is ignored', () => {
  const text = '[up](../../docs/a.md#why)';
  assert.deepEqual(brokenLinks('plugin/plugins/x/y.md', text, only('docs/a.md')), ['../../docs/a.md#why']);
  assert.deepEqual(brokenLinks('.claude/x/y.md', text, only('docs/a.md')), []);
});

test('links to other sites, anchors, and examples in code are not checked', () => {
  const text = '[site](https://example.com) [top](#top) `[eg](nowhere.md)`\n```\n[eg](nowhere.md)\n```\n';
  assert.deepEqual(brokenLinks('README.md', text, () => false), []);
});
