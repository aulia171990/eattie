'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { FileText, AlertCircle, CheckCircle } from 'lucide-react'

// ponytail: generated types don't include audit_logs. Remove cast after `supabase gen types`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface AuditLogEntry {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: unknown
  new_data: unknown
  changed_by: string | null
  created_at: string
}

export function AuditTrail() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTable, setFilterTable] = useState<string>('')
  const [filterAction, setFilterAction] = useState<string>('')
  const [dateRange, setDateRange] = useState({ from: '', to: '' })
  const supabase = createClient() as AnySupabase

  const loadAuditLogs = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('id, table_name, record_id, action, old_data, new_data, changed_by, created_at')
        .order('created_at', { ascending: false })

      if (filterTable) {
        query = query.eq('table_name', filterTable)
      }
      if (filterAction) {
        query = query.eq('action', filterAction)
      }
      if (dateRange.from) {
        query = query.gte('created_at', `${dateRange.from}T00:00:00`)
      }
      if (dateRange.to) {
        query = query.lte('created_at', `${dateRange.to}T23:59:59`)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching audit logs:', error)
        return
      }

      setLogs(data || [])
    } finally {
      setLoading(false)
    }
  }, [supabase, filterTable, filterAction, dateRange])

  useEffect(() => {
    void loadAuditLogs()
  }, [loadAuditLogs])

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT': return <CheckCircle size={16} className="text-green-600" />
      case 'UPDATE': return <FileText size={16} className="text-blue-600" />
      case 'DELETE': return <AlertCircle size={16} className="text-red-600" />
      default: return <FileText size={16} />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-50 border-green-200'
      case 'UPDATE': return 'bg-blue-50 border-blue-200'
      case 'DELETE': return 'bg-red-50 border-red-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const tableTypes = Array.from(new Set(logs.map(l => l.table_name)))

  const renderChanges = (log: AuditLogEntry) => {
    if (log.action === 'INSERT' && log.new_data && typeof log.new_data === 'object') {
      return (
        <div className="text-xs">
          <div className="font-medium mb-1">New Values:</div>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-20">
            {JSON.stringify(log.new_data, null, 2).substring(0, 200)}
          </pre>
        </div>
      )
    }

    if (log.action === 'UPDATE' && log.old_data && log.new_data && typeof log.new_data === 'object') {
      const oldData = log.old_data as Record<string, unknown>
      const newData = log.new_data as Record<string, unknown>
      return (
        <div className="text-xs">
          <div className="font-medium mb-1">Changes:</div>
          <div className="space-y-1">
            {Object.keys(newData).map(key => {
              const oldVal = oldData[key]
              const newVal = newData[key]
              if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                return (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-orange-600 font-mono text-xs">•</span>
                    <span className="font-medium">{key}:</span>
                    <span className="text-gray-600">
                      from {JSON.stringify(oldVal).substring(0, 50)} to {JSON.stringify(newVal).substring(0, 50)}
                    </span>
                  </div>
                )
              }
              return null
            })}
          </div>
        </div>
      )
    }

    if (log.action === 'DELETE' && log.old_data && typeof log.old_data === 'object') {
      return (
        <div className="text-xs">
          <div className="font-medium mb-1">Deleted Values:</div>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-20">
            {JSON.stringify(log.old_data, null, 2).substring(0, 200)}
          </pre>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'hsl(var(--border))' }}>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileText size={20} /> Audit Trail
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Table</label>
            <select value={filterTable} onChange={e => setFilterTable(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'hsl(var(--border))' }}>
              <option value="">All Tables</option>
              {tableTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>Action</label>
            <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'hsl(var(--border))' }}>
              <option value="">All Actions</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>From Date</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--text-muted))' }}>To Date</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm" style={{ borderColor: 'hsl(var(--border))' }} />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setDateRange({ from: '', to: '' })}
            className="px-3 py-1 text-sm rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>Clear Filters</button>
          <button onClick={loadAuditLogs}
            className="px-3 py-1 text-sm rounded-lg text-white" style={{ background: 'hsl(var(--primary))' }}>Apply Filters</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>Total Events</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
            <FileText size={24} style={{ color: 'hsl(var(--info))' }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>INSERTs</p>
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--success))' }}>{logs.filter(l => l.action === 'INSERT').length}</p>
            </div>
            <CheckCircle size={24} style={{ color: 'hsl(var(--success))' }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>UPDATEs</p>
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--info))' }}>{logs.filter(l => l.action === 'UPDATE').length}</p>
            </div>
            <FileText size={24} style={{ color: 'hsl(var(--info))' }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium" style={{ color: 'hsl(var(--text-muted))' }}>DELETEs</p>
              <p className="text-2xl font-bold" style={{ color: 'hsl(var(--danger))' }}>{logs.filter(l => l.action === 'DELETE').length}</p>
            </div>
            <AlertCircle size={24} style={{ color: 'hsl(var(--danger))' }} />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--surface-raised))' }}>
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Table</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Record ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Changed By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-muted))' }}>Changes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'hsl(var(--text-muted))' }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'hsl(var(--text-muted))' }}>No audit logs found</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="border-t hover:bg-gray-50/50" style={{ borderColor: 'hsl(var(--border))' }}>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-secondary))' }}>{formatDateTime(log.created_at)}</td>
                  <td className="px-4 py-3 text-sm font-medium">{log.table_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: 'hsl(var(--text-muted))' }}>{log.record_id.substring(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm">{log.changed_by ? 'User' + log.changed_by.substring(0, 4) : 'System'}</td>
                  <td className="px-4 py-3">{renderChanges(log)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
