/**
 * Minimal CSV builder + download helper. No dependencies.
 * columns: [{ key, label, value?: (row) => any }]
 */
export function toCsv(rows, columns) {
  const escapeCell = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = columns.map((col) => escapeCell(col.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((col) => escapeCell(col.value ? col.value(row) : row[col.key])).join(',')
  );
  return '\uFEFF' + [header, ...lines].join('\n');
}

export function downloadCsv(fileName, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
