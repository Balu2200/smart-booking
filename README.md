# Smart Bookmark Manager

Smart Bookmark Manager is a full-stack web application built using Next.js (App Router) and Supabase. It allows users to authenticate with Google and manage their private bookmarks securely.

## Overview

- Users sign in using Google OAuth
- Each user can add bookmarks (title + URL)
- Bookmarks are private per user
- Users can delete their own bookmarks
- Data is stored in Supabase PostgreSQL
- Row Level Security (RLS) ensures isolation

## Tech Stack

- Next.js (App Router)
- Supabase (Authentication + Database + RLS)
- Tailwind CSS
- TypeScript

## Project Structure

```
smart-bookmark/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── utils/
│       └── supabase.ts
├── .env.local
├── package.json
└── README.md
```

## Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
```

Get these values from **Supabase → Settings → API**. Use only the anon public key. Do not use the service_role key in frontend.

## Supabase Database Setup

Run the following SQL in Supabase SQL Editor:

```sql
create table bookmarks (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    title text not null,
    url text not null,
    created_at timestamp default now()
);

alter table bookmarks enable row level security;

create policy "Users can select own bookmarks"
on bookmarks
for select
using (auth.uid() = user_id);

create policy "Users can insert own bookmarks"
on bookmarks
for insert
with check (auth.uid() = user_id);

create policy "Users can delete own bookmarks"
on bookmarks
for delete
using (auth.uid() = user_id);
```

## Google OAuth Setup

1. Go to Google Cloud Console
2. Create new project
3. Configure OAuth Consent Screen (External)
4. Create OAuth Client ID (Web Application)
5. Add Authorized Redirect URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
6. Copy Client ID and Secret
7. Add them in Supabase → Authentication → Providers → Google

## Installation

Clone the repository:

```bash
git clone https://github.com/your-username/smart-bookmark.git
```

Navigate to the project:

```bash
cd smart-bookmark
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Open: http://localhost:3000

## How It Works

- User signs in using Google
- Supabase creates authenticated session
- On dashboard load, session is verified
- Bookmarks are fetched where user_id equals logged user
- Insert automatically attaches user_id
- Delete removes only rows belonging to user

Row Level Security ensures:
- User A cannot see User B bookmarks
- All operations are validated by `auth.uid()`

## Challenges Faced and Solutions

### 1. Google OAuth Redirect Issue

**Problem:** After login, the user was redirected back to the home page instead of the dashboard.

**Solution:**
- Added explicit `redirectTo` option inside `signInWithOAuth`
- Verified authorized redirect URI in Google Cloud Console
- Ensured correct callback URL in Supabase

### 2. Row Not Inserting Into Database

**Problem:** Bookmark insert was failing because user_id column was NOT NULL.

**Solution:**
- Retrieved current session using `supabase.auth.getSession()`
- Attached `user_id: session.user.id` during insert
- Added proper RLS insert policy

### 3. Data Not Showing in Frontend

**Problem:** Bookmarks were not visible after insertion.

**Root Cause:** Row Level Security blocked SELECT queries.

**Solution:**
- Created explicit SELECT policy
- Verified `auth.uid() = user_id` condition
- Confirmed logged-in user ID matches row user_id

### 4. Delete Not Working

**Problem:** Delete operation executed but UI did not update.

**Solution:**
- Added manual state update after delete
- Ensured delete RLS policy exists
- Verified correct row ID is passed

### 5. Environment Variable Misconfiguration

**Problem:** App failed to connect to Supabase due to incorrect variable name.

**Solution:**
- Used correct variable name `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restarted dev server after modifying `.env.local`

### 6. Client vs Server Component Error (Next.js)

**Problem:** Event handlers caused runtime error because component was treated as Server Component.

**Solution:**
- Added `"use client"` at the top of interactive components
- Ensured it was the first line in the file

## Deployment

1. Push project to GitHub
2. Import repository in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

After deployment:
- Add production URL in Google OAuth authorized origins
- Add production redirect URI in Google Cloud

## Security Notes

- RLS must remain enabled
- Never expose service_role key in frontend
- Always verify session before database operations
