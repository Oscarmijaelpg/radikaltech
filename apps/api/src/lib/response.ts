export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface OkResponse<T> {
  ok: true;
  data: T;
}

export interface PaginatedResponse<T> {
  ok: true;
  data: T[];
  meta: PageMeta;
}

export function ok<T>(data: T): OkResponse<T> {
  return { ok: true, data };
}

export function paginated<T>(data: T[], meta: PageMeta): PaginatedResponse<T> {
  return { ok: true, data, meta };
}

export function buildPageMeta(page: number, pageSize: number, total: number): PageMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
