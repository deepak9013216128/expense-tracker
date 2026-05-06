'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { ArchivedTransaction } from '@/types'

function fromFirestore(data: Record<string, unknown>, id: string): ArchivedTransaction {
  if (typeof data.amount !== 'number') throw new Error(`Invalid archived doc ${id}: missing amount`)
  if (!(data.date instanceof Timestamp)) throw new Error(`Invalid archived doc ${id}: missing date`)
  if (!(data.createdAt instanceof Timestamp)) throw new Error(`Invalid archived doc ${id}: missing createdAt`)
  if (!(data.archivedAt instanceof Timestamp)) throw new Error(`Invalid archived doc ${id}: missing archivedAt`)
  return {
    id,
    amount: data.amount,
    description: data.description as string,
    category: data.category as string,
    paymentMethod: data.paymentMethod as ArchivedTransaction['paymentMethod'],
    tags: (data.tags as string[]) || [],
    notes: (data.notes as string) || '',
    date: data.date.toDate(),
    createdAt: data.createdAt.toDate(),
    archivedAt: data.archivedAt.toDate(),
  }
}

export function useArchivedTransactions() {
  const { user } = useAuth()
  const [archived, setArchived] = useState<ArchivedTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setArchived([]); setLoading(false); return }
    const colRef = collection(db, 'users', user.uid, 'archived_transactions')
    const q = query(colRef, orderBy('archivedAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setArchived(snap.docs.map(d => fromFirestore(d.data() as Record<string, unknown>, d.id)))
      setLoading(false)
    })
    return unsub
  }, [user])

  const restoreTransaction = async (item: ArchivedTransaction) => {
    if (!user) throw new Error('Not authenticated')
    const txnsCol = collection(db, 'users', user.uid, 'transactions')
    const { archivedAt, ...rest } = item
    void archivedAt
    await addDoc(txnsCol, {
      ...rest,
      date: Timestamp.fromDate(rest.date),
      createdAt: Timestamp.fromDate(rest.createdAt),
    })
    const archiveRef = doc(db, 'users', user.uid, 'archived_transactions', item.id)
    await deleteDoc(archiveRef)
  }

  const permanentlyDelete = async (id: string) => {
    if (!user) throw new Error('Not authenticated')
    await deleteDoc(doc(db, 'users', user.uid, 'archived_transactions', id))
  }

  return { archived, loading, restoreTransaction, permanentlyDelete }
}
