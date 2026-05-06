export const toLocalDateString = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)

export const formatCompactINR = (amount: number): string => {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  const value = (n: number) => n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)

  if (abs >= 10000000) return `${sign}₹${value(abs / 10000000)}Cr`
  if (abs >= 100000) return `${sign}₹${value(abs / 100000)}L`
  if (abs >= 1000) return `${sign}₹${value(abs / 1000)}K`

  return `${sign}₹${Math.round(abs).toLocaleString('en-IN')}`
}

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)

export const formatDateShort = (date: Date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date)

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const getDateLabel = (date: Date): string => {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return formatDate(date)
}
