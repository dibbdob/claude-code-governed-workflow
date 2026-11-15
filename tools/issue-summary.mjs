// The summary of an approved change that the refined workflow writes onto its issue, below what was asked
// (ADR 0010), and the line the revised workflow adds when a delivery reworded a requirement. The summary is
// taken from the change itself, so it says nothing the approved change does not, and it sits between two
// markers so that writing it again replaces it rather than adding a second copy. The specification stays
// the authority; the summary links to it as approved.
//
//   node tools/issue-summary.mjs section <change-dir> <approved-on> <spec-url> <pr-number | ->
//   node tools/issue-summary.mjs apply <body-file> <section-file>
//   node tools/issue-summary.mjs revised <body-file> <pr-number>
//
// Each prints the result to stdout: the section, or the issue's new body.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const START = '<!-- refined: written by the refined workflow; the specification is the authority -->';
export const END = '<!-- /refined -->';

// The text under a "## <heading>" up to the next heading of that level or higher.
function sectionOf(markdown, heading) {
  const lines = markdown.split('\n');
  const at = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (at < 0) return '';
  const rest = lines.slice(at + 1);
  const end = rest.findIndex((line) => /^#{1,2} /.test(line));
  return (end < 0 ? rest : rest.slice(0, end)).join('\n').trim();
}

const firstParagraph = (text) => text.split(/\n\s*\n/)[0].trim();

// Every scenario's name and its table of worked examples, in the order the spec gives them.
export function examples(spec) {
  const found = [];
  let current = null;
  for (const line of spec.split('\n')) {
    const scenario = line.match(/^#### Scenario:\s*(.+)$/);
    if (scenario) {
      current = { name: scenario[1].trim(), rows: [] };
      found.push(current);
    } else if (current && line.trim().startsWith('|')) {
      current.rows.push(line.trim());
    } else if (current && current.rows.length && line.trim() !== '') {
      current = null;
    }
  }
  return found.filter((s) => s.rows.length > 0);
}

export function section({ proposal, specs, approvedOn, specUrl, pr }) {
  const plain = sectionOf(proposal, 'In plain terms') || firstParagraph(sectionOf(proposal, 'Why'));
  const risk = firstParagraph(sectionOf(proposal, 'Risk'));
  const parts = [START, '', '---', '', `## Refined: approved ${approvedOn}`, ''];
  if (plain) parts.push(`**In plain terms:** ${plain.replace(/\s*\n\s*/g, ' ')}`, '');
  const all = specs.flatMap(examples);
  if (all.length) {
    parts.push('**Examples agreed**', '');
    for (const s of all) parts.push(`*${s.name}*`, '', ...s.rows, '');
  }
  if (risk) parts.push(`**Risk:** ${risk.replace(/\s*\n\s*/g, ' ')}`, '');
  parts.push(`**Specification, as approved:** ${specUrl}`);
  if (pr) parts.push(`**Refinement discussion:** #${pr}`);
  parts.push('', 'The specification is the authority; this is a summary of it as approved.', END);
  return parts.join('\n');
}

const REVISED = '**Revised during delivery:**';

// The issue's body with the section in place of an earlier one, or after what was asked. A delivery's note
// that it reworded the change is kept: it is about the delivery, which writing the summary again does not undo.
export function apply(body, written) {
  const start = body.indexOf(START);
  const end = body.indexOf(END);
  if (start < 0 || end < start) return `${body.trimEnd()}\n\n${written}\n`;
  const notes = body.slice(start, end).split('\n').filter((line) => line.startsWith(REVISED) && !written.includes(line));
  const kept = notes.length ? written.replace(END, `${notes.join('\n')}\n${END}`) : written;
  return body.slice(0, start) + kept + body.slice(end + END.length);
}

// The issue's body with a note that a delivery reworded the approved change, once per pull request.
export function revised(body, pr) {
  const line = `${REVISED} see #${pr}, under "Changed since approval", and confirm the intent is the same.`;
  if (body.includes(`see #${pr},`)) return body;
  const end = body.indexOf(END);
  if (end >= 0) return `${body.slice(0, end)}${line}\n${body.slice(end)}`;
  return `${body.trimEnd()}\n\n${START}\n\n${line}\n${END}\n`;
}

function readChange(dir) {
  const proposal = readFileSync(join(dir, 'proposal.md'), 'utf8');
  const specsDir = join(dir, 'specs');
  const specs = existsSync(specsDir)
    ? readdirSync(specsDir, { recursive: true }).filter((f) => String(f).endsWith('spec.md')).sort()
      .map((f) => readFileSync(join(specsDir, String(f)), 'utf8'))
    : [];
  return { proposal, specs };
}

function main([command, ...args]) {
  if (command === 'section' && args.length === 4) {
    const [dir, approvedOn, specUrl, pr] = args;
    return section({ ...readChange(dir), approvedOn, specUrl, pr: pr === '-' ? '' : pr });
  }
  if (command === 'apply' && args.length === 2) {
    return apply(readFileSync(args[0], 'utf8'), readFileSync(args[1], 'utf8').trimEnd());
  }
  if (command === 'revised' && args.length === 2) return revised(readFileSync(args[0], 'utf8'), args[1]);
  throw new Error('usage: issue-summary.mjs section <change-dir> <approved-on> <spec-url> <pr|-> | apply <body> <section> | revised <body> <pr>');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(main(process.argv.slice(2)));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
