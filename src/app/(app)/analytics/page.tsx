'use client'

import { useState, useMemo } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { DEFAULT_CATEGORIES } from '@/types'
import { formatCompactINR, formatINR, formatDateShort } from '@/lib/format'
import CategoryIcon from '@/components/CategoryIcon'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  Tooltip
)

type Range = 'week' | 'month' | '3months'
const RANGES: { label: string; value: Range }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '3 Months', value: '3months' },
]
const METHODS = ['UPI', 'Cash', 'Card', 'Other'] as const

function rangeStart(range: Range): Date {
  const d = new Date()
  if (range === 'week') d.setDate(d.getDate() - 7)
  else if (range === 'month') d.setMonth(d.getMonth() - 1)
  else d.setMonth(d.getMonth() - 3)
  return d
}

export default function AnalyticsPage() {
  const { transactions } = useTransactions()

  const [range, setRange]       = useState<Range>('month')
  const [catFilter, setCatFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    const start = rangeStart(range)
    const end = new Date()
    return transactions.filter(t =>
      t.date >= start && t.date <= end &&
      (catFilter === 'all' || t.category === catFilter) &&
      (methodFilter === 'all' || t.paymentMethod === methodFilter)
    )
  }, [transactions, range, catFilter, methodFilter])

  const total = useMemo(() => filtered.reduce((s, t) => s + t.amount, 0), [filtered])

  const avgPerDay = useMemo(() => {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 90
    return total / days
  }, [total, range])

  const topCategory = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach(t => map.set(t.category, (map.get(t.category) || 0) + t.amount))
    let maxCat = '', maxAmt = 0
    map.forEach((amt, cat) => { if (amt > maxAmt) { maxAmt = amt; maxCat = cat } })
    return DEFAULT_CATEGORIES.find(c => c.id === maxCat)
  }, [filtered])

  const categoryData = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach(t => map.set(t.category, (map.get(t.category) || 0) + t.amount))
    return DEFAULT_CATEGORIES
      .map(cat => {
        const value = map.get(cat.id) || 0
        return {
          id: cat.id,
          name: cat.name,
          value,
          color: cat.color,
          percent: total > 0 ? Math.round((value / total) * 100) : 0,
        }
      })
      .filter(d => d.value > 0)
  }, [filtered, total])

  const trendData = useMemo(() => {
    if (range === '3months') {
      // Group by month
      const map = new Map<string, number>()
      filtered.forEach(t => {
        const key = t.date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
        map.set(key, (map.get(key) || 0) + t.amount)
      })
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return Array.from(map.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => {
          const [am, ay] = [months.indexOf(a.date.slice(0,3)), a.date.slice(4)]
          const [bm, by] = [months.indexOf(b.date.slice(0,3)), b.date.slice(4)]
          return ay !== by ? ay.localeCompare(by) : am - bm
        })
    }
    if (range === 'month') {
      // Group by week number (week start date)
      const map = new Map<string, { amount: number; weekStart: Date }>()
      filtered.forEach(t => {
        const d = new Date(t.date)
        d.setDate(d.getDate() - d.getDay()) // Sunday of that week
        const key = d.toISOString().slice(0, 10)
        const existing = map.get(key)
        map.set(key, { amount: (existing?.amount || 0) + t.amount, weekStart: d })
      })
      return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, { amount, weekStart }]) => ({
          date: weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          amount,
        }))
    }
    // week → daily
    const map = new Map<string, number>()
    filtered.forEach(t => {
      const key = formatDateShort(t.date)
      map.set(key, (map.get(key) || 0) + t.amount)
    })
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [filtered, range])

  // MoM: respects category + method filters, but uses its own time window
  const momData = useMemo(() => {
    const now = new Date()
    const applyFilters = (t: typeof transactions[0]) =>
      (catFilter === 'all' || t.category === catFilter) &&
      (methodFilter === 'all' || t.paymentMethod === methodFilter)

    const thisMonth = transactions.filter(t =>
      t.date.getFullYear() === now.getFullYear() &&
      t.date.getMonth() === now.getMonth() &&
      applyFilters(t)
    )
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonth = transactions.filter(t =>
      t.date.getFullYear() === lastMonthDate.getFullYear() &&
      t.date.getMonth() === lastMonthDate.getMonth() &&
      applyFilters(t)
    )
    const thisTotal = thisMonth.reduce((s, t) => s + t.amount, 0)
    const prevTotal = prevMonth.reduce((s, t) => s + t.amount, 0)
    const delta = thisTotal - prevTotal
    const pct = prevTotal > 0 ? Math.round(Math.abs(delta / prevTotal) * 100) : null

    const cats = catFilter === 'all' ? DEFAULT_CATEGORIES : DEFAULT_CATEGORIES.filter(c => c.id === catFilter)
    const byCat = cats.map(cat => {
      const cur  = thisMonth.filter(t => t.category === cat.id).reduce((s, t) => s + t.amount, 0)
      const prev = prevMonth.filter(t => t.category === cat.id).reduce((s, t) => s + t.amount, 0)
      return { cat, cur, prev, delta: cur - prev }
    }).filter(d => d.cur > 0 || d.prev > 0).sort((a, b) => b.cur - a.cur)

    const prevMonthName = lastMonthDate.toLocaleString('en-IN', { month: 'long' })
    return { thisTotal, prevTotal, delta, pct, byCat, prevMonthName }
  }, [transactions, catFilter, methodFilter])

  const tagSummary = useMemo(() => {
    const map = new Map<string, number>()
    filtered.forEach(t => t.tags.forEach(tag => map.set(tag, (map.get(tag) || 0) + t.amount)))
    return Array.from(map.entries())
      .map(([tag, amount]) => ({ tag, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  }, [filtered])

  const maxTagAmount = tagSummary[0]?.amount || 1

  const activeFilters = (catFilter !== 'all' ? 1 : 0) + (methodFilter !== 'all' ? 1 : 0)

  const categoryChartData = useMemo<ChartData<'doughnut'>>(() => ({
    labels: categoryData.map(d => d.name),
    datasets: [
      {
        data: categoryData.map(d => d.value),
        backgroundColor: categoryData.map(d => d.color),
        borderColor: '#ffffff',
        borderRadius: 5,
        borderWidth: 3,
        hoverBorderWidth: 3,
        hoverOffset: 8,
        spacing: 2,
      },
    ],
  }), [categoryData])

  const categoryChartOptions = useMemo<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    animation: { duration: 450 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
        boxPadding: 4,
        caretPadding: 8,
        cornerRadius: 12,
        displayColors: true,
        padding: 10,
        titleColor: '#cbd5e1',
        bodyColor: '#ffffff',
        titleFont: { size: 11, weight: 'normal' },
        bodyFont: { size: 12, weight: 'bold' },
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) => {
            const value = Number(ctx.raw || 0)
            const pct = total > 0 ? Math.round((value / total) * 100) : 0
            return `${formatINR(value)} (${pct}%)`
          },
        },
      },
    },
  }), [total])

  const trendChartData = useMemo<ChartData<'bar'>>(() => ({
    labels: trendData.map(d => d.date),
    datasets: [
      {
        label: 'Spent',
        data: trendData.map(d => d.amount),
        backgroundColor: '#6366f1',
        borderColor: '#4f46e5',
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: '#4f46e5',
        maxBarThickness: 28,
        minBarLength: 6,
      },
    ],
  }), [trendData])

  const trendChartOptions = useMemo<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 450 },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    layout: {
      padding: { top: 8, right: 4, bottom: 0, left: 0 },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#1e293b',
        borderWidth: 1,
        caretPadding: 8,
        cornerRadius: 12,
        displayColors: false,
        padding: 10,
        titleColor: '#cbd5e1',
        bodyColor: '#ffffff',
        titleFont: { size: 11, weight: 'normal' },
        bodyFont: { size: 12, weight: 'bold' },
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => formatINR(Number(ctx.raw || 0)),
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 500 },
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 5,
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: '#f1f5f9' },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, weight: 500 },
          padding: 6,
          callback: value => formatCompactINR(Number(value)).replace('₹', ''),
        },
      },
    },
  }), [])

  return (
    <div className="space-y-5 pt-4 pb-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight min-w-0">Analytics</h1>
        {activeFilters > 0 && (
          <button
            onClick={() => { setCatFilter('all'); setMethodFilter('all') }}
            className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full flex-shrink-0"
          >
            Clear filters ({activeFilters})
          </button>
        )}
      </div>

      {/* Time range */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
        {RANGES.map(r => (
          <button key={r.value} onClick={() => setRange(r.value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-150 active:scale-95 ${
              range === r.value ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-2 px-1">Category</p>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setCatFilter('all')}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
              catFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
            }`}>
            All
          </button>
          {DEFAULT_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setCatFilter(cat.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                catFilter === cat.id ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
              }`}
              style={catFilter === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}>
              <CategoryIcon id={cat.id} size={11} style={catFilter === cat.id ? { color: '#fff' } : { color: cat.color }} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Payment method filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button onClick={() => setMethodFilter('all')}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
            methodFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
          }`}>
          All Methods
        </button>
        {METHODS.map(m => (
          <button key={m} onClick={() => setMethodFilter(m)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
              methodFilter === m ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'
            }`}>
            {m}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div className="grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
            <p className="font-bold text-slate-900 text-lg max-[360px]:text-base tabular-nums leading-tight truncate" title={formatINR(total)}>
              {formatCompactINR(total)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Avg/day</p>
            <p className="font-bold text-slate-900 text-lg max-[360px]:text-base tabular-nums leading-tight truncate" title={formatINR(avgPerDay)}>
              {formatCompactINR(avgPerDay)}
            </p>
          </div>
          <div className="min-w-0 rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">Top Cat.</p>
            <p className="font-bold text-slate-900 text-sm leading-tight mt-1 min-w-0">
              {topCategory ? (
                <span className="flex items-center gap-1 min-w-0">
                  <CategoryIcon id={topCategory.id} size={14} style={{ color: topCategory.color }} />
                  <span className="truncate">{topCategory.name}</span>
                </span>
              ) : '—'}
            </p>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-slate-500 text-sm font-medium">No data for selected filters</p>
          <p className="text-slate-400 text-xs mt-1">Try a different time range or filter</p>
        </div>
      ) : (
        <>
          {/* Category breakdown */}
          {categoryData.length > 0 && catFilter === 'all' && (
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold text-slate-900 text-base tracking-tight min-w-0">Category Breakdown</h2>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex-shrink-0">
                  {categoryData.length} cats
                </span>
              </div>
              <div className="relative mx-auto h-[210px] max-w-[260px]">
                <Doughnut data={categoryChartData} options={categoryChartOptions} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Total</span>
                  <span className="text-xl font-bold tabular-nums text-slate-900">{formatCompactINR(total)}</span>
                </div>
              </div>
              <div className="space-y-2.5 mt-3">
                {categoryData.map(d => (
                  <div key={d.name} className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-slate-600 flex-1 min-w-0 font-normal flex items-center gap-1">
                      <CategoryIcon id={d.id} size={13} style={{ color: d.color }} />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0">{formatCompactINR(d.value)}</span>
                    <span className="text-xs text-slate-400 tabular-nums w-8 text-right">
                      {d.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spending trend */}
          {trendData.length > 0 && (
            <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold text-slate-900 text-base tracking-tight">Spending Trend</h2>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {trendData.length} {range === '3months' ? 'months' : range === 'month' ? 'weeks' : 'days'}
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl bg-slate-50">
                <div style={{ minWidth: '100%', width: Math.max(trendData.length * 40, 100), height: 210 }} className="px-2 py-3">
                  <Bar data={trendChartData} options={trendChartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Month-over-month */}
          {(momData.thisTotal > 0 || momData.prevTotal > 0) && (
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 className="font-semibold text-slate-900 text-base mb-1 tracking-tight">vs Last Month</h2>
              <p className="text-xs text-slate-400 mb-4">Comparing this month to {momData.prevMonthName}</p>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 mb-4">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-1">This month</p>
                  <p className="text-xl max-[360px]:text-lg font-bold text-slate-900 tabular-nums" title={formatINR(momData.thisTotal)}>
                    {formatCompactINR(momData.thisTotal)}
                  </p>
                </div>
                <div className="text-right min-w-0">
                  {momData.pct !== null && (
                    <span className={`inline-flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full ${
                      momData.delta > 0 ? 'bg-red-50 text-red-500' : momData.delta < 0 ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {momData.delta > 0 ? '↑' : momData.delta < 0 ? '↓' : '='} {momData.pct}%
                    </span>
                  )}
                  <p className="text-xs text-slate-400 mt-1 tabular-nums truncate" title={`${formatINR(momData.prevTotal)} last month`}>
                    {formatCompactINR(momData.prevTotal)} last month
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {momData.byCat.map(({ cat, cur, prev, delta }) => {
                  const max = Math.max(cur, prev, 1)
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 min-w-0">
                          <CategoryIcon id={cat.id} size={13} style={{ color: cat.color }} />
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-bold text-slate-900 tabular-nums" title={formatINR(cur)}>{formatCompactINR(cur)}</span>
                          {delta !== 0 && (
                            <span className={`text-[10px] font-semibold tabular-nums ${delta > 0 ? 'text-red-500' : 'text-green-600'}`}>
                              {delta > 0 ? '+' : ''}{formatCompactINR(delta)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 h-1.5">
                        <div className="flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${(cur / max) * 100}%` }} />
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-slate-300 transition-all duration-500" style={{ width: `${(prev / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" /><span className="text-[10px] text-slate-400">This month</span></div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0" /><span className="text-[10px] text-slate-400">{momData.prevMonthName}</span></div>
              </div>
            </div>
          )}

          {/* Tag summary */}
          {tagSummary.length > 0 && (
            <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <h2 className="font-semibold text-slate-900 text-base mb-4 tracking-tight">Tag Summary</h2>
              <div className="space-y-3">
                {tagSummary.map(({ tag, amount }) => (
                  <div key={tag} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full">{tag}</span>
                      <span className="text-sm font-semibold text-slate-900 tabular-nums flex-shrink-0" title={formatINR(amount)}>{formatCompactINR(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${(amount / maxTagAmount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
