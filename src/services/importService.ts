import * as XLSX from 'xlsx'
import type { ImportBatch, ImportCell } from '@/types'

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export async function hashBuffer(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function parseWorkbook(buffer: ArrayBuffer, fileName: string, fileHash: string): ImportBatch {
  const book = XLSX.read(buffer, { type: 'array', cellFormula: true, cellDates: true })
  const cells: ImportCell[] = []
  const exceptions: string[] = []
  for (const sheetName of book.SheetNames) {
    const sheet = book.Sheets[sheetName]
    if (!sheet) continue
    for (const address of Object.keys(sheet)) {
      if (address.startsWith('!')) continue
      const cell = sheet[address] as { v?: unknown; w?: string; f?: string } | undefined
      if (!cell) continue
      const original = cell.v === undefined || cell.v === null ? '' : String(cell.v)
      const formula = cell.f ?? ''
      const displayed = cell.w ?? original
      cells.push({
        file: fileName,
        sheet: sheetName,
        address,
        original,
        formula,
        displayed,
        rowHash: hashString(`${sheetName}|${address}|${original}|${formula}|${displayed}`),
      })
    }
    if (!sheet['A1']) exceptions.push(`${sheetName}: no header in A1`)
  }
  if (!cells.length) exceptions.push('Workbook has no values.')
  return {
    id: `BATCH-${fileHash.slice(0, 10)}`,
    fileName,
    fileHash,
    uploadedAt: new Date().toISOString(),
    cells,
    exceptions,
    posted: false,
  }
}

export function sampleBytes() {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Date', 'Description', 'Currency', 'Amount'],
    ['2026-10-01', 'Sample PD collection', 'KES', 1000],
    ['2026-10-02', 'Sample PD collection', 'USD', 50],
  ])
  sheet['E1'] = { t: 's', v: 'Doubled' }
  sheet['E2'] = { t: 'n', f: 'D2*2', v: 2000 }
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, 'PD sample')
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Note'], ['Demo import. Not a company book.']]), 'Notes')
  return XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

export function workbookSample() {
  const blob = new Blob([sampleBytes()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'balloon-safaris-demo-import.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}
