'use client'

import { useState } from 'react'
import { useArchivedTransactions } from '@/hooks/useArchivedTransactions'
import { ArchivedTransaction } from '@/types'
import { formatINR } from '@/lib/format'
import { DEFAULT_CATEGORIES } from '@/types'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { RotateCcw, Trash2, AlertTriangle, Archive } from 'lucide-react'
import CategoryIcon from '@/components/CategoryIcon'

export default function ArchivePage() {
  const { archived, loading, restoreTransaction, permanentlyDelete } = useArchivedTransactions()
  const [selected, setSelected] = useState<ArchivedTransaction | null>(null)
  const [confirmPermanent, setConfirmPermanent] = useState<ArchivedTransaction | null>(null)
  const [working, setWorking] = useState(false)

  const handleRestore = async (item: ArchivedTransaction) => {
    setWorking(true)
    try {
      await restoreTransaction(item)
      toast.success('Restored to transactions')
      setSelected(null)
    } catch (e) {
      console.error('Failed to restore transaction:', e)
      toast.error('Failed to restore')
    } finally {
      setWorking(false)
    }
  }

  const handlePermanentDelete = async () => {
    if (!confirmPermanent) return
    setWorking(true)
    try {
      await permanentlyDelete(confirmPermanent.id)
      toast.success('Permanently deleted')
      setConfirmPermanent(null)
      setSelected(null)
    } catch (e) {
      console.error('Failed to permanently delete:', e)
      toast.error('Failed to delete')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-4 pt-4 pb-2">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Archive</h1>
        <p className="text-sm text-slate-500 mt-0.5">Deleted expenses — restore or permanently remove</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : archived.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Archive size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm font-medium">Archive is empty</p>
          <p className="text-slate-400 text-xs mt-1">Deleted expenses will appear here</p>
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl divide-y divide-slate-50 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
        >
          {archived.map(item => {
            const cat = DEFAULT_CATEGORIES.find(c => c.id === item.category) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
            return (
              <button
                key={item.id}
                className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-slate-50 transition-colors active:bg-slate-100"
                onClick={() => setSelected(item)}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 opacity-60"
                  style={{ backgroundColor: (cat.color || '#6b7280') + '20' }}
                >
                  <CategoryIcon id={cat.id} size={20} className="text-slate-500 opacity-60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-500 text-sm truncate">{item.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}Archived {item.archivedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <p className="font-bold text-slate-400 text-sm flex-shrink-0 tabular-nums">
                  {formatINR(item.amount)}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        <DialogContent className="rounded-2xl max-w-[380px] mx-auto">
          {selected && (
            <>
              <div className="space-y-0 text-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">{selected.description}</h3>
                {[
                  ['Amount', formatINR(selected.amount)],
                  ['Category', DEFAULT_CATEGORIES.find(c => c.id === selected.category)?.name || selected.category],
                  ['Payment', selected.paymentMethod],
                  ['Date', selected.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
                  ['Archived', selected.archivedAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-2.5 border-b border-slate-50">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-900">{value}</span>
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
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-medium hover:bg-indigo-100 active:scale-[0.98] transition-all disabled:opacity-60"
                  onClick={() => handleRestore(selected)}
                  disabled={working}
                >
                  {working ? <span className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" /> : <RotateCcw size={14} />}
                  Restore
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 text-red-500 text-sm font-medium hover:bg-red-100 active:scale-[0.98] transition-all"
                  onClick={() => { setConfirmPermanent(selected); setSelected(null) }}
                >
                  <Trash2 size={14} /> Delete Forever
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Permanent delete confirmation */}
      <Dialog open={!!confirmPermanent} onOpenChange={open => { if (!open && !working) setConfirmPermanent(null) }}>
        <DialogContent className="rounded-2xl max-w-[340px] mx-auto">
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete permanently?</h3>
              <p className="text-sm text-slate-500 mt-1">
                &ldquo;{confirmPermanent?.description}&rdquo; will be gone forever. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 w-full mt-1">
              <button
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all"
                onClick={() => setConfirmPermanent(null)}
                disabled={working}
              >
                Cancel
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-60"
                onClick={handlePermanentDelete}
                disabled={working}
              >
                {working ? <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <><Trash2 size={14} /> Delete Forever</>}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
