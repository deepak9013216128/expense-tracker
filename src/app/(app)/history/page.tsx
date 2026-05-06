'use client'

import { useState, useMemo, useRef, KeyboardEvent } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { Transaction } from '@/types'
import { formatCompactINR, formatINR, getDateLabel, toLocalDateString } from '@/lib/format'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { AlertTriangle, CalendarDays, Pencil, Search, Trash2, X } from 'lucide-react'
import CategoryIcon from '@/components/CategoryIcon'
import { DEFAULT_CATEGORIES } from '@/types'

const PAGE_SIZE = 20

function monthStart() {
  const now = new Date()
  return toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1))
}


export default function HistoryPage() {
  const { transactions, updateTransaction, archiveTransaction } = useTransactions()
  const { categories } = useCategories()
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterMethod, setFilterMethod] = useState<string | null>(null)
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(() => toLocalDateString(new Date()))
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const min = minAmount ? parseFloat(minAmount) : null
    const max = maxAmount ? parseFloat(maxAmount) : null
    const start = startDate ? new Date(startDate + 'T00:00:00') : null
    const end = endDate ? new Date(endDate + 'T23:59:59') : null
    return transactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(search.toLowerCase())
      const matchCat = filterCategory ? t.category === filterCategory : true
      const matchMethod = filterMethod ? t.paymentMethod === filterMethod : true
      const matchMin = min !== null ? t.amount >= min : true
      const matchMax = max !== null ? t.amount <= max : true
      const matchStart = start ? t.date >= start : true
      const matchEnd = end ? t.date <= end : true
      return matchSearch && matchCat && matchMethod && matchMin && matchMax && matchStart && matchEnd
    })
  }, [transactions, search, filterCategory, filterMethod, minAmount, maxAmount, startDate, endDate])

  const filteredTotal = useMemo(() => filtered.reduce((sum, txn) => sum + txn.amount, 0), [filtered])

  const selectedCategoryName = filterCategory
    ? categories.find(c => c.id === filterCategory)?.name || DEFAULT_CATEGORIES.find(c => c.id === filterCategory)?.name
    : null

  const activeFilterCount = [
    search,
    filterCategory,
    filterMethod,
    minAmount,
    maxAmount,
    startDate,
    endDate,
  ].filter(Boolean).length

  const paginated = filtered.slice(0, page * PAGE_SIZE)

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    paginated.forEach(txn => {
      const label = getDateLabel(txn.date)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(txn)
    })
    return Array.from(map.entries())
  }, [paginated])

  const handleArchive = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await archiveTransaction(confirmDelete.id)
      toast.success('Moved to archive')
      setConfirmDelete(null)
      setSelected(null)
    } catch (e) {
      console.error('Failed to archive transaction:', e)
      toast.error('Failed to archive')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4 pt-4 pb-2">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">History</h1>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Search transactions..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 transition-all border-0"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1) }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex gap-2 w-max">
          <button
            onClick={() => { setFilterCategory(null); setPage(1) }}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 ${
              !filterCategory
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All
          </button>
          {DEFAULT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setFilterCategory(filterCategory === cat.id ? null : cat.id); setPage(1) }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 ${
                filterCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              <CategoryIcon id={cat.id} size={13} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Payment method filters */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex gap-2 w-max">
          {(['UPI', 'Cash', 'Card', 'Other'] as const).map(method => (
            <button
              key={method}
              onClick={() => { setFilterMethod(filterMethod === method ? null : method); setPage(1) }}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 ${
                filterMethod === method
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Amount range filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
          <input
            type="number"
            placeholder="Min"
            value={minAmount}
            onChange={e => { setMinAmount(e.target.value); setPage(1) }}
            className="w-full pl-7 pr-3 py-2.5 bg-white rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border-0 tabular-nums"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          />
        </div>
        <span className="text-slate-400 text-sm flex-shrink-0">—</span>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
          <input
            type="number"
            placeholder="Max"
            value={maxAmount}
            onChange={e => { setMaxAmount(e.target.value); setPage(1) }}
            className="w-full pl-7 pr-3 py-2.5 bg-white rounded-xl text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 border-0 tabular-nums"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          />
        </div>
        {(minAmount || maxAmount) && (
          <button
            onClick={() => { setMinAmount(''); setMaxAmount(''); setPage(1) }}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-slate-600 transition-colors"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-2xl p-3" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays size={15} className="text-slate-400" />
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Date range</p>
          </div>
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}
              className="flex-shrink-0 text-xs font-medium text-indigo-600"
            >
              All time
            </button>
          )}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <input
            type="date"
            value={startDate}
            max={endDate || toLocalDateString(new Date())}
            onChange={e => { setStartDate(e.target.value); setPage(1) }}
            className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-slate-300">—</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            max={toLocalDateString(new Date())}
            onChange={e => { setEndDate(e.target.value); setPage(1) }}
            className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Filter summary */}
      <div className="grid grid-cols-[1fr_auto] items-stretch gap-2 rounded-2xl bg-white p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            {startDate || endDate ? 'Selected range total' : 'All time total'}
          </p>
          <p className="mt-1 truncate text-2xl font-bold leading-tight text-slate-900 tabular-nums" title={formatINR(filteredTotal)}>
            {formatCompactINR(filteredTotal)}
          </p>
          <p className="mt-1 truncate text-xs text-slate-400">
            {selectedCategoryName ? `${selectedCategoryName} · ` : ''}
            {filterMethod ? `${filterMethod} · ` : ''}
            {filtered.length} transaction{filtered.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex min-w-[76px] flex-col items-end justify-center rounded-xl bg-indigo-50 px-3">
          <span className="text-2xl font-bold text-indigo-600 tabular-nums">{activeFilterCount}</span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-indigo-400">Filters</span>
        </div>
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-slate-500 text-sm font-medium">No transactions found</p>
          <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([label, txns]) => (
            <div key={label}>
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
                  {label}
                </span>
                <span className="text-[10px] text-slate-400 font-medium tabular-nums">
                  {formatINR(txns.reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              <div
                className="bg-white rounded-2xl divide-y divide-slate-50 overflow-hidden"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
              >
                {txns.map(txn => {
                  const cat = categories.find(c => c.id === txn.category) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
                  return (
                    <button
                      key={txn.id}
                      className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-slate-50 transition-colors active:bg-slate-100"
                      onClick={() => { setSelected(txn); setEditing(false) }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: (cat.color || '#6b7280') + '20', color: cat.color || '#6b7280' }}
                      >
                        <CategoryIcon id={cat.id} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{txn.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{txn.paymentMethod} · {cat.name}</p>
                        {txn.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {txn.tags.map(tag => (
                              <span key={tag} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 text-sm flex-shrink-0 tabular-nums">
                        {formatINR(txn.amount)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {paginated.length < filtered.length && (
        <button
          className="w-full py-3 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all"
          onClick={() => setPage(p => p + 1)}
        >
          Load more ({filtered.length - paginated.length} remaining)
        </button>
      )}

      {/* Detail / Edit dialog */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) { setSelected(null); setEditing(false) } }}>
        <DialogContent className="rounded-2xl max-w-[380px] mx-auto">
          {selected && (
            editing ? (
              <EditForm
                txn={selected}
                onSave={async updates => {
                  await updateTransaction(selected.id, updates)
                  toast.success('Updated')
                  setSelected(null)
                  setEditing(false)
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                    {selected.description}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-0 text-sm mt-1">
                  {([
                    ['Amount', formatINR(selected.amount)],
                    ['Category', DEFAULT_CATEGORIES.find(c => c.id === selected.category)?.name || selected.category],
                    ['Payment', selected.paymentMethod],
                    ['Date', getDateLabel(selected.date)],
                    ...(selected.notes ? [['Notes', selected.notes]] : []),
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-50">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium text-slate-900 text-right max-w-[60%]">{value}</span>
                    </div>
                  ))}
                  {selected.tags.length > 0 && (
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-slate-500">Tags</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {selected.tags.map(tag => (
                          <span key={tag} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 active:scale-[0.98] transition-all"
                    onClick={() => { setConfirmDelete(selected); setSelected(null) }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={open => { if (!open && !deleting) setConfirmDelete(null) }}>
        <DialogContent className="rounded-2xl max-w-[340px] mx-auto">
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Archive this expense?</h3>
              <p className="text-sm text-slate-500 mt-1">
                &ldquo;{confirmDelete?.description}&rdquo; will be moved to archive. You can recover it anytime from Settings.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-1">
              <button
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-60"
                onClick={handleArchive}
                disabled={deleting}
              >
                {deleting ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <><Trash2 size={14} /> Archive</>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditForm({
  txn,
  onSave,
  onCancel,
}: {
  txn: Transaction
  onSave: (updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<void>
  onCancel: () => void
}) {
  const [amount, setAmount] = useState(String(txn.amount))
  const [description, setDescription] = useState(txn.description)
  const [category, setCategory] = useState(txn.category)
  const [paymentMethod, setPaymentMethod] = useState(txn.paymentMethod)
  const [notes, setNotes] = useState(txn.notes)
  const [date, setDate] = useState(toLocalDateString(txn.date))
  const [tags, setTags] = useState<string[]>(txn.tags)
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const addTag = (raw: string) => {
    const normalized = raw.trim().toLowerCase()
    if (normalized && !tags.includes(normalized)) setTags(prev => [...prev, normalized])
    setTagInput('')
  }

  const handleSave = async () => {
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) { toast.error('Enter a valid amount'); return }
    if (!description.trim()) { toast.error('Enter a description'); return }
    setLoading(true)
    try {
      await onSave({
        amount: numAmount,
        description: description.trim(),
        category,
        paymentMethod,
        notes,
        date: new Date(date + 'T00:00:00'),
        tags,
      })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-300 transition-all"

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-slate-900">Edit Expense</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 mt-2 max-h-[65vh] overflow-y-auto pr-1">
        {/* Amount */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Amount</p>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">₹</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputClass} pl-7`} />
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Description</p>
          <input value={description} onChange={e => setDescription(e.target.value)} className={inputClass} />
        </div>

        {/* Date */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Date</p>
          <input
            type="date"
            value={date}
            max={toLocalDateString(new Date())}
            onChange={e => setDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Category */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Category</p>
          <div className="grid grid-cols-4 gap-2">
            {DEFAULT_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-all active:scale-95 ${
                  category === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'
                }`}
              >
                <CategoryIcon id={cat.id} size={16} className={category === cat.id ? 'text-white' : 'text-slate-500'} />
                <span className={`text-[9px] font-medium truncate w-full text-center ${category === cat.id ? 'text-white' : 'text-slate-500'}`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</p>
          <div className="flex gap-2 flex-wrap">
            {(['UPI', 'Cash', 'Card', 'Other'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                  paymentMethod === m
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Tags</p>
          <div
            className="flex flex-wrap gap-1.5 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all cursor-text min-h-[44px]"
            onClick={() => tagInputRef.current?.focus()}
          >
            {tags.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-lg">
                #{tag}
                <button type="button" onClick={e => { e.stopPropagation(); setTags(tags.filter(t => t !== tag)) }} className="text-indigo-400 hover:text-indigo-600">
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              placeholder={tags.length === 0 ? 'Add tags…' : ''}
              value={tagInput}
              onChange={e => setTagInput(e.target.value.replace(/\s/g, ''))}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if ((e.key === 'Enter' || e.key === ' ') && tagInput.trim()) { e.preventDefault(); addTag(tagInput) }
                else if (e.key === 'Backspace' && !tagInput && tags.length > 0) setTags(tags.slice(0, -1))
              }}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
              className="flex-1 min-w-[80px] text-sm text-slate-700 bg-transparent border-none outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Notes</p>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" className={inputClass} />
        </div>
      </div>

      <div className="flex gap-2 pt-3">
        <button
          className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving…
            </span>
          ) : 'Save Changes'}
        </button>
      </div>
    </>
  )
}
