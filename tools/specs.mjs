// The check OpenSpec does not make, which build.sh runs beside `openspec validate` (ADR 0008): every
// scenario in openspec/specs has a test that names it, as `[<capability>] <scenario>`, and no test names a
// scenario that neither the specs nor an open change has.
//
// Rewording a change during delivery is allowed, as OpenSpec intends, while its intent holds: archiving
// lists what changed since approval for a person to confirm (openspec/config.yaml).
//
//   node tools/specs.mjs check
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** The scenario names in a spec, in order. */
export function scenarios(text) {
  return [...text.matchAll(/^#### Scenario:\s*(.+?)\s*$/gm)].map((m) => m[1]);
}

/** Every `[capability] Scenario name` a test title cites. */
export function citations(tests) {
  return [...tests.matchAll(/\btest\(\s*['"`]\[([a-z0-9/-]+)\]\s+([^'"`]+?)['"`]/g)]
    .map((m) => ({ capability: m[1], scenario: m[2].trim() }));
}

/**
 * Problems with how tests cover the specs. `specs` are the living specs; `changes` are the spec files of open
 * changes, which tests may already name while the change is being delivered.
 */
export function coverageProblems(specs, changes, tests) {
  const cited = citations(tests);
  const key = (capability, scenario) => `${capability}\u0000${scenario}`;
  const citedKeys = new Set(cited.map((c) => key(c.capability, c.scenario)));
  const known = new Set([...specs, ...changes].flatMap((s) => scenarios(s.text).map((n) => key(s.capability, n))));

  const uncovered = specs.flatMap((s) => scenarios(s.text)
    .filter((n) => !citedKeys.has(key(s.capability, n)))
    .map((n) => `${s.capability}: no test names the scenario "${n}"`));
  const ghosts = cited.filter((c) => !known.has(key(c.capability, c.scenario)))
    .map((c) => `a test names "[${c.capability}] ${c.scenario}", which no spec or open change has`);
  return [...uncovered, ...ghosts];
}

const files = (dir) => !existsSync(dir) ? [] : readdirSync(dir).flatMap((f) => {
  const path = join(dir, f);
  return statSync(path).isDirectory() ? files(path) : [path];
});
const posix = (p) => p.split(sep).join('/');
function check() {
  const specFiles = files('openspec/specs').filter((p) => p.endsWith('spec.md'));
  const specs = specFiles.map((p) => ({ capability: posix(relative('openspec/specs', p)).replace(/\/spec\.md$/, ''), text: readFileSync(p, 'utf8') }));
  const changeFiles = files('openspec/changes').map(posix).filter((p) => /\/specs\/.+\.md$/.test(p));
  const openChanges = changeFiles.filter((p) => !p.startsWith('openspec/changes/archive/'))
    .map((p) => ({ capability: p.replace(/^openspec\/changes\/[^/]+\/specs\//, '').replace(/\/spec\.md$/, ''), text: readFileSync(p, 'utf8') }));
  const tests = files('test').filter((p) => p.endsWith('.test.js')).map((p) => readFileSync(p, 'utf8')).join('\n');

  const problems = coverageProblems(specs, openChanges, tests);
  problems.forEach((p) => console.error(p));
  return problems.length === 0 ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv[2] !== 'check') {
    console.error('usage: node tools/specs.mjs check');
    process.exit(2);
  }

  process.exitCode = check();
}
