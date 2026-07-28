// Tiny CSV helper — build a CSV string and trigger a download in the browser.

const esc = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// rows: array of objects. columns: [{ key, label }]
export function toCSV(rows, columns) {
  const header = columns.map((c) => esc(c.label)).join(',')
  const body = rows
    .map((r) => columns.map((c) => esc(typeof c.get === 'function' ? c.get(r) : r[c.key])).join(','))
    .join('\n')
  return header + '\n' + body
}

export function downloadCSV(filename, csv) {
  // Prepend BOM so Excel opens € and accents correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
