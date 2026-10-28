import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import reports from '../src/lib/data/reports-4471.json' with { type: 'json' };
import { uniqueById, type Report } from '../src/lib/kb/causes.ts';
import { deskRef } from '../src/lib/kb/desk-ref.ts';
import { PROBLEM_COPY, groupProblems, type ProblemId } from '../src/lib/kb/problems.ts';
import { daysSince, isoDay } from '../src/lib/kb/staleness.ts';

const tenants = Object.fromEntries(
  [
    'alder.physio',
    'copper.studio',
    'harbour.dental',
    'kettle.books',
    'lantern.row',
    'long.table',
    'morrow.tax',
    'nine.lanterns',
    'pale.harbour',
    'ridge.clinic',
    'stone.and.sons',
  ].map((handle) => {
    const t = JSON.parse(readFileSync(new URL(`../src/lib/data/tenants/${handle}.json`, import.meta.url), 'utf8'));
    return [t.handle, t];
  }),
);

const tenantOf = (r: Report) => tenants[r.tenant];
const merged = uniqueById(reports as Report[]).filter((r) => r.mergedInto === 4471);
const groups = groupProblems(merged, tenantOf);
const sum = groups.reduce((n, g) => n + g.reports.length, 0);
if (sum !== merged.length || groups.some((g) => g.id === 'unplaced')) {
  console.error('partition failed', sum, groups.map((g) => [g.id, g.reports.length]));
  process.exit(1);
}

const signature = 'Stefan Freudenreich';
const reviewed = '2026-10-28';
const ref = deskRef(signature);
const age = daysSince(reviewed);
const copy = (id: ProblemId) =>
  id === 'unplaced' ? { title: 'Unplaced', detail: '' } : PROBLEM_COPY[id];

const rows = groups
  .map((g) => {
    const c = copy(g.id);
    return `<tr><td><code>${g.id}</code></td><td>${g.reports.length}</td><td>${c.title}. ${c.detail}</td></tr>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>#4471 · more than one problem · support kb</title>
  <style>
    :root {
      --bg: #fbfaf7; --fg: #1d1d1b; --muted: #6b6a66; --line: #e3e0d8;
      --accent: #2f6f5e; --warn: #b4501f; --warn-bg: #fbeee6; --note-bg: #eef5f2;
      --mono: ui-monospace, 'Cascadia Code', Menlo, monospace;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #171716; --fg: #ecebe6; --muted: #9c9a93; --line: #34332f;
        --accent: #6fbfa6; --warn: #f0905d; --warn-bg: #3a2418; --note-bg: #1d2c27;
      }
    }
    body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.6 system-ui, sans-serif; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.92rem; }
    th, td { border-bottom: 1px solid var(--line); padding: 0.35rem 0.5rem; text-align: left; vertical-align: top; }
    code { font-family: var(--mono); font-size: 0.88em; }
    .kb { max-width: 760px; margin: 0 auto; padding: 2rem 16px 4rem; }
    .crumb { font: 0.8rem var(--mono); text-decoration: none; color: var(--muted); }
    h1 { margin: 0.25rem 0 0.5rem; line-height: 1.2; }
    .meta { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; color: var(--muted); font-size: 0.85rem; margin: 0; }
    .status { border: 1px solid var(--line); border-radius: 99px; padding: 0 0.6rem; }
    .sum { font-size: 1.1rem; }
    footer { margin-top: 3rem; color: var(--muted); font-size: 0.8rem; border-top: 1px solid var(--line); padding-top: 1rem; }
    .stamp { margin: 2rem 0 0; font: 0.85rem var(--mono); color: var(--muted); }
    .stamp b { color: var(--accent); letter-spacing: 0.04em; }
  </style>
</head>
<body>
  <div class="kb">
    <header>
      <a class="crumb" href="/kb">support desk · kb</a>
      <h1>#4471 · more than one problem</h1>
      <p class="meta">
        <span>owner <b>Stefan Freudenreich</b></span>
        <span class="status open">open</span>
        <span>reviewed ${isoDay(reviewed)} · ${age} days ago</span>
      </p>
    </header>
    <main>
      <p>#4471 merged every date report into one ticket and marked it known: the parser reads dates month first. That is one of the problems. It is not the only one.</p>
      <p>A report counts once per id. The export repeats some ids, and the repeats are the same report.</p>
      <p>A swapped day and month is the shared parser, except when the report came in on the booking-v3 form. That form prints <code>MM/DD/YYYY</code> and then reads the field day first. The swap looks the same. The bug is the hint.</p>
      <p>Reports that name no pair stay with the parser when the body is still that bug: a day-first setting, October bookings landing in January, a wrong day with no second date, a date given in words so the parser cannot flip it. The rest are not the parser. The calendar shows the day before the words do. June moves by one day and other months do not. An invite arrives before the booking exists. One meeting is Tuesday in Lisbon and Monday in Toronto.</p>
      <p class="sum"><strong>${merged.length}</strong> reports in #4471, one row per id · <strong>${groups.length}</strong> problems</p>
      <table>
        <thead><tr><th>problem</th><th>reports</th><th>what it is</th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p class="stamp">desk ref <b>${ref}</b></p>
    </main>
    <footer>Pages are written by people. Tables and charts are built from data at render time.</footer>
  </div>
</body>
</html>
`;

const out = resolve('rendered/kb/incidents/4471-problems.html');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
const summary = groups.map((g) => ({ id: g.id, n: g.reports.length, ids: g.reports.map((r) => r.id) }));
writeFileSync('rendered/problems.json', JSON.stringify({ signature, ref, total: merged.length, groups: summary }, null, 2));
console.log(ref);
for (const g of groups) console.log(g.id, g.reports.length);
console.log('total', sum);
