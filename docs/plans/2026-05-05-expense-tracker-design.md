# Expense Tracker — Design Document
_2026-05-05_

## Overview

A personal expense tracker PWA for recording daily transactions quickly on mobile or desktop, with Firebase storage and an analytics dashboard. Phase 2 will add AI-powered analysis.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Firebase Firestore |
| Charts | Recharts |
| PWA | next-pwa |

---

## Architecture

```
User (mobile-first PWA)
  → Next.js App (UI + API routes)
    → Firebase Auth (Google login)
      → Firebase Firestore (per-user data, secured by Auth)
```

### Firestore Structure

```
firestore/
└── users/
    └── {userId}/
        ├── transactions/   # expense records
        └── categories/     # default + custom categories
```

---

## Data Models

### Transaction

```typescript
{
  id: string
  amount: number
  description: string
  category: string
  paymentMethod: "UPI" | "Cash" | "Card" | "Other"
  tags: string[]          // free-form, auto-suggest from history
  notes: string           // optional free-text
  date: Timestamp
  createdAt: Timestamp
}
```

### Category

```typescript
{
  id: string
  name: string
  icon: string            // emoji
  isDefault: boolean
  color: string           // hex, used in charts
}
```

### Default Categories

Food, Transport, Shopping, Bills, Entertainment, Health, Other

---

## Pages & Navigation

Bottom navigation bar (mobile-first):

```
🏠 Home  |  📋 History  |  📊 Analytics  |  ⚙️ Settings
```

### Home — Quick-Add Form

The hero screen. Optimized for speed:

- Amount field auto-focused on load, numeric keyboard on mobile
- Category picker: icon grid, single tap
- Payment method: toggle chips (UPI / Cash / Card / Other)
- Tags + Notes: collapsed by default, tap to expand
- Optimistic UI — transaction appears instantly, syncs in background
- Haptic feedback on submit (mobile)

```
┌─────────────────────────┐
│  ₹  [   amount   ]      │
│  [description    ]      │
│  Category: 🍔 🚗 🛍 💡 ➕ │
│  Payment: UPI Cash Card │
│  ▸ Tags & Notes         │
│     [ Add Expense ]     │
└─────────────────────────┘
```

### History

- Full transaction list, newest first
- Search by description
- Filter by: category, payment method, tag, date range
- Tap transaction to edit/delete

### Analytics

Date range filter: This Week / This Month / Last 3 Months / Custom

1. **Monthly summary card** — total spent, top category, biggest transaction
2. **Category breakdown** — pie chart
3. **Daily trend** — bar/line chart of spend over time
4. **Tag summary** — spend grouped by tag (e.g. #reimbursable ₹2,100)

### Settings

- Manage custom categories (add, reorder, delete)
- Google account info + sign out
- Export transactions as CSV

---

## Auth Flow

1. First open → Google Sign-In screen
2. After login → Home (Quick-Add) always
3. PWA install prompt shown after first successful transaction

---

## Firestore Security Rules

Users can only read/write their own data:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Phase 2 — AI Integration (TODO)

- [ ] Natural language query: "how much did I spend on food last month?"
- [ ] Anomaly detection: "you spent 3x more on shopping this week"
- [ ] Budget suggestions based on spending patterns
- [ ] Auto-categorize transactions from description

---

## Implementation Order

1. Next.js project setup (TypeScript, Tailwind, shadcn/ui)
2. Firebase config (Auth + Firestore) + security rules
3. PWA manifest + next-pwa
4. Quick-Add form (Home screen)
5. Transaction History page
6. Analytics dashboard
7. Settings page
8. Bottom navigation layout
