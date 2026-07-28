# Duo Budget 💶

A fast, mobile-first web app for two people to track shared spending and save money —
built with **Vite + React + Tailwind** and **Supabase** (auth + Postgres). No bank syncing;
every entry is user-triggered by numpad or by scanning a receipt (on-device OCR via Tesseract.js).
Localized for Spain (€).

## Features

- **Expense Logger** — big numeric pad, category chips, "Paid by" and Shared/Personal toggles.
- **Receipt Scanner** — snap a photo; Tesseract.js reads the total and guesses the category. Confirm to log.
- **Shared Dashboard** — month total vs. budget, per-category progress bars (amber near limit, red over),
  and a live "who owes who" 50/50 settlement.
- **Personal Savings** — private goals + manual contributions with progress toward each target.
- **Two logins** — real Supabase email/password accounts, joined into one household via an invite code.
  Row-Level Security keeps each household's data (and each person's savings) isolated.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. In the dashboard: **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), Run.
   (This creates tables, the new-user trigger, the create/join RPCs, and RLS policies.)
3. **Auth**: for quickest testing, disable "Confirm email" under *Authentication → Providers → Email*.
4. Copy env and fill it in:
   ```bash
   cp .env.example .env
   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY  (Project Settings → API)
   ```
5. Install and run:
   ```bash
   npm install
   npm run dev
   ```
6. Open on your phone (same Wi-Fi) via the Network URL Vite prints, and "Add to Home Screen"
   for a native-app feel.

## How two people connect

- Partner A signs up → **Create household** → gets a 6-char **invite code** (Settings).
- Partner B signs up → **Join** → enters that code. Both now share expenses, budgets, and the dashboard.
- Savings goals stay private to each person.

## File structure

```
supabase/schema.sql        DB schema + RLS + RPC functions
src/
  lib/       supabase client, categories, currency format, settlement math, OCR
  context/   AuthContext (session, profile, household, members)
  hooks/     useExpenses, useSavings
  components/ Numpad, CategoryPicker, Segmented, ProgressBar, BottomNav, TopBar
  pages/     Login, Onboarding, AddExpense, ScanReceipt, Dashboard, Savings, Settings
```

## Settlement logic

Shared expenses are split 50/50. Each person's balance = (what they paid on shared) − (shared total ÷ 2).
The one who paid less owes the difference. Personal expenses never enter the settlement.
