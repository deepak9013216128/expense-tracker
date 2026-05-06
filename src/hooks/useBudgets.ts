'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Budget } from '@/types'

export function useBudgets() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setBudgets([]); setLoading(false); return }
    const colRef = collection(db, 'users', user.uid, 'budgets')
    const unsub = onSnapshot(colRef, snap => {
      setBudgets(snap.docs.map(d => ({
        id: d.id,
        categoryId: d.id,
        monthlyLimit: d.data().monthlyLimit as number,
      })))
      setLoading(false)
    })
    return unsub
  }, [user])

  const setBudget = async (categoryId: string, monthlyLimit: number) => {
    if (!user) throw new Error('Not authenticated')
    await setDoc(doc(db, 'users', user.uid, 'budgets', categoryId), { monthlyLimit })
  }

  const removeBudget = async (categoryId: string) => {
    if (!user) throw new Error('Not authenticated')
    await deleteDoc(doc(db, 'users', user.uid, 'budgets', categoryId))
  }

  return { budgets, loading, setBudget, removeBudget }
}
