'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Transaction } from '@/types'

function toFirestoreDate(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}

function fromFirestore(data: Record<string, unknown>, id: string): Transaction {
  if (typeof data.amount !== 'number') throw new Error(`Invalid transaction doc ${id}: missing amount`)
  if (!(data.date instanceof Timestamp)) throw new Error(`Invalid transaction doc ${id}: missing date`)
  if (!(data.createdAt instanceof Timestamp)) throw new Error(`Invalid transaction doc ${id}: missing createdAt`)
  return {
    id,
    amount: data.amount,
    description: data.description as string,
    category: data.category as string,
    paymentMethod: data.paymentMethod as Transaction['paymentMethod'],
    tags: (data.tags as string[]) || [],
    notes: (data.notes as string) || '',
    date: data.date.toDate(),
    createdAt: data.createdAt.toDate(),
  }
}

export function useTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setTransactions([])
      setLoading(false)
      return
    }

    const colRef = collection(db, 'users', user.uid, 'transactions')
    const q = query(colRef, orderBy('date', 'desc'))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txns: Transaction[] = []
      snapshot.forEach((docSnap) => {
        txns.push(fromFirestore(docSnap.data() as Record<string, unknown>, docSnap.id))
      })
      setTransactions(txns)
      setLoading(false)
    })

    return unsubscribe
  }, [user])

  const addTransaction = async (
    txn: Omit<Transaction, 'id' | 'createdAt'>
  ): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    const colRef = collection(db, 'users', user.uid, 'transactions')
    const docRef = await addDoc(colRef, {
      ...txn,
      date: toFirestoreDate(txn.date),
      createdAt: toFirestoreDate(new Date()),
    })
    return docRef.id
  }

  const updateTransaction = async (
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>
  ) => {
    if (!user) throw new Error('Not authenticated')
    const docRef = doc(db, 'users', user.uid, 'transactions', id)
    const data: Record<string, unknown> = { ...updates }
    if (updates.date) data.date = toFirestoreDate(updates.date)
    await updateDoc(docRef, data)
  }

  const archiveTransaction = async (id: string) => {
    if (!user) throw new Error('Not authenticated')
    const srcRef = doc(db, 'users', user.uid, 'transactions', id)
    const txn = transactions.find(t => t.id === id)
    if (!txn) throw new Error('Transaction not found')
    const archiveRef = doc(db, 'users', user.uid, 'archived_transactions', id)
    await setDoc(archiveRef, {
      amount: txn.amount,
      description: txn.description,
      category: txn.category,
      paymentMethod: txn.paymentMethod,
      tags: txn.tags,
      notes: txn.notes,
      date: toFirestoreDate(txn.date),
      createdAt: toFirestoreDate(txn.createdAt),
      archivedAt: toFirestoreDate(new Date()),
    })
    await deleteDoc(srcRef)
  }

  return { transactions, loading, addTransaction, updateTransaction, archiveTransaction }
}
