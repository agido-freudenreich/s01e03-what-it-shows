<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { PROBLEM_COPY, groupProblems, type ProblemId } from '#lib/kb/problems';

  let { ticket }: { ticket: number } = $props();

  const merged = $derived(uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket));
  const groups = $derived(groupProblems(merged, tenantOf));
  const copy = (id: ProblemId) => (id === 'unplaced' ? { title: 'Unplaced', detail: 'No rule in problems.ts covers this report.' } : PROBLEM_COPY[id]);
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports in #{ticket}, one row per id ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>what it is</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.id)}
      <tr>
        <td><code>{g.id}</code></td>
        <td>{g.reports.length}</td>
        <td>{copy(g.id).title}. {copy(g.id).detail}</td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .sum { font-size: 1.1rem; }
</style>
