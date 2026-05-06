'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { useImports } from '@/hooks/useImports'
import { useTransactions } from '@/hooks/useTransactions'
import { txnFingerprint } from '@/lib/txnFingerprint'
import { PendingTransaction, DEFAULT_CATEGORIES } from '@/types'
import { formatINR } from '@/lib/format'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import CategoryIcon from '@/components/CategoryIcon'
import { toast } from 'sonner'
import {
  Upload, CheckCircle2, XCircle, CheckCheck,
  Pencil, ChevronDown, ChevronUp, FileSpreadsheet, X,
} from 'lucide-react'

// ─── XLSX parsing ─────────────────────────────────────────────────────────────

function tagToCategory(tag: string): string {
  const t = tag.toLowerCase()
  if (t.includes('groceries')) return 'groceries'
  if (t.includes('financial') || t.includes('services')) return 'financial'
  if (t.includes('bill')) return 'bills'
  if (t.includes('taxi') || t.includes('rapido') || t.includes('ola') || t.includes('uber')) return 'taxi'
  if (t.includes('money transfer') || t.includes('money sent')) return 'transfer'
  if (t.includes('money received')) return 'received'
  if (t.includes('shopping')) return 'shopping'
  if (t.includes('food') || t.includes('restaurant') || t.includes('swiggy') || t.includes('zomato')) return 'food'
  if (t.includes('investment') || t.includes('mutual')) return 'investment'
  if (t.includes('medical') || t.includes('health') || t.includes('pharma')) return 'medical'
  if (t.includes('rent') || t.includes('housing')) return 'rent'
  if (t.includes('travel') || t.includes('flight') || t.includes('hotel')) return 'travel'
  return 'miscellaneous'
}

function parseDate(s: string): Date {
  const [d, m, y] = s.split('/')
  return new Date(+y, +m - 1, +d)
}

function parseAmount(s: string): number {
  return Math.abs(parseFloat(String(s).replace(/,/g, '')))
}

type ParsedRow = Omit<PendingTransaction, 'id' | 'sessionId' | 'importedAt'>

async function parseXLSX(file: File): Promise<ParsedRow[]> {
  const XLSXModule = await import('xlsx')
  const XLSX = (XLSXModule.default ?? XLSXModule) as typeof import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })

  // Try sheet index 1 (Passbook), fall back to first sheet
  const sheetName = wb.SheetNames[1] ?? wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })

  // Find header row (contains "Date" and "Amount")
  const headerIdx = rows.findIndex(r => r.some(c => String(c).toLowerCase() === 'date'))
  if (headerIdx === -1) throw new Error('Could not find header row in sheet')

  const headers = rows[headerIdx].map(h => String(h).toLowerCase().trim())
  const col = (name: string) => headers.findIndex(h => h.includes(name))

  const iDate = col('date')
  const iDesc = col('transaction details')
  const iUPI  = col('other transaction')
  const iAmt  = col('amount')
  const iTags = col('tags')
  const iRemarks = col('remarks')

  const parsed: ParsedRow[] = []

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i]
    const dateStr = String(r[iDate] ?? '').trim()
    const amtStr  = String(r[iAmt]  ?? '').trim()
    if (!dateStr || !amtStr || amtStr === '0') continue

    const rawAmt = String(r[iAmt]).replace(/,/g, '')
    const amountNum = parseFloat(rawAmt)
    if (isNaN(amountNum)) continue

    const tag    = String(r[iTags]    ?? '').replace(/^#/, '').trim()
    const desc   = String(r[iDesc]    ?? '').trim()
    const upiRef = String(r[col('upi ref')] ?? r[6] ?? '').trim()
    const remarks = String(r[iRemarks] ?? '').trim()

    parsed.push({
      amount: Math.abs(amountNum),
      description: desc || 'Unknown',
      category: tagToCategory(tag),
      paymentMethod: 'UPI',
      tags: [],
      notes: remarks,
      date: parseDate(dateStr),
      upiRef,
    })
  }

  return parsed
}

// ─── Components ───────────────────────────────────────────────────────────────

const PAYMENT_METHODS = ['UPI', 'Cash', 'Card', 'Other'] as const

function EditModal({
  txn, onSave, onClose,
}: { txn: PendingTransaction; onSave: (u: Partial<PendingTransaction>) => Promise<void>; onClose: () => void }) {
  const [amount, setAmount]   = useState(String(txn.amount))
  const [desc, setDesc]       = useState(txn.description)
  const [category, setCat]    = useState(txn.category)
  const [method, setMethod]   = useState(txn.paymentMethod)
  const [notes, setNotes]     = useState(txn.notes)
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    const a = parseFloat(amount)
    if (!a || a <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    try { await onSave({ amount: a, description: desc, category, paymentMethod: method, notes }) }
    finally { setSaving(false) }
  }

  const inputCls = "w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="rounded-2xl max-w-[380px] mx-auto">
        <DialogHeader><DialogTitle className="text-base font-bold text-slate-900">Edit Transaction</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Amount</p>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputCls} pl-7`} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Description</p>
            <input value={desc} onChange={e => setDesc(e.target.value)} className={inputCls} />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Category</p>
            <div className="grid grid-cols-4 gap-1.5">
              {DEFAULT_CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => setCat(cat.id)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-95 ${category === cat.id ? 'bg-indigo-600' : 'bg-slate-50'}`}
                  style={category === cat.id ? {} : { color: cat.color }}>
                  <CategoryIcon id={cat.id} size={15} className={category === cat.id ? 'text-white' : undefined} />
                  <span className={`text-[9px] font-medium text-center leading-tight ${category === cat.id ? 'text-white' : 'text-slate-500'}`}>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</p>
            <div className="flex gap-2 flex-wrap">
              {PAYMENT_METHODS.map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${method === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Notes</p>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" className={inputCls} />
          </div>
        </div>
        <div className="flex gap-2 pt-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const { sessions, pending, loading, importTransactions, updatePending, approveTransaction, approveAll, rejectTransaction, rejectAll } = useImports()
  const { transactions } = useTransactions()

  // Build set of existing fingerprints from pending + approved transactions
  // pending doc IDs and approved transaction doc IDs are both fingerprints
  const existingFingerprints = useMemo(() => {
    const fp = new Set<string>()
    // pending doc IDs are fingerprints (set by useImports)
    pending.forEach(t => fp.add(t.id))
    // approved transaction doc IDs are fingerprints; also compute from upiRef as fallback
    transactions.forEach(t => {
      fp.add(t.id)
      fp.add(txnFingerprint({ upiRef: t.upiRef, date: t.date, amount: t.amount, description: t.description }))
    })
    return fp
  }, [pending, transactions])

  // Upload / preview state
  const [preview, setPreview]         = useState<ParsedRow[] | null>(null)
  const [previewFile, setPreviewFile] = useState<string>('')
  const [parsing, setParsing]         = useState(false)
  const [importing, setImporting]     = useState(false)
  const [dragging, setDragging]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Review state
  const [editTxn, setEditTxn]         = useState<PendingTransaction | null>(null)
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [approvingAll, setApprovingAll] = useState<string | null>(null)
  const [confirmSessionId, setConfirmSessionId] = useState<string | null>(null)

  // ── Parse uploaded file ──
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) { toast.error('Please upload an .xlsx or .xls file'); return }
    setParsing(true)
    try {
      const rows = await parseXLSX(file)
      if (!rows.length) { toast.error('No transactions found in file'); return }
      const unique = rows.filter(r => !existingFingerprints.has(txnFingerprint(r)))
      const dupeCount = rows.length - unique.length
      if (!unique.length) {
        toast.error('All transactions in this file already exist — nothing new to import')
        return
      }
      if (dupeCount > 0) toast.info(`${dupeCount} duplicate${dupeCount > 1 ? 's' : ''} skipped`)
      setPreview(unique)
      setPreviewFile(file.name)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to parse file')
    } finally {
      setParsing(false)
    }
  }, [existingFingerprints])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  // ── Store preview to Firestore ──
  const handleImport = async () => {
    if (!preview) return
    setImporting(true)
    try {
      await importTransactions(previewFile, preview)
      toast.success(`${preview.length} transactions imported for review`)
      setPreview(null)
      setPreviewFile('')
    } catch (e) {
      console.error('Failed to import transactions:', e)
      toast.error('Failed to import')
    } finally {
      setImporting(false)
    }
  }

  // ── Approve all in a session ──
  const handleApproveAll = async (sessionId: string) => {
    setConfirmSessionId(sessionId)
  }

  const confirmApproveAll = async () => {
    if (!confirmSessionId) return
    const sessionId = confirmSessionId
    setConfirmSessionId(null)
    setApprovingAll(sessionId)
    try {
      await approveAll(sessionId)
      toast.success('All transactions approved')
    } catch (e) {
      console.error('Failed to approve all transactions:', e)
      toast.error('Failed to approve all')
    } finally {
      setApprovingAll(null)
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const cat = (id: string) => DEFAULT_CATEGORIES.find(c => c.id === id) ?? DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]

  return (
    <div className="space-y-5 pt-4 pb-2">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">Import</h1>

      {/* ── Upload zone ── */}
      {!preview && (
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2 px-1">Upload File</p>
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
              dragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
            }`}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            {parsing ? (
              <span className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <FileSpreadsheet size={28} className="text-indigo-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900">Drop your Excel file here</p>
                  <p className="text-xs text-slate-400 mt-1">or tap to browse · .xlsx, .xls</p>
                </div>
                <p className="text-[10px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  Supports Paytm UPI Statement (Sheet 2)
                </p>
              </>
            )}
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          </div>
        </div>
      )}

      {/* ── Preview table ── */}
      {preview && (
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              Preview — {previewFile}
            </p>
            <button onClick={() => { setPreview(null); setPreviewFile('') }} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          {/* Summary bar */}
          <div className="bg-white rounded-2xl p-4 mb-3 flex items-center justify-between" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div>
              <p className="text-sm font-bold text-slate-900">{preview.length} transactions found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Total: {formatINR(preview.reduce((s, r) => s + r.amount, 0))}
              </p>
            </div>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-indigo-200"
            >
              {importing ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Upload size={15} />}
              {importing ? 'Importing…' : 'Import for Review'}
            </button>
          </div>

          {/* Preview rows */}
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-slate-50" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {preview.map((row) => {
              const c = cat(row.category)
              return (
                <div key={`${row.date.getTime()}-${row.description}-${row.amount}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: c.color + '20', color: c.color }}>
                    <CategoryIcon id={c.id} size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{row.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {row.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {c.name}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0">{formatINR(row.amount)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Review section ── */}
      {!preview && (
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2 px-1">
            Pending Review {pending.length > 0 && `(${pending.length})`}
          </p>

          {loading ? (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <FileSpreadsheet size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500">No imports yet</p>
              <p className="text-xs text-slate-400 mt-1">Upload an Excel file above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => {
                const sessionPending = pending.filter(p => p.sessionId === session.id)
                const isExpanded = expanded.has(session.id)
                const allApproved = sessionPending.length === 0

                return (
                  <div key={session.id} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    {/* Session header */}
                    <div
                      className="flex items-center gap-3 w-full px-4 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(session.id)}
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${allApproved ? 'bg-green-50' : 'bg-indigo-50'}`}>
                        <FileSpreadsheet size={17} className={allApproved ? 'text-green-500' : 'text-indigo-500'} />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{session.filename}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {session.importedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}
                          {allApproved
                            ? <span className="text-green-600 font-medium">All approved ✓</span>
                            : <span>{sessionPending.length} pending · {session.approvedCount} approved</span>
                          }
                        </p>
                      </div>
                      {!allApproved && (
                        <button
                          onClick={e => { e.stopPropagation(); handleApproveAll(session.id) }}
                          disabled={approvingAll === session.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 active:scale-95 transition-all disabled:opacity-60 mr-1 flex-shrink-0"
                        >
                          {approvingAll === session.id
                            ? <span className="w-3.5 h-3.5 rounded-full border-2 border-green-300 border-t-green-700 animate-spin" />
                            : <CheckCheck size={13} />}
                          Approve All
                        </button>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
                    </div>

                    {/* Pending transactions */}
                    {isExpanded && sessionPending.length > 0 && (
                      <div className="border-t border-slate-50 divide-y divide-slate-50">
                        {sessionPending.map(txn => {
                          const c = cat(txn.category)
                          return (
                            <div key={txn.id} className="flex items-center gap-3 px-4 py-3.5">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: c.color + '20', color: c.color }}>
                                <CategoryIcon id={c.id} size={17} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{txn.description}</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {txn.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {' · '}{c.name}{' · '}{txn.paymentMethod}
                                </p>
                                {txn.upiRef && (
                                  <p className="text-[10px] text-slate-300 mt-0.5 font-mono truncate">{txn.upiRef}</p>
                                )}
                              </div>
                              <p className="text-sm font-bold text-slate-900 tabular-nums flex-shrink-0 mr-2">
                                {formatINR(txn.amount)}
                              </p>
                              {/* Actions */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => setEditTxn(txn)}
                                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-95"
                                  title="Edit"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={async () => {
                                    try { await approveTransaction(txn); toast.success('Approved') }
                                    catch (e) { console.error('Failed to approve:', e); toast.error('Failed') }
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors active:scale-95"
                                  title="Approve"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button
                                  onClick={async () => {
                                    try { await rejectTransaction(txn.id); toast.success('Removed') }
                                    catch (e) { console.error('Failed to reject:', e); toast.error('Failed') }
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95"
                                  title="Reject"
                                >
                                  <XCircle size={16} />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {isExpanded && allApproved && (
                      <div className="border-t border-slate-50 px-4 py-5 text-center">
                        <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-600">All {session.totalCount} transactions approved</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Approve All confirm dialog */}
      {confirmSessionId && (() => {
        const count = pending.filter(p => p.sessionId === confirmSessionId).length
        const session = sessions.find(s => s.id === confirmSessionId)
        return (
          <Dialog open onOpenChange={() => setConfirmSessionId(null)}>
            <DialogContent className="rounded-2xl max-w-[340px] mx-auto">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900">Approve All?</DialogTitle>
              </DialogHeader>
              <div className="mt-1 space-y-3">
                <p className="text-sm text-slate-500">
                  This will move <span className="font-semibold text-slate-900">{count} transactions</span> from{' '}
                  <span className="font-semibold text-slate-900">{session?.filename}</span> to your main expense list.
                </p>
                <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => setConfirmSessionId(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmApproveAll}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 active:scale-[0.98] transition-all"
                >
                  Approve All
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      {/* Edit modal */}
      {editTxn && (
        <EditModal
          txn={editTxn}
          onSave={async updates => { await updatePending(editTxn.id, updates); setEditTxn(null); toast.success('Updated') }}
          onClose={() => setEditTxn(null)}
        />
      )}
    </div>
  )
}
