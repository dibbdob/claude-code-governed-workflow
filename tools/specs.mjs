// The checks OpenSpec does not make, which build.sh runs beside `openspec validate`: every scenario in
// openspec/specs has a test that names it, as `[<capability>] <scenario>`, and no test names a scenario that
// neither the specs nor an open change has (ADR 0006); and every scenario in an open change has worked
// examples, a table under it a person can check without reading code (ADR 0007); and every open change's
// tasks end with /deliver's own steps, so that `openspec validate --archived` fails a delivery that skipped
// one (ADR 0009). Where the tests are, and how a title is read, is the project's to say, in
// scripts/test-citations.json (ADR 0012).
//
// Rewording a change during delivery is allowed, as OpenSpec intends, while its intent holds: archiving
// lists what changed since approval for a person to confirm (openspec/config.yaml).
//
//   node tools/specs.mjs check         the checks, for build.sh
//   node tools/specs.mjs citations     where each test cites a scenario, as file:line: [capability] scenario
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/** The scenario names in a spec, in order. */
export function scenarios(text) {
  return [...text.matchAll(/^#### Scenario:\s*(.+?)\s*$/gm)].map((m) => m[1]);
}

/** Each scenario in a spec with the text under it, up to the next heading. */
export function scenarioBlocks(text) {
  return [...text.matchAll(/^#### Scenario:\s*(.+?)\s*$([\s\S]*?)(?=^#{1,4} |(?![\s\S]))/gm)]
    .map((m) => ({ name: m[1], body: m[2] }));
}

// The lines of the first table in a scenario's text: from its first `|` line to the first line that is not one.
function firstTable(body) {
  const lines = body.split('\n').map((l) => l.trim());
  const start = lines.findIndex((l) => l.startsWith('|'));
  if (start < 0) return [];
  const end = lines.findIndex((l, i) => i > start && !l.startsWith('|'));
  return lines.slice(start, end < 0 ? lines.length : end);
}
const cells = (line) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** The rows of the first table in a scenario's text, without its header and divider. */
export function exampleRows(body) {
  return firstTable(body).slice(2).map(cells);
}

/** The column names of the first table in a scenario's text. */
export function exampleColumns(body) {
  const [header] = firstTable(body);
  return header ? cells(header) : [];
}

/** The `<placeholders>` a scenario's steps use, in order, each once. */
export function placeholders(body) {
  const steps = body.split('\n').filter((l) => /^- \*\*(GIVEN|WHEN|AND|THEN|BUT)\*\*/.test(l)).join('\n');
  return [...new Set([...steps.matchAll(/<([^<>]+)>/g)].map((m) => m[1].trim()))];
}

/**
 * Problems with the worked examples of open changes' scenarios (ADR 0007): a scenario with none, a step's
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

/** The tasks every change ends with: /deliver's grounding, review, second review and verify (ADRs 0009, 0011). */
export const DELIVERY_TASKS = ['Grounding:', 'Independent review:', 'Second review:', 'OpenSpec verify:'];

/**
 * Problems with the Delivery group of open changes' tasks: missing, or without one of its four tasks. Once
 * it is there, OpenSpec itself refuses to count a change archived with one of them unticked.
 */
export function deliveryTasksProblems(changes) {
  return changes.flatMap((c) => {
    const group = c.text.match(/^## \d+\. Delivery\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m);
    if (!group) return [`${c.change}: its tasks have no "## <n>. Delivery" group (openspec/config.yaml)`];
    const tasks = [...group[1].matchAll(/^- \[[ xX]\] \d+\.\d+ (.*)$/gm)].map((m) => m[1]);
    return DELIVERY_TASKS.filter((t) => !tasks.some((task) => task.startsWith(t)))
      .map((t) => `${c.change}: its Delivery group has no "${t.slice(0, -1)}" task`);
  });
}

// A quoted `[capability] Scenario name`. It runs to the quote that opened it, so a scenario's name may hold
// the other quotes, or the same one escaped: "A customer's ticket".
const QUOTED = String.raw`(?<q>['"\x60])\[(?<capability>[a-z0-9/-]+)\]\s+(?<scenario>(?:\\.|(?!\k<q>)[^\\\n])+?)\k<q>`;

/**
 * How a test's title is found, by name (scripts/test-citations.json, ADR 0012). `node-test` is a title given
 * to test() or it(), as in node:test, Jest or Mocha. `quoted` is any quoted string that starts with the
 * citation, which covers most other languages: xUnit's DisplayName, Go's t.Run, a pytest marker or docstring.
 */
export const STYLES = {
  'node-test': new RegExp(String.raw`\b(?:test|it)\(\s*` + QUOTED, 'g'),
  quoted: new RegExp(QUOTED, 'g'),
};

/**
 * Every `[capability] Scenario name` a test title cites, with the line it is on. `style` is a name from
 * STYLES or a RegExp with the named groups `capability` and `scenario`.
 */
export function citations(tests, style = 'node-test') {
  const given = style instanceof RegExp ? style : STYLES[style];
  const pattern = new RegExp(given.source, given.flags.includes('g') ? given.flags : given.flags + 'g');
  return [...tests.matchAll(pattern)].map((m) => ({
    capability: m.groups.capability,
    scenario: m.groups.scenario.replace(/\\(.)/g, '$1').trim(),
    line: tests.slice(0, m.index).split('\n').length,
  }));
}

/** Where the tests are when a project does not say: this repository's own layout. */
export const DEFAULT_TEST_CONFIG = { dirs: ['test'], suffixes: ['.test.js'], style: 'node-test' };

/**
 * The project's test config (scripts/test-citations.json), checked: the folders its tests are in, the
 * endings of their file names, and either a `style` from STYLES or a `pattern` of its own. Throws on
 * anything it would otherwise have to guess at.
 */
export function testConfig(text) {
  if (text === undefined) return { ...DEFAULT_TEST_CONFIG, pattern: STYLES[DEFAULT_TEST_CONFIG.style] };
  let c;
  try { c = JSON.parse(text); } catch (e) { throw new Error(`scripts/test-citations.json is not JSON: ${e.message}`); }
  const at = 'scripts/test-citations.json';
  if (c === null || typeof c !== 'object' || Array.isArray(c)) throw new Error(`${at} must be an object`);
  const unknown = Object.keys(c).filter((k) => !['dirs', 'suffixes', 'style', 'pattern'].includes(k));
  if (unknown.length) throw new Error(`${at} has keys it does not use: ${unknown.join(', ')}`);
  for (const key of ['dirs', 'suffixes']) {
    if (!Array.isArray(c[key]) || c[key].length === 0 || !c[key].every((v) => typeof v === 'string' && v !== '')) {
      throw new Error(`${at}: "${key}" must be a list of one or more names`);
    }
  }
  const outside = c.dirs.filter((d) => d.startsWith('/') || d.split(/[\\/]/).includes('..'));
  if (outside.length) throw new Error(`${at}: "dirs" must be inside the project: ${outside.join(', ')}`);
  if ((c.style === undefined) === (c.pattern === undefined)) throw new Error(`${at} needs a "style" or a "pattern", not both`);
  let pattern;
  if (c.style !== undefined) {
    if (!Object.hasOwn(STYLES, c.style)) throw new Error(`${at}: no style "${c.style}"; there are ${Object.keys(STYLES).join(', ')}`);
    pattern = STYLES[c.style];
  } else {
    // Read a line at a time, as people expect of ^ and $ in a test file.
    try { pattern = new RegExp(c.pattern, 'gm'); } catch (e) { throw new Error(`${at}: "pattern" is not a regular expression: ${e.message}`); }
    if (!/\(\?<capability>/.test(c.pattern) || !/\(\?<scenario>/.test(c.pattern)) {
      throw new Error(`${at}: "pattern" must have the named groups (?<capability>...) and (?<scenario>...)`);
    }
  }
  return { dirs: c.dirs, suffixes: c.suffixes, style: c.style, pattern };
}

/**
 * Problems with how tests cover the specs. `specs` are the living specs; `changes` are the spec files of open
 * changes, which tests may already name while the change is being delivered.
 */
export function coverageProblems(specs, changes, tests, style = 'node-test') {
  const cited = Array.isArray(tests) ? tests : citations(tests, style);
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

const files = (dir, skip = () => false) => !existsSync(dir) ? [] : readdirSync(dir).flatMap((f) => {
  const path = join(dir, f);
  if (skip(f)) return [];
  return statSync(path).isDirectory() ? files(path, skip) : [path];
});
const posix = (p) => p.split(sep).join('/');

// The project's test files, as its config says, and every citation in them with its file and line. A folder
// that does not exist is an error: read as no tests, it would look like a project that tests nothing.
// Installed packages and hidden folders are never the project's tests.
function testCitations() {
  const configFile = 'scripts/test-citations.json';
  const config = testConfig(existsSync(configFile) ? readFileSync(configFile, 'utf8') : undefined);
  const missing = config.dirs.filter((d) => !existsSync(d));
  if (missing.length) throw new Error(`${configFile}: no such folder for tests: ${missing.join(', ')}`);
  const skip = (name) => name === 'node_modules' || name.startsWith('.');
  return config.dirs.flatMap((d) => files(d, skip)).map(posix)
    .filter((p, i, all) => config.suffixes.some((s) => p.endsWith(s)) && all.indexOf(p) === i)
    .sort()
    .flatMap((p) => citations(readFileSync(p, 'utf8'), config.pattern).map((c) => ({ ...c, file: p })));
}

function check() {
  const specFiles = files('openspec/specs').filter((p) => p.endsWith('spec.md'));
  const specs = specFiles.map((p) => ({ capability: posix(relative('openspec/specs', p)).replace(/\/spec\.md$/, ''), text: readFileSync(p, 'utf8') }));
  const changeFiles = files('openspec/changes').map(posix).filter((p) => /\/specs\/.+\.md$/.test(p));
  const openChanges = changeFiles.filter((p) => !p.startsWith('openspec/changes/archive/'))
    .map((p) => ({ change: p.split('/')[2], capability: p.replace(/^openspec\/changes\/[^/]+\/specs\//, '').replace(/\/spec\.md$/, ''), text: readFileSync(p, 'utf8') }));
  const openTasks = readdirSync('openspec/changes').filter((d) => d !== 'archive')
    .filter((d) => existsSync(join('openspec/changes', d, 'tasks.md')) || existsSync(join('openspec/changes', d, 'proposal.md')))
    .map((d) => ({ change: d, text: existsSync(join('openspec/changes', d, 'tasks.md')) ? readFileSync(join('openspec/changes', d, 'tasks.md'), 'utf8') : '' }));
  const tests = testCitations();

  const problems = [...coverageProblems(specs, openChanges, tests), ...examplesProblems(openChanges), ...deliveryTasksProblems(openTasks)];
  problems.forEach((p) => console.error(p));
  return problems.length === 0 ? 0 : 1;
}

// Where each test cites a scenario, one per line as file:line: [capability] scenario, for the reviewer
// (/deliver step 3).
function list() {
  testCitations().forEach((c) => console.log(`${c.file}:${c.line}: [${c.capability}] ${c.scenario}`));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const commands = { check, citations: list };
  if (process.argv.length !== 3 || !Object.hasOwn(commands, process.argv[2])) {
    console.error('usage: node tools/specs.mjs check | citations');
    process.exit(2);
  }
  try {
    process.exitCode = commands[process.argv[2]]();
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
