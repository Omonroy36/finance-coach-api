export interface CursorPage<T> {
  data: T[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export interface OffsetPage<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CursorParams {
  cursor?: string;
  limit?: number;
}

export interface CursorPayload {
  id: string;
  createdAt: string;
}
