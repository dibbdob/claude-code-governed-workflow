// The checks OpenSpec does not make, which build.sh runs beside `openspec validate`: every scenario in
// openspec/specs has a test that names it, as `[<capability>] <scenario>`, and no test names a scenario that
// neither the specs nor an open change has (ADR 0008); and every scenario in an open change has worked
// examples, a table under it a person can check without reading code (ADR 0009).
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

/** Each scenario in a spec with the text under it, up to the next heading. */
export function scenarioBlocks(text) {
  return [...text.matchAll(/^#### Scenario:\s*(.+?)\s*$([\s\S]*?)(?=^#{1,4} |(?![\s\S]))/gm)]
    .map((m) => ({ name: m[1], body: m[2] }));
}

/** The rows of the first table in a scenario's text, without its header and divider. */
export function exampleRows(body) {
  const table = body.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|'));
  return table.slice(2).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
}

/** The column names of the first table in a scenario's text. */
export function exampleColumns(body) {
  const header = body.split('\n').map((l) => l.trim()).find((l) => l.startsWith('|'));
  return header ? header.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()) : [];
}

/** The `<placeholders>` a scenario's steps use, in order, each once. */
export function placeholders(body) {
  const steps = body.split('\n').filter((l) => /^- \*\*(GIVEN|WHEN|AND|THEN|BUT)\*\*/.test(l)).join('\n');
  return [...new Set([...steps.matchAll(/<([^<>]+)>/g)].map((m) => m[1].trim()))];
}

/**
 * Problems with the worked examples of open changes' scenarios (ADR 0009): a scenario with none, a step's
 * <placeholder> that is not a column, a column no step uses. Living specs written before the rule are exempt.
 */
export function examplesProblems(changes) {
  return changes.flatMap((c) => scenarioBlocks(c.text).flatMap((b) => {
    const at = `${c.change}: the scenario "${b.name}" (${c.capability})`;
    if (exampleRows(b.body).length === 0) return [`${at} has no worked examples`];
    const used = placeholders(b.body);
    const columns = exampleColumns(b.body);
    return [
      ...used.filter((p) => !columns.includes(p)).map((p) => `${at} uses <${p}>, which is not a column of its examples`),
      ...columns.filter((col) => !used.includes(col)).map((col) => `${at} has the column "${col}", which no step uses`),
    ];
  }));
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
    .map((p) => ({ change: p.split('/')[2], capability: p.replace(/^openspec\/changes\/[^/]+\/specs\//, '').replace(/\/spec\.md$/, ''), text: readFileSync(p, 'utf8') }));
  const tests = files('test').filter((p) => p.endsWith('.test.js')).map((p) => readFileSync(p, 'utf8')).join('\n');

  const problems = [...coverageProblems(specs, openChanges, tests), ...examplesProblems(openChanges)];
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
