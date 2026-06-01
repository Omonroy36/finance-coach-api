import type { CursorPage, CursorPayload } from '../types/pagination.types';

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): CursorPayload {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
  } catch {
    throw new Error('Invalid cursor');
  }
}

export function buildCursorPage<T extends { id: string; createdAt: Date }>(
  items: T[],
  limit: number,
): CursorPage<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  const last = data[data.length - 1];

  const nextCursor =
    hasMore && last
      ? encodeCursor({ id: last.id, createdAt: last.createdAt.toISOString() })
      : null;

  return { data, meta: { nextCursor, hasMore, limit } };
}

export function buildCursorWhere(cursor?: string): object {
  if (!cursor) return {};

  const { id, createdAt } = decodeCursor(cursor);
  return {
    OR: [
      { createdAt: { lt: new Date(createdAt) } },
      { createdAt: new Date(createdAt), id: { lt: id } },
    ],
  };
}
