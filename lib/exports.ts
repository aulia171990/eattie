'use client'

import * as XLSX from 'xlsx'
import { formatCurrency, formatDateTime } from '@/lib/utils'

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, 15) + 2,
  }))
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportSalesToExcel(sales: Array<{
  invoice_number: string
  created_at: string
  total: number
  payment_method: string
  customer_name?: string | null
  status: string
  cogs?: number | null
  gross_profit?: number | null
}>, filename = 'Laporan_Penjualan') {
  const data = sales.map(s => ({
    'Invoice': s.invoice_number,
    'Tanggal': formatDateTime(s.created_at),
    'Pelanggan': s.customer_name || '-',
    'Total': s.total,
    'Metode Bayar': s.payment_method,
    'Status': s.status,
    'COGS': s.cogs ?? 0,
    'Laba Kotor': s.gross_profit ?? 0,
  }))

  exportToExcel(data, filename)
}

export function exportPLToExcel(pl: {
  period: { from: string; to: string }
  revenue: Array<{ account_code: string; account_name: string; total: number }>
  totalRevenue: number
  cogs: Array<{ account_code: string; account_name: string; total: number }>
  totalCogs: number
  grossProfit: number
  opex: Array<{ account_code: string; account_name: string; total: number }>
  totalOpex: number
  netProfit: number
}) {
  const data: Record<string, unknown>[] = [
    { 'Keterangan': `Laporan Laba Rugi: ${pl.period.from} s/d ${pl.period.to}`, 'Kode': '', 'Nama': '', 'Jumlah': '' },
    { 'Keterangan': '', 'Kode': '', 'Nama': '', 'Jumlah': '' },
    { 'Keterangan': 'REVENUE', 'Kode': '', 'Nama': '', 'Jumlah': '' },
    ...pl.revenue.map(r => ({ 'Keterangan': '', 'Kode': r.account_code, 'Nama': r.account_name, 'Jumlah': r.total })),
    { 'Keterangan': 'Total Revenue', 'Kode': '', 'Nama': '', 'Jumlah': pl.totalRevenue },
    { 'Keterangan': '', 'Kode': '', 'Nama': '', 'Jumlah': '' },
    { 'Keterangan': 'COGS', 'Kode': '', 'Nama': '', 'Jumlah': '' },
    ...pl.cogs.map(c => ({ 'Keterangan': '', 'Kode': c.account_code, 'Nama': c.account_name, 'Jumlah': c.total })),
    { 'Keterangan': 'Total COGS', 'Kode': '', 'Nama': '', 'Jumlah': pl.totalCogs },
    { 'Keterangan': 'Gross Profit', 'Kode': '', 'Nama': '', 'Jumlah': pl.grossProfit },
    { 'Keterangan': '', 'Kode': '', 'Nama': '', 'Jumlah': '' },
    { 'Keterangan': 'EXPENSES', 'Kode': '', 'Nama': '', 'Jumlah': '' },
    ...pl.opex.map(o => ({ 'Keterangan': '', 'Kode': o.account_code, 'Nama': o.account_name, 'Jumlah': o.total })),
    { 'Keterangan': 'Total Expenses', 'Kode': '', 'Nama': '', 'Jumlah': pl.totalOpex },
    { 'Keterangan': '', 'Kode': '', 'Nama': '', 'Jumlah': '' },
    { 'Keterangan': 'NET PROFIT', 'Kode': '', 'Nama': '', 'Jumlah': pl.netProfit },
  ]

  exportToExcel(data, `Laba_Rugi_${pl.period.from}_${pl.period.to}`, 'Laba Rugi')
}

export function exportBSToExcel(bs: {
  asOfDate: string
  assets: Array<{ account_code: string; account_name: string; balance: number }>
  totalAssets: number
  liabilities: Array<{ account_code: string; account_name: string; balance: number }>
  totalLiabilities: number
  equity: Array<{ account_code: string; account_name: string; balance: number }>
  totalEquity: number
}) {
  const data: Record<string, unknown>[] = [
    { 'Kode': '', 'Nama Aset': 'ASET', 'Saldo': '', 'Nama Kewajiban': 'KEWAJIBAN', 'Saldo Kewajiban': '', 'Nama Ekuitas': 'EKUITAS', 'Saldo Ekuitas': '' },
    ...Array.from({ length: Math.max(bs.assets.length, bs.liabilities.length, bs.equity.length) }).map((_, i) => ({
      'Kode': bs.assets[i]?.account_code || '',
      'Nama Aset': bs.assets[i]?.account_name || '',
      'Saldo': bs.assets[i]?.balance || '',
      'Nama Kewajiban': bs.liabilities[i]?.account_name || '',
      'Saldo Kewajiban': bs.liabilities[i]?.balance || '',
      'Nama Ekuitas': bs.equity[i]?.account_name || '',
      'Saldo Ekuitas': bs.equity[i]?.balance || '',
    })),
    { 'Kode': '', 'Nama Aset': 'TOTAL ASET', 'Saldo': bs.totalAssets, 'Nama Kewajiban': 'TOTAL KEWAJIBAN', 'Saldo Kewajiban': bs.totalLiabilities, 'Nama Ekuitas': 'TOTAL EKUITAS', 'Saldo Ekuitas': bs.totalEquity },
  ]

  exportToExcel(data, `Neraca_${bs.asOfDate}`, 'Neraca')
}
