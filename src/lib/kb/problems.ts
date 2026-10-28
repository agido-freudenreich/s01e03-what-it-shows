// Problems inside ticket #4471. The desk filed every report under one cause.
// A swapped day and month follows the tenant (causes.ts). Anything else is read from the report body.

import { causeOf, type Report, type Tenant } from './causes.ts';

export const PROBLEM_IDS = ['parser', 'hint', 'previous-day', 'june-only', 'early-invite', 'timezone-day'] as const;
export type ProblemId = (typeof PROBLEM_IDS)[number] | 'unplaced';

export const PROBLEM_COPY: Record<Exclude<ProblemId, 'unplaced'>, { title: string; detail: string }> = {
  parser: {
    title: 'Parser reads a day-first date month first',
    detail: 'The shared parser reads every date month first. A day-first tenant sends the day first, and the month and the day come out swapped.',
  },
  hint: {
    title: 'booking-v3 form prints MM/DD and reads the day first',
    detail: 'booking-v3 prints MM/DD/YYYY under the date field. The people follow the hint, and the form then reads the field the tenant’s way, day first. Same swap, different bug, and only on that form.',
  },
  'previous-day': {
    title: 'Calendar shows the previous day',
    detail: 'The words name the right day, and the calendar lands on the day before. Tuesday 12 May is Monday 11 May. Tuesday 6 October shows as Monday.',
  },
  'june-only': {
    title: 'June bookings move by one day',
    detail: 'Every booking in June is one day off, and other months are not. This is not the month/day swap.',
  },
  'early-invite': {
    title: 'Invite arrives before the booking exists',
    detail: 'The invite is delivered before the booking is made.',
  },
  'timezone-day': {
    title: 'One meeting is a different day in Lisbon and Toronto',
    detail: 'The same meeting is Tuesday for a client in Lisbon and Monday for a client in Toronto.',
  },
};

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

export function datesIn(body: string): { d: number; mon: number }[] {
  const re =
    /\b(?:(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+)?(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi;
  const out: { d: number; mon: number }[] = [];
  for (const m of body.matchAll(re)) out.push({ d: Number(m[1]), mon: MONTHS[m[2].toLowerCase()] });
  return out;
}

// Two dates are a swap when each is the other with the day and the month exchanged.
export function isSwap(a: { d: number; mon: number }, b: { d: number; mon: number }): boolean {
  return a.d !== b.d && a.d === b.mon && a.mon === b.d && a.d <= 12 && b.d <= 12;
}

export function problemOf(r: Pick<Report, 'channel' | 'body'>, t: Tenant | undefined): ProblemId {
  const dates = datesIn(r.body);
  if (dates.length === 2 && isSwap(dates[0], dates[1])) return causeOf(r, t) === 'hint' ? 'hint' : 'parser';
  if (/before I made the booking/i.test(r.body)) return 'early-invite';
  if (/Lisbon/i.test(r.body) && /Toronto/i.test(r.body)) return 'timezone-day';
  if (/Only June/i.test(r.body)) return 'june-only';
  if (/Calendar says Monday/i.test(r.body) || /showed as Monday/i.test(r.body)) return 'previous-day';
  if (causeOf(r, t) === 'hint') return 'hint';
  if (causeOf(r, t) === 'parser') return 'parser';
  return 'unplaced';
}

export type ProblemGroup = {
  id: ProblemId;
  reports: Report[];
};

export function groupProblems(reports: Report[], tenantOf: (r: Report) => Tenant | undefined): ProblemGroup[] {
  const byId = new Map<ProblemId, Report[]>();
  for (const r of reports) {
    const id = problemOf(r, tenantOf(r));
    byId.set(id, [...(byId.get(id) ?? []), r]);
  }
  const order: ProblemId[] = [...PROBLEM_IDS, 'unplaced'];
  return order
    .filter((id) => byId.has(id))
    .map((id) => ({ id, reports: byId.get(id) ?? [] }))
    .sort((a, b) => b.reports.length - a.reports.length);
}
