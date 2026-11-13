// Acceptance criteria as something the build can count.
//
//   node tools/criteria.mjs number docs/specs/0002-public-holidays.md
//   node tools/criteria.mjs check
//
// `number` gives every unnumbered criterion an identifier, <spec>-AC-<k>, and records the highest number
// ever issued under the heading, so a deleted criterion's number is never handed to a new one. It never
// renumbers a criterion that already has one.
//
// `check` fails when a specification marked done has a criterion that is unnumbered, or that no test
// names, or when a test names a criterion that does not exist. A test names one by putting its identifier
// in square brackets in the test's title: test('[0001-AC-2] an outage on any other plan is high', ...).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const HEADING = '## Acceptance criteria';
const MARKER = /^<!-- criteria high-water: (\d+) -->$/;
const NUMBERED = /^- \*\*(\d{4}-AC-\d+)\*\* /;

/** The criteria in a specification, in order, with their identifiers where they have one. */
export function parseCriteria(text) {
  const lines = text.split('\n');
  const start = lines.indexOf(HEADING);
  if (start === -1) {
    return { criteria: [], highWater: 0 };
  }

  const criteria = [];
  let highWater = 0;
  for (let i = start + 1; i < lines.length && !lines[i].startsWith('## '); i++) {
    const line = lines[i];
    const marker = MARKER.exec(line);
    if (marker) {
      highWater = Number(marker[1]);
    } else if (line.startsWith('- ')) {
      const id = NUMBERED.exec(line)?.[1] ?? null;
      criteria.push({ id, line: i, text: line.replace(NUMBERED, '- ').slice(2) });
    } else if (line.startsWith('  ') && criteria.length > 0) {
      criteria.at(-1).text += ' ' + line.trim();
    }
  }
  return { criteria, highWater };
}

/** The specification with every unnumbered criterion numbered and the high-water marker up to date. */
export function numberCriteria(text, specNumber) {
  const { criteria, highWater } = parseCriteria(text);
  const lines = text.split('\n');
  const issued = criteria.filter((c) => c.id).map((c) => Number(c.id.split('-AC-')[1]));
  let next = Math.max(highWater, ...issued, 0);

  for (const criterion of criteria.filter((c) => !c.id)) {
    next += 1;
    lines[criterion.line] = lines[criterion.line].replace(/^- /, `- **${specNumber}-AC-${next}** `);
  }

  const markerLine = `<!-- criteria high-water: ${next} -->`;
  const start = lines.indexOf(HEADING);
  const existing = lines.findIndex((l, i) => i > start && MARKER.test(l));
  if (existing !== -1) {
    lines[existing] = markerLine;
  } else {
    lines.splice(start + 1, 0, '', markerLine);
  }
  return lines.join('\n');
}

/** Every problem that should fail the build, as one message each. */
export function findProblems(specs, testSource) {
  const cited = new Set([...testSource.matchAll(/\[(\d{4}-AC-\d+)\]/g)].map((m) => m[1]));
  const known = new Set();
  const problems = [];

  for (const { name, text } of specs) {
    const { criteria } = parseCriteria(text);
    criteria.filter((c) => c.id).forEach((c) => known.add(c.id));
    if (!/^Status: done$/m.test(text)) {
      continue;
    }
    for (const c of criteria) {
      if (!c.id) {
        problems.push(`${name}: a criterion is not numbered: "${c.text.slice(0, 60)}..."`);
      } else if (!cited.has(c.id)) {
        problems.push(`${name}: no test names ${c.id}`);
      }
    }
  }
  for (const id of cited) {
    if (!known.has(id)) {
      problems.push(`a test names ${id}, which no specification has`);
    }
  }
  return problems;
}

/**
 * The identifiers of criteria that existed before and whose words have since changed or gone. A criterion
 * that had no identifier before is new to numbering, not changed.
 */
export function changedCriteria(before, after) {
  const now = new Map(parseCriteria(after).criteria.filter((c) => c.id).map((c) => [c.id, c.text]));
  return parseCriteria(before)
    .criteria.filter((c) => c.id && now.get(c.id) !== c.text)
    .map((c) => c.id);
}

/** Specification numbers used by more than one file. Each person takes "one more than the highest", so two
 * people on the same day can take the same number; whichever merges second renumbers. */
export function duplicateNumbers(names) {
  const byNumber = new Map();
  for (const name of [...names].sort()) {
    byNumber.set(name.slice(0, 4), [...(byNumber.get(name.slice(0, 4)) ?? []), name]);
  }
  return [...byNumber].filter(([, files]) => files.length > 1)
    .map(([n, files]) => `${n} is used by ${files.join(' and ')}; renumber the one merged second`);
}

const gitOk = (args) => {
  try {
    execFileSync('git', args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/** What a criterion is compared with: the team's main when this checkout has one, so a stale local main
 * cannot hide a reworded criterion, and the local main in a repository with no remote. */
export function baseRef(exists = (ref) => gitOk(['rev-parse', '--verify', '--quiet', ref])) {
  return exists('origin/main') ? 'origin/main' : 'main';
}

function onBase(base, path) {
  try {
    return execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

function main([command, file]) {
  if (command === 'number' && file) {
    const specNumber = basename(file).slice(0, 4);
    writeFileSync(file, numberCriteria(readFileSync(file, 'utf8'), specNumber));
    return 0;
  }
  if (command === 'check') {
    const specs = readdirSync('docs/specs')
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ name: f, text: readFileSync(join('docs/specs', f), 'utf8') }));
    const tests = readdirSync('test')
      .filter((f) => f.endsWith('.test.js'))
      .map((f) => readFileSync(join('test', f), 'utf8'))
      .join('\n');
    const problems = [...findProblems(specs, tests), ...duplicateNumbers(specs.map((s) => s.name))];

    // A criterion is the contract the tests were written against, so implementing a specification never
    // rewords one. Amending a specification is its own change, made deliberately with the override.
    if (process.env.ALLOW_CRITERIA_CHANGE !== '1') {
      const base = baseRef();
      for (const { name, text } of specs) {
        const before = onBase(base, `docs/specs/${name}`);
        for (const id of before ? changedCriteria(before, text) : []) {
          problems.push(`${name}: ${id} differs from ${base}. Criteria are not edited while implementing; ` +
            'amend the specification on its own branch with ALLOW_CRITERIA_CHANGE=1.');
        }
      }
    }
    problems.forEach((p) => console.error(p));
    return problems.length === 0 ? 0 : 1;
  }
  console.error('usage: node tools/criteria.mjs number <spec> | check');
  return 2;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main(process.argv.slice(2));
}
