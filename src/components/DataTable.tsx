import { useMemo, useState } from 'react'
import { flexRender, getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState, type VisibilityState } from '@tanstack/react-table'
import { displayCell, formatMoney } from '@/lib/format'
import { moneyLines } from '@/services/query'
import type { LedgerRow, ViewColumn } from '@/types'
import { VerifyBadge } from '@/components/widgets'
import { Button, Pop } from '@/components/ui'
import { exportRows } from '@/lib/export'

export function DataTable({ title, filterSummary, columns, rows, onRow }: { title: string; filterSummary: string; columns: ViewColumn[]; rows: LedgerRow[]; onRow: (row: LedgerRow) => void }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [visibility, setVisibility] = useState<VisibilityState>({})
  const defs = useMemo<ColumnDef<LedgerRow>[]>(() => columns.map((column) => ({
    id: column.key,
    accessorFn: (row) => column.kind === 'verify' ? row.verify : row.values[column.key],
    header: column.header,
    cell: ({ row }) => column.kind === 'verify' ? <VerifyBadge status={row.original.verify} /> : displayCell(row.original, column),
    meta: { align: column.kind === 'money' ? 'right' : 'left' },
  })), [columns])
  const table = useReactTable({
    data: rows,
    columns: defs,
    state: { sorting, columnVisibility: visibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })
  const visible = table.getVisibleLeafColumns().map((column) => columns.find((item) => item.key === column.id)).filter((column): column is ViewColumn => Boolean(column))
  const page = table.getState().pagination
  const from = rows.length === 0 ? 0 : page.pageIndex * page.pageSize + 1
  const to = Math.min(rows.length, (page.pageIndex + 1) * page.pageSize)
  return (
    <section className="rounded-lg border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="text-[13px] text-muted">{rows.length} records · {from}-{to}</p>
        <div className="flex flex-wrap gap-2">
          <Pop.Root>
            <Pop.Trigger asChild><Button>Columns</Button></Pop.Trigger>
            <Pop.Portal>
              <Pop.Content className="z-30 w-56 rounded-lg border border-line bg-white p-2 shadow-card">
                {table.getAllLeafColumns().map((column) => (
                  <label key={column.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-cream">
                    <input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} />
                    {column.columnDef.header as string}
                  </label>
                ))}
              </Pop.Content>
            </Pop.Portal>
          </Pop.Root>
          <Button onClick={() => exportRows('xlsx', title, filterSummary, visible, rows)}>Excel</Button>
          <Button onClick={() => exportRows('pdf', title, filterSummary, visible, rows)}>PDF</Button>
          <Button onClick={() => exportRows('csv', title, filterSummary, visible, rows)}>CSV</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-[13px]">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="sticky top-0 border-b border-line bg-[#F7F3E8] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted">
                    {header.isPlaceholder ? null : (
                      <button type="button" className="inline-flex items-center gap-1" onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? ''}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="cursor-pointer hover:bg-forest-100/40" onClick={() => onRow(row.original)}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={`border-b border-line px-4 py-2.5 ${cell.column.columnDef.meta && (cell.column.columnDef.meta as { align?: string }).align === 'right' ? 'text-right money tabular' : ''}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-4 py-10 text-center text-muted" colSpan={visible.length || 1}>Nothing in this period.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-cream/60 font-medium">
              {visible.map((column, index) => (
                <td key={column.key} className="px-4 py-2.5 align-top text-[12px]">
                  {index === 0 && 'Subtotal'}
                  {column.kind === 'money' && moneyLines(rows, (row) => Number(row.values[column.key] ?? 0)).map((line) => (
                    <div key={line.currency} className="money tabular">{formatMoney(line.amount, line.currency)}</div>
                  ))}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="text-[12.5px] text-muted">Page {page.pageIndex + 1} of {table.getPageCount() || 1}</p>
        <div className="flex gap-2">
          <Button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}>Previous</Button>
          <Button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}>Next</Button>
        </div>
      </div>
    </section>
  )
}
