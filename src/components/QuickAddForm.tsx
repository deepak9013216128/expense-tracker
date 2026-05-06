'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Transaction, PaymentMethod } from '@/types'
import { useCategories } from '@/hooks/useCategories'
import { ChevronDown, CalendarDays, X } from 'lucide-react'
import CategoryIcon from '@/components/CategoryIcon'
import { toast } from 'sonner'
import { toLocalDateString } from '@/lib/format'

function dateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (iso === toLocalDateString(today)) return 'Today'
  if (iso === toLocalDateString(yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface QuickAddFormProps {
  onAdd: (txn: Omit<Transaction, 'id' | 'createdAt'>) => Promise<string>
}

const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Cash', 'Card', 'Other']

export default function QuickAddForm({ onAdd }: QuickAddFormProps) {
  const { categories } = useCategories()
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('food')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [notes, setNotes] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)
  const [date, setDate] = useState(() => toLocalDateString(new Date()))
  const [showExtra, setShowExtra] = useState(false)
  const [loading, setLoading] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)
  const dateRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (!description.trim()) {
      toast.error('Please enter a description')
      return
    }

    setLoading(true)
    try {
      await onAdd({
        amount: numAmount,
        description: description.trim(),
        category,
        paymentMethod,
        tags,
        notes: notes.trim(),
        date: new Date(date + 'T00:00:00'),
      })
      setAmount('')
      setDescription('')
      setCategory('food')
      setPaymentMethod('UPI')
      setDate(toLocalDateString(new Date()))
      setTags([])
      setTagInput('')
      setNotes('')
      setShowExtra(false)
      toast.success('Expense added!')
      amountRef.current?.focus()
    } catch (e) {
      console.error('Failed to add expense:', e)
      toast.error('Failed to add expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      {/* Amount input */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-1">
          <span className="text-4xl max-[360px]:text-3xl font-bold text-slate-300 select-none">₹</span>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="0"
            step="0.01"
            className="flex-1 text-4xl max-[360px]:text-3xl font-bold text-slate-900 bg-transparent border-none outline-none focus:outline-none placeholder:text-slate-200 tabular-nums min-w-0"
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-50 mx-5" />

      {/* Description input */}
      <div className="px-5 py-3">
        <input
          type="text"
          placeholder="What for?"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full text-base text-slate-700 bg-transparent border-none outline-none focus:outline-none placeholder:text-slate-300 font-normal"
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-50" />

      {/* Date picker */}
      <div className="px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays size={15} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700 truncate">{dateLabel(date)}</span>
        </div>
        <input
          ref={dateRef}
          type="date"
          value={date}
          max={toLocalDateString(new Date())}
          onChange={e => setDate(e.target.value)}
          className="text-xs text-indigo-600 font-medium bg-indigo-50 rounded-lg px-2.5 py-1.5 border-none outline-none cursor-pointer flex-shrink-0 max-w-[150px]"
        />
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-50" />

      {/* Category picker */}
      <div className="px-5 py-4">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-3">Category</p>
        <div className="grid grid-cols-4 gap-2 max-[360px]:gap-1.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`min-w-0 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-150 active:scale-95 ${
                category === cat.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CategoryIcon id={cat.id} size={18} className={category === cat.id ? 'text-white' : 'text-slate-500'} />
              <span className={`text-[10px] font-medium truncate w-full text-center leading-tight ${
                category === cat.id ? 'text-white' : 'text-slate-500'
              }`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-50" />

      {/* Payment method */}
      <div className="px-5 py-4">
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-3">Payment</p>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {PAYMENT_METHODS.map(method => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 active:scale-95 ${
                paymentMethod === method
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Tags & Notes toggle */}
      <div className="px-5 pb-4">
        <button
          type="button"
          onClick={() => setShowExtra(!showExtra)}
          className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium transition-colors hover:text-indigo-700"
        >
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${showExtra ? 'rotate-180' : ''}`}
          />
          {showExtra ? 'Hide' : 'Add'} Tags &amp; Notes
        </button>

        {showExtra && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                Tags
              </p>
              {/* Tag chips */}
              <div
                className="flex flex-wrap gap-1.5 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all cursor-text"
                onClick={() => tagInputRef.current?.focus()}
              >
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-1 rounded-lg"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setTags(tags.filter(t => t !== tag)) }}
                      className="text-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  placeholder={tags.length === 0 ? 'Add tags…' : ''}
                  value={tagInput}
                  onChange={e => {
                    // strip spaces — enforce single word
                    setTagInput(e.target.value.replace(/\s/g, ''))
                  }}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if ((e.key === 'Enter' || e.key === ' ') && tagInput.trim()) {
                      e.preventDefault()
                      const normalized = tagInput.trim().toLowerCase()
                      if (!tags.includes(normalized)) {
                        setTags([...tags, normalized])
                      }
                      setTagInput('')
                    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
                      setTags(tags.slice(0, -1))
                    }
                  }}
                  onBlur={() => {
                    if (tagInput.trim()) {
                      const normalized = tagInput.trim().toLowerCase()
                      if (!tags.includes(normalized)) setTags([...tags, normalized])
                      setTagInput('')
                    }
                  }}
                  className="flex-1 min-w-[80px] text-sm text-slate-700 bg-transparent border-none outline-none placeholder:text-slate-300"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Press Enter or Space to add each tag</p>
            </div>
            <div>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                Notes
              </p>
              <input
                type="text"
                placeholder="Any extra notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-sm text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-slate-300 transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="px-4 pb-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-base rounded-2xl shadow-lg shadow-indigo-200 transition-all duration-150"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Adding...
            </span>
          ) : (
            'Add Expense'
          )}
        </button>
      </div>
    </form>
  )
}
