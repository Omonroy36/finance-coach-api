import { DateTime, Interval } from 'luxon';

export function nowUtc(): DateTime {
  return DateTime.utc();
}

export function startOfMonth(dt: DateTime = DateTime.utc()): DateTime {
  return dt.startOf('month');
}

export function endOfMonth(dt: DateTime = DateTime.utc()): DateTime {
  return dt.endOf('month');
}

export function startOfWeek(dt: DateTime = DateTime.utc()): DateTime {
  return dt.startOf('week');
}

export function monthKey(dt: DateTime = DateTime.utc()): string {
  return dt.toFormat('yyyy-MM');
}

export function addDays(dt: DateTime, days: number): DateTime {
  return dt.plus({ days });
}

export function daysBetween(start: DateTime, end: DateTime): number {
  return Math.abs(Interval.fromDateTimes(start, end).length('days'));
}

export function isExpired(dt: DateTime | Date): boolean {
  const target = dt instanceof Date ? DateTime.fromJSDate(dt) : dt;
  return target < DateTime.utc();
}

export function fromJSDate(date: Date): DateTime {
  return DateTime.fromJSDate(date, { zone: 'utc' });
}

export function getPeriodBounds(
  periodType: 'monthly' | 'weekly' | 'custom',
  startDate?: Date,
  endDate?: Date,
): { start: Date; end: Date } {
  const now = DateTime.utc();

  if (periodType === 'monthly') {
    return {
      start: now.startOf('month').toJSDate(),
      end: now.endOf('month').toJSDate(),
    };
  }

  if (periodType === 'weekly') {
    return {
      start: now.startOf('week').toJSDate(),
      end: now.endOf('week').toJSDate(),
    };
  }

  return {
    start: startDate ?? now.startOf('month').toJSDate(),
    end: endDate ?? now.endOf('month').toJSDate(),
  };
}
