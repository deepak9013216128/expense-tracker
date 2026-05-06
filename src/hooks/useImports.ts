'use client'

import { useState, useEffect } from 'react'
import {
  collection, doc, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, orderBy,
  writeBatch, Timestamp, increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { PendingTransaction, ImportSession } from '@/types'

function toTimestamp(d: Date) { return Timestamp.fromDate(d) }

const BATCH_LIMIT = 249

function sessionFromDoc(d: Record<string, unknown>, id: string): ImportSession {
  if (typeof d.filename !== 'string') throw new Error(`Invalid session doc ${id}: missing filename`)
  if (!(d.importedAt instanceof Timestamp)) throw new Error(`Invalid session doc ${id}: missing importedAt`)
  return {
    id,
    filename: d.filename,
    importedAt: d.importedAt.toDate(),
    totalCount: d.totalCount as number,
    approvedCount: d.approvedCount as number,
  }
}

function pendingFromDoc(d: Record<string, unknown>, id: string): PendingTransaction {
  if (typeof d.amount !== 'number') throw new Error(`Invalid pending doc ${id}: missing amount`)
  if (!(d.date instanceof Timestamp)) throw new Error(`Invalid pending doc ${id}: missing date`)
  if (!(d.importedAt instanceof Timestamp)) throw new Error(`Invalid pending doc ${id}: missing importedAt`)
  return {
    id,
    sessionId: d.sessionId as string,
    importedAt: d.importedAt.toDate(),
    amount: d.amount,
    description: d.description as string,
    category: d.category as string,
    paymentMethod: d.paymentMethod as PendingTransaction['paymentMethod'],
    tags: (d.tags as string[]) || [],
    notes: (d.notes as string) || '',
    date: d.date.toDate(),
    upiRef: (d.upiRef as string) || '',
  }
}

export function useImports() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<ImportSession[]>([])
  const [pending, setPending] = useState<PendingTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setSessions([]); setPending([]); setLoading(false); return }

    const unsubSessions = onSnapshot(
      query(collection(db, 'users', user.uid, 'import_sessions'), orderBy('importedAt', 'desc')),
      snap => setSessions(snap.docs.map(d => sessionFromDoc(d.data() as Record<string, unknown>, d.id)))
    )

    const unsubPending = onSnapshot(
      query(collection(db, 'users', user.uid, 'pending_transactions'), orderBy('date', 'desc')),
      snap => {
        setPending(snap.docs.map(d => pendingFromDoc(d.data() as Record<string, unknown>, d.id)))
        setLoading(false)
      }
    )

    return () => { unsubSessions(); unsubPending() }
  }, [user])

  // Store a batch of parsed transactions + create session
  const importTransactions = async (
    filename: string,
    rows: Omit<PendingTransaction, 'id' | 'sessionId' | 'importedAt'>[]
  ): Promise<string> => {
    if (!user) throw new Error('Not authenticated')
    const now = new Date()
    const sessionRef = doc(collection(db, 'users', user.uid, 'import_sessions'))
    const sessionId = sessionRef.id

    // Session doc counts as 1 op; each row is 1 op. Chunk to stay under 500.
    const chunks: typeof rows[] = []
    for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
      chunks.push(rows.slice(i, i + BATCH_LIMIT))
    }

    // First chunk includes the session doc
    const firstBatch = writeBatch(db)
    firstBatch.set(sessionRef, {
      filename,
      importedAt: toTimestamp(now),
      totalCount: rows.length,
      approvedCount: 0,
    })
    chunks[0]?.forEach(row => {
      const ref = doc(collection(db, 'users', user.uid, 'pending_transactions'))
      firstBatch.set(ref, { ...row, sessionId, importedAt: toTimestamp(now), date: toTimestamp(row.date) })
    })
    await firstBatch.commit()

    for (let i = 1; i < chunks.length; i++) {
      const batch = writeBatch(db)
      chunks[i].forEach(row => {
        const ref = doc(collection(db, 'users', user.uid, 'pending_transactions'))
        batch.set(ref, { ...row, sessionId, importedAt: toTimestamp(now), date: toTimestamp(row.date) })
      })
      await batch.commit()
    }

    return sessionId
  }

  const updatePending = async (id: string, updates: Partial<Omit<PendingTransaction, 'id' | 'sessionId' | 'importedAt'>>) => {
    if (!user) throw new Error('Not authenticated')
    const ref = doc(db, 'users', user.uid, 'pending_transactions', id)
    const data: Record<string, unknown> = { ...updates }
    if (updates.date) data.date = toTimestamp(updates.date)
    await updateDoc(ref, data)
  }

  const approveTransaction = async (txn: PendingTransaction) => {
    if (!user) throw new Error('Not authenticated')
    const batch = writeBatch(db)
    const txnRef = doc(collection(db, 'users', user.uid, 'transactions'))
    batch.set(txnRef, {
      amount: txn.amount,
      description: txn.description,
      category: txn.category,
      paymentMethod: txn.paymentMethod,
      tags: txn.tags,
      notes: txn.notes,
      date: toTimestamp(txn.date),
      createdAt: toTimestamp(new Date()),
    })
    batch.delete(doc(db, 'users', user.uid, 'pending_transactions', txn.id))
    batch.update(doc(db, 'users', user.uid, 'import_sessions', txn.sessionId), {
      approvedCount: increment(1),
    })
    await batch.commit()
  }

  const approveAll = async (sessionId: string) => {
    if (!user) throw new Error('Not authenticated')
    const toApprove = pending.filter(p => p.sessionId === sessionId)
    if (!toApprove.length) return

    const now = new Date()
    // Each transaction = 2 ops (set + delete). Leave 1 slot for session update per chunk.
    const chunkSize = Math.floor((BATCH_LIMIT - 1) / 2)
    const chunks: typeof toApprove[] = []
    for (let i = 0; i < toApprove.length; i += chunkSize) {
      chunks.push(toApprove.slice(i, i + chunkSize))
    }

    for (let i = 0; i < chunks.length; i++) {
      const batch = writeBatch(db)
      chunks[i].forEach(txn => {
        const txnRef = doc(collection(db, 'users', user.uid, 'transactions'))
        batch.set(txnRef, {
          amount: txn.amount,
          description: txn.description,
          category: txn.category,
          paymentMethod: txn.paymentMethod,
          tags: txn.tags,
          notes: txn.notes,
          date: toTimestamp(txn.date),
          createdAt: toTimestamp(now),
        })
        batch.delete(doc(db, 'users', user.uid, 'pending_transactions', txn.id))
      })
      batch.update(doc(db, 'users', user.uid, 'import_sessions', sessionId), {
        approvedCount: increment(chunks[i].length),
      })
      await batch.commit()
    }
  }

  const rejectTransaction = async (id: string) => {
    if (!user) throw new Error('Not authenticated')
    await deleteDoc(doc(db, 'users', user.uid, 'pending_transactions', id))
  }

  const rejectAll = async (sessionId: string) => {
    if (!user) throw new Error('Not authenticated')
    const toReject = pending.filter(p => p.sessionId === sessionId)
    // Each delete = 1 op; chunk to stay under 500
    for (let i = 0; i < toReject.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db)
      toReject.slice(i, i + BATCH_LIMIT).forEach(txn =>
        batch.delete(doc(db, 'users', user.uid, 'pending_transactions', txn.id))
      )
      await batch.commit()
    }
  }

  return {
    sessions, pending, loading,
    importTransactions, updatePending,
    approveTransaction, approveAll,
    rejectTransaction, rejectAll,
  }
}
