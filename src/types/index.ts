export type PaymentMethod = "UPI" | "Cash" | "Card" | "Other"

export interface Transaction {
  id: string
  amount: number
  description: string
  category: string
  paymentMethod: PaymentMethod
  tags: string[]
  notes: string
  date: Date
  createdAt: Date
  upiRef?: string
}

export interface ArchivedTransaction extends Transaction {
  archivedAt: Date
}

export interface Category {
  id: string
  name: string
  icon: string
  isDefault: boolean
  color: string
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food",          name: "Food",         icon: "food",          isDefault: true, color: "#f97316" },
  { id: "groceries",     name: "Groceries",    icon: "groceries",     isDefault: true, color: "#84cc16" },
  { id: "shopping",      name: "Shopping",     icon: "shopping",      isDefault: true, color: "#a855f7" },
  { id: "travel",        name: "Travel",       icon: "travel",        isDefault: true, color: "#06b6d4" },
  { id: "taxi",          name: "Taxi",         icon: "taxi",          isDefault: true, color: "#f59e0b" },
  { id: "bills",         name: "Bills",        icon: "bills",         isDefault: true, color: "#eab308" },
  { id: "financial",     name: "Financial",    icon: "financial",     isDefault: true, color: "#3b82f6" },
  { id: "transfer",      name: "Transfer",     icon: "transfer",      isDefault: true, color: "#8b5cf6" },
  { id: "received",      name: "Received",     icon: "received",      isDefault: true, color: "#22c55e" },
  { id: "investment",    name: "Investment",   icon: "investment",    isDefault: true, color: "#0ea5e9" },
  { id: "medical",       name: "Medical",      icon: "medical",       isDefault: true, color: "#ef4444" },
  { id: "rent",          name: "Rent",         icon: "rent",          isDefault: true, color: "#ec4899" },
  { id: "miscellaneous", name: "Misc",         icon: "miscellaneous", isDefault: true, color: "#6b7280" },
]

export interface ImportSession {
  id: string
  filename: string
  importedAt: Date
  totalCount: number
  approvedCount: number
}

export interface PendingTransaction {
  id: string
  sessionId: string
  importedAt: Date
  // transaction fields (editable before approval)
  amount: number
  description: string
  category: string
  paymentMethod: PaymentMethod
  tags: string[]
  notes: string
  date: Date
  upiRef: string
}

export interface Budget {
  id: string          // same as category id
  categoryId: string
  monthlyLimit: number
}
