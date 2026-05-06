'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactions } from '@/hooks/useTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import QuickAddForm from '@/components/QuickAddForm'
import CategoryIcon from '@/components/CategoryIcon'
import { formatINR } from '@/lib/format'
import { DEFAULT_CATEGORIES, Transaction } from '@/types'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomePage() {
  const { user } = useAuth()
  const { transactions, addTransaction } = useTransactions()
  const { budgets } = useBudgets()

  const todayTotal = useMemo(() => {
    const today = new Date()
    return transactions
      .filter(t => {
        const d = t.date
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }, [transactions])

  const monthTotal = useMemo(() => {
    const today = new Date()
    return transactions
      .filter(t => {
        const d = t.date
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth()
        )
      })
      .reduce((sum, t) => sum + t.amount, 0)
  }, [transactions])

  // Monthly spend per category for budget progress
  const monthSpendByCategory = useMemo(() => {
    const today = new Date()
    const map = new Map<string, number>()
    transactions.forEach(t => {
      const d = t.date
      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()) {
        map.set(t.category, (map.get(t.category) || 0) + t.amount)
      }
    })
    return map
  }, [transactions])

  const activeBudgets = useMemo(() =>
    budgets.map(b => {
      const spent = monthSpendByCategory.get(b.categoryId) || 0
      const pct = Math.min((spent / b.monthlyLimit) * 100, 100)
      const cat = DEFAULT_CATEGORIES.find(c => c.id === b.categoryId)
      return { ...b, spent, pct, cat }
    }).sort((a, b) => b.pct - a.pct),
  [budgets, monthSpendByCategory])

  const recentTransactions = transactions.slice(0, 5)
  const firstName = user?.displayName?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6 pt-4 pb-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-normal">{getGreeting()},</p>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate max-w-[220px]">
            {firstName} 👋
          </h1>
        </div>
        {user?.photoURL ? (
          <Image
            src={user.photoURL}
            alt="Avatar"
            width={40}
            height={40}
            className="rounded-full ring-2 ring-indigo-200 ring-offset-2 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full ring-2 ring-indigo-200 ring-offset-2 bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 font-bold text-sm">
              {firstName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Hero spending card */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
        <p className="text-indigo-200 text-[10px] font-medium uppercase tracking-widest mb-1">
          Today&apos;s Spending
        </p>
        <p className="text-4xl font-bold tabular-nums tracking-tight">
          {formatINR(todayTotal)}
        </p>
        <div className="flex items-center justify-between mt-3">
          <p className="text-indigo-200 text-sm">
            {formatINR(monthTotal)} this month
          </p>
          <span className="text-indigo-200 text-xs bg-white/10 px-2.5 py-1 rounded-full">
            {transactions.length} total
          </span>
        </div>
      </div>

      {/* Budget progress */}
      {activeBudgets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Budgets</h2>
            <Link href="/settings" className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors">
              Manage
            </Link>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-slate-50" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {activeBudgets.map(b => {
              const isOver = b.pct >= 100
              const isWarning = b.pct >= 80 && !isOver
              const barColor = isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#6366f1'
              return (
                <div key={b.categoryId} className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CategoryIcon id={b.cat?.id || 'miscellaneous'} size={18} className="text-slate-600" />
                      <span className="text-sm font-semibold text-slate-900">{b.cat?.name}</span>
                      {isOver && (
                        <span className="text-[10px] font-semibold bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Over</span>
                      )}
                      {isWarning && (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Near limit</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold tabular-nums" style={{ color: barColor }}>{formatINR(b.spent)}</span>
                      <span className="text-xs text-slate-400 tabular-nums"> / {formatINR(b.monthlyLimit)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${b.pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick Add */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3 tracking-tight">
          Add Expense
        </h2>
        <QuickAddForm onAdd={addTransaction} />
      </div>

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Recent</h2>
            <Link
              href="/history"
              className="text-sm text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
            >
              See all
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm divide-y divide-slate-50" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {recentTransactions.map(txn => (
              <TransactionRow key={txn.id} txn={txn} />
            ))}
          </div>
        </div>
      )}

      {recentTransactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-slate-500 text-sm">No transactions yet. Add your first expense above!</p>
        </div>
      )}
    </div>
  )
}

function TransactionRow({ txn }: { txn: Transaction }) {
  const cat = DEFAULT_CATEGORIES.find(c => c.id === txn.category)
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: (cat?.color || '#6b7280') + '20', color: cat?.color || '#6b7280' }}
      >
        <CategoryIcon id={cat?.id || 'miscellaneous'} size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">{txn.description}</p>
        <p className="text-xs text-slate-400 font-normal mt-0.5">{txn.paymentMethod} · {cat?.name}</p>
      </div>
      <p className="font-bold text-slate-900 text-sm tabular-nums flex-shrink-0">
        {formatINR(txn.amount)}
      </p>
    </div>
  )
}
