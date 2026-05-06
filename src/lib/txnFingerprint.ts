export function txnFingerprint(row: {
  upiRef?: string
  date: Date
  amount: number
  description: string
}): string {
  if (row.upiRef) return `upi_${row.upiRef}`
  const base = `${row.date.toISOString().slice(0, 10)}_${row.amount}_${row.description.toLowerCase().trim()}`
  let h = 5381
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h) ^ base.charCodeAt(i)
  return `txn_${(h >>> 0).toString(36)}`
}
