'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Category, DEFAULT_CATEGORIES } from '@/types'

export function useCategories() {
  const { user } = useAuth()
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setCustomCategories([])
      setLoading(false)
      return
    }

    const colRef = collection(db, 'users', user.uid, 'categories')
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const cats: Category[] = []
      snapshot.forEach((docSnap) => {
        cats.push({ id: docSnap.id, ...(docSnap.data() as Omit<Category, 'id'>) })
      })
      setCustomCategories(cats)
      setLoading(false)
    })

    return unsubscribe
  }, [user])

  const categories = [...DEFAULT_CATEGORIES, ...customCategories]

  const addCategory = async (cat: Omit<Category, 'id' | 'isDefault'>) => {
    if (!user) throw new Error('Not authenticated')
    const colRef = collection(db, 'users', user.uid, 'categories')
    await addDoc(colRef, { ...cat, isDefault: false })
  }

  const deleteCategory = async (id: string) => {
    if (!user) throw new Error('Not authenticated')
    const docRef = doc(db, 'users', user.uid, 'categories', id)
    await deleteDoc(docRef)
  }

  return { categories, customCategories, loading, addCategory, deleteCategory }
}
