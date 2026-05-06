'use client'

'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useArchivedTransactions } from '@/hooks/useArchivedTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { formatINR } from '@/lib/format'
import { DEFAULT_CATEGORIES } from '@/types'
import { toast } from 'sonner'
import { Trash2, Plus, LogOut, Download, ChevronRight, Archive, Target, X, FileSpreadsheet } from 'lucide-react'
import CategoryIcon from '@/components/CategoryIcon'

const EMOJI_OPTIONS = ['🎯', '🏠', '✈️', '🎓', '🐾', '🎁', '💪', '🍕', '🎮', '📱']
const COLOR_OPTIONS = ['#f97316', '#3b82f6', '#a855f7', '#eab308', '#ec4899', '#22c55e', '#6b7280', '#ef4444']

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { transactions } = useTransactions()
  const { customCategories, addCategory, deleteCategory } = useCategories()
  const { archived } = useArchivedTransactions()
  const { budgets, setBudget, removeBudget } = useBudgets()
  const [budgetEdit, setBudgetEdit] = useState<string | null>(null)
  const [budgetInput, setBudgetInput] = useState('')

  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('🎯')
  const [newCatColor, setNewCatColor] = useState('#f97316')
  const [addingCat, setAddingCat] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (e) {
      console.error('Failed to sign out:', e)
      toast.error('Failed to sign out')
    }
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      toast.error('Category name is required')
      return
    }
    setAddingCat(true)
    try {
      await addCategory({ name: newCatName.trim(), icon: newCatIcon, color: newCatColor })
      setNewCatName('')
      setNewCatIcon('🎯')
      setNewCatColor('#f97316')
      setShowCatForm(false)
      toast.success('Category added')
    } catch (e) {
      console.error('Failed to add category:', e)
      toast.error('Failed to add category')
    } finally {
      setAddingCat(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteCategory(id)
      toast.success('Deleted')
    } catch (e) {
      console.error('Failed to delete category:', e)
      toast.error('Failed to delete')
    }
  }

  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Payment Method', 'Tags', 'Notes']
    const rows = transactions.map(t => [
      t.date.toLocaleDateString('en-IN'),
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      DEFAULT_CATEGORIES.find(c => c.id === t.category)?.name || t.category,
      t.paymentMethod,
      `"${t.tags.join(', ')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  const cardClass = "bg-white rounded-2xl overflow-hidden"
  const cardStyle = { boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }

  return (
    <div className="space-y-5 pt-4 pb-2">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1>

      {/* User profile card */}
      <div className={cardClass} style={cardStyle}>
        <div className="p-6 flex flex-col items-center text-center">
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt="Avatar"
              width={64}
              height={64}
              className="rounded-full ring-2 ring-indigo-200 ring-offset-2 mb-3"
            />
          ) : (
            <div className="w-16 h-16 rounded-full ring-2 ring-indigo-200 ring-offset-2 bg-indigo-100 flex items-center justify-center mb-3">
              <span className="text-indigo-600 font-bold text-2xl">
                {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
          <p className="font-bold text-slate-900 text-base">{user?.displayName}</p>
          <p className="text-sm text-slate-500 mt-0.5">{user?.email}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-medium">
              {transactions.length} transactions
            </span>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium tabular-nums">
              {formatINR(transactions.reduce((s, t) => s + t.amount, 0))} total
            </span>
          </div>
        </div>
      </div>

      {/* Categories & Budgets — combined */}
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2 px-1">
          Categories &amp; Monthly Limits
        </p>
        <div className={cardClass} style={cardStyle}>
          <div className="divide-y divide-slate-50">
            {/* Column headers */}
            <div className="flex items-center px-4 py-2">
              <span className="flex-1 text-[10px] font-medium text-slate-400 uppercase tracking-wider">Category</span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Monthly Limit</span>
            </div>

            {/* Default categories */}
            {DEFAULT_CATEGORIES.map(cat => {
              const budget = budgets.find(b => b.categoryId === cat.id)
              const isEditing = budgetEdit === cat.id
              return (
                <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                    <CategoryIcon id={cat.id} size={17} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex-1">{cat.name}</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-slate-400">₹</span>
                      <input
                        type="number"
                        autoFocus
                        value={budgetInput}
                        onChange={e => setBudgetInput(e.target.value)}
                        placeholder="0"
                        className="w-20 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent tabular-nums"
                        onKeyDown={async e => {
                          if (e.key === 'Enter') {
                            const val = parseFloat(budgetInput)
                            if (val > 0) { await setBudget(cat.id, val); toast.success('Budget saved') }
                            setBudgetEdit(null); setBudgetInput('')
                          } else if (e.key === 'Escape') {
                            setBudgetEdit(null); setBudgetInput('')
                          }
                        }}
                      />
                      <button
                        onClick={async () => {
                          const val = parseFloat(budgetInput)
                          if (val > 0) { await setBudget(cat.id, val); toast.success('Budget saved') }
                          setBudgetEdit(null); setBudgetInput('')
                        }}
                        className="text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  ) : budget ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setBudgetEdit(cat.id); setBudgetInput(String(budget.monthlyLimit)) }}
                        className="text-sm font-semibold text-indigo-600 tabular-nums hover:text-indigo-700 transition-colors"
                      >
                        {formatINR(budget.monthlyLimit)}
                      </button>
                      <button
                        onClick={async () => { await removeBudget(cat.id); toast.success('Budget removed') }}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setBudgetEdit(cat.id); setBudgetInput('') }}
                      className="flex items-center gap-1 text-xs text-slate-400 font-medium hover:text-indigo-600 transition-colors"
                    >
                      <Target size={12} />
                      <span>Set</span>
                    </button>
                  )}
                </div>
              )
            })}

            {/* Custom categories */}
            {customCategories.length > 0 && (
              <>
                <div className="px-4 py-2">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Custom</p>
                </div>
                {customCategories.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.color + '20', color: cat.color }}>
                      <CategoryIcon id={cat.id} size={17} />
                    </div>
                    <span className="text-sm font-medium text-slate-700 flex-1">{cat.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full text-red-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </>
            )}

            {/* Add category row */}
            <button
              onClick={() => setShowCatForm(!showCatForm)}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-slate-50 transition-colors active:bg-slate-100"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-indigo-50 flex-shrink-0">
                <Plus size={16} className="text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-indigo-600">Add category</span>
              <ChevronRight size={14} className={`ml-auto text-slate-300 transition-transform duration-200 ${showCatForm ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Add category form */}
          {showCatForm && (
            <div className="mx-4 mb-4 mt-1 bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">Name</p>
                <input
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className="w-full px-3.5 py-2.5 bg-white rounded-xl border border-slate-200 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-300 transition-all"
                />
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Icon</p>
                <div className="flex gap-2 flex-wrap">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button key={emoji} type="button" onClick={() => setNewCatIcon(emoji)}
                      className={`text-xl p-2 rounded-xl border-2 transition-all active:scale-95 ${newCatIcon === emoji ? 'border-indigo-500 bg-indigo-50' : 'border-transparent hover:border-slate-200'}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(color => (
                    <button key={color} type="button" onClick={() => setNewCatColor(color)}
                      className={`w-8 h-8 rounded-full border-[3px] transition-all active:scale-95 ${newCatColor === color ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <button
                className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-60"
                onClick={handleAddCategory} disabled={addingCat}
              >
                {addingCat ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data section */}
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2 px-1">
          Data
        </p>
        <div className={cardClass} style={cardStyle}>
          <Link
            href="/archive"
            className="flex items-center gap-3 px-4 py-4 w-full hover:bg-slate-50 transition-colors active:bg-slate-100"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-50 flex-shrink-0">
              <Archive size={16} className="text-amber-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900">Archive</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {archived.length > 0 ? `${archived.length} archived expense${archived.length !== 1 ? 's' : ''}` : 'Deleted expenses'}
              </p>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </Link>
          <div className="h-px bg-slate-50" />
          <Link
            href="/import"
            className="flex items-center gap-3 px-4 py-4 w-full hover:bg-slate-50 transition-colors active:bg-slate-100"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-green-50 flex-shrink-0">
              <FileSpreadsheet size={16} className="text-green-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900">Import Excel</p>
              <p className="text-xs text-slate-400 mt-0.5">Import from Paytm or other UPI statement</p>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </Link>
          <div className="h-px bg-slate-50" />
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-3 px-4 py-4 w-full hover:bg-slate-50 transition-colors active:bg-slate-100"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-indigo-50 flex-shrink-0">
              <Download size={16} className="text-indigo-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-900">Export CSV</p>
              <p className="text-xs text-slate-400 mt-0.5">Download all your transactions</p>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </button>
        </div>
      </div>

      {/* Account section */}
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2 px-1">
          Account
        </p>
        <div className={cardClass} style={cardStyle}>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-4 w-full hover:bg-red-50 transition-colors active:bg-red-100"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center bg-red-50 flex-shrink-0">
              <LogOut size={16} className="text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500">Sign Out</span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-300 pb-4 pt-2">
        Expense Tracker · v1.0.0
      </div>
    </div>
  )
}
