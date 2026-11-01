import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import type { LedgerRow, ViewColumn } from '@/types'
import { displayCell, formatMoney } from '@/lib/format'
import { moneyLines } from '@/services/query'

export function exportRows(kind: 'xlsx' | 'pdf' | 'csv', title: string, filterSummary: string, columns: ViewColumn[], rows: LedgerRow[]) {
  const headers = columns.map((column) => column.header)
  const body = rows.map((row) => columns.map((column) => displayCell(row, column)))
  const totals = moneyLines(rows, (row) => row.amount).map((line) => formatMoney(line.amount, line.currency)).join(' · ') || 'No included amounts'
  const stamp = `DEMO DATA — not an audited balance. Records: ${rows.length}. Primary total: ${totals}. ${filterSummary}`
  if (kind === 'csv') {
    const lines = [[stamp], headers, ...body].map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    download(`${slug(title)}.csv`, new Blob([lines.join('\n')], { type: 'text/csv' }))
    return
  }
  if (kind === 'xlsx') {
    const sheet = XLSX.utils.aoa_to_sheet([[title], [stamp], [], headers, ...body])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Register')
    XLSX.writeFile(book, `${slug(title)}.xlsx`)
    return
  }
  const doc = new jsPDF({ orientation: columns.length > 7 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
  doc.setFontSize(14)
  doc.text(title, 40, 40)
  doc.setFontSize(9)
  doc.text(doc.splitTextToSize(stamp, 520), 40, 58)
  autoTable(doc, { startY: 92, head: [headers], body, styles: { fontSize: 8 }, headStyles: { fillColor: [11, 61, 46] } })
  doc.save(`${slug(title)}.pdf`)
}

export function exportMatrix(title: string, filterSummary: string, headers: string[], body: (string | number)[][], kind: 'xlsx' | 'pdf') {
  const stamp = `DEMO DATA — not an audited balance. Live rows: ${body.length}. Design samples excluded. ${filterSummary}`
  if (kind === 'xlsx') {
    const sheet = XLSX.utils.aoa_to_sheet([[title], [stamp], [], headers, ...body])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Creditors')
    XLSX.writeFile(book, `${slug(title)}.xlsx`)
    return
  }
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' })
  doc.setFontSize(14)
  doc.text(title, 32, 36)
  doc.setFontSize(9)
  doc.text(doc.splitTextToSize(stamp, 760), 32, 54)
  autoTable(doc, { startY: 84, head: [headers], body, styles: { fontSize: 7 }, headStyles: { fillColor: [11, 61, 46] } })
  doc.save(`${slug(title)}.pdf`)
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
