function escape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function toCsv<T extends object>(rows: T[], columns: Array<{ key: keyof T | string; label: string; get?: (row: T) => unknown }>): string {
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.get ? c.get(row) : (row as Record<string, unknown>)[c.key as string];
        return escape(raw);
      })
      .join(','),
  );
  return [header, ...body].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
