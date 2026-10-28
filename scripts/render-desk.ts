import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import reports from '../src/lib/data/reports-4471.json' with { type: 'json' };
import notes from '../src/lib/data/desk-notes.json' with { type: 'json' };
import { groupByCause, readAs, ticketCause, uniqueById, type Report, type Tenant } from '../src/lib/kb/causes.ts';
import { deskRef } from '../src/lib/kb/desk-ref.ts';
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
    const t = JSON.parse(readFileSync(new URL(`../src/lib/data/tenants/${handle}.json`, import.meta.url), 'utf8')) as Tenant;
    return [t.handle, t];
  }),
);

const tenantOf = (r: Report) => tenants[r.tenant];
const ticket = 4471;
const merged = uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket);
const groups = groupByCause(merged, tenantOf);
const owner = ticketCause(groups, ticket);
const signature = 'Stefan Freudenreich';
const reviewed = '2026-10-28';
const ref = deskRef(signature);
const age = daysSince(reviewed);

const tags = (taggedAs: Record<string, number>) =>
  Object.entries(taggedAs)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, n]) => `${tag} ×${n}`)
    .join(' · ');

const rows = groups
  .map((g) => {
    const mark = g.cause === owner ? `#${ticket}` : 'not this ticket — no ticket of its own';
    const cls = g.cause === owner ? '' : ' class="wrong"';
    return `<tr${cls}><td><code>${g.cause}</code></td><td>${g.reports.length}</td><td class="tags">${tags(g.taggedAs)}</td><td>${g.tenants}</td><td>${g.firstSeen} → ${g.lastSeen}</td><td>${mark}</td></tr>`;
  })
  .join('\n');

const notesHtml = groups
  .map((g) => {
    const moved = readAs(g, notes.oneDayMove);
    return moved ? `<p class="note">${moved} reports read as a one-day move; filed under <code>${g.cause}</code> by tenant.</p>` : '';
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
    .tags { color: var(--muted); font-size: 0.85em; }
    .note { color: var(--muted); font-size: 0.85em; }
    .wrong td { background: var(--warn-bg); }
    .wrong td:last-child { color: var(--warn); font-weight: 600; }
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
      <p>#4471 was marked known, as one parser bug. The desk’s own table is the count, from the export, one row per report id.</p>
      <p>The shared parser reads a day-first date month first. That cause is this ticket.</p>
      <p>booking-v3 prints <code>MM/DD/YYYY</code> under the date field and then reads the field day first. Those reports were merged into #4471. They are a second problem, and they have no ticket of their own.</p>
      <p>A few reports were read as a one-day move. The desk still counts them under the cause their tenant files them in.</p>
      <p class="sum"><strong>${merged.length}</strong> reports merged into #${ticket} · <strong>${groups.length}</strong> ${groups.length === 1 ? 'cause' : 'causes'}</p>
      <table>
        <thead><tr><th>cause</th><th>reports</th><th>tagged as</th><th>tenants</th><th>seen</th><th></th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      ${notesHtml}
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
for (const g of groups) console.log(g.cause, g.reports.length, 'moved', readAs(g, notes.oneDayMove));
console.log('owner', owner, 'ref', ref);
