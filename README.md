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

### 1. Row Not Inserting Into Database

**Problem:** Bookmark insert failed because `user_id` column was NOT NULL.

**Solution:**
- Retrieved current session using `supabase.auth.getSession()`
- Attached `user_id: session.user.id` during insert
- Added proper RLS insert policy

### 2. Data Not Showing in Frontend

**Problem:** Bookmarks were not visible after insertion.

**Root Cause:** Row Level Security blocked SELECT queries.

**Solution:**
- Created explicit SELECT policy
- Verified `auth.uid() = user_id` condition
- Confirmed logged-in user ID matches row `user_id`

### 3. Realtime Updates Not Working Across Tabs

**Problem:** When a bookmark was added or deleted in one tab, the other tab did not update automatically.

**Root Cause:**
- Realtime subscription was not implemented initially
- `bookmarks` table was not added to `supabase_realtime` publication
- DELETE events were not firing (PostgreSQL does not send old row data by default)

**Solution:**
- Implemented Supabase Realtime subscription using `.channel().on("postgres_changes")`
- Added `bookmarks` table to `supabase_realtime` under Database → Publications
- Enabled full replica identity to receive DELETE payloads:

```sql
ALTER TABLE bookmarks REPLICA IDENTITY FULL;
```

**Result:**
- INSERT updates sync instantly across tabs
- DELETE updates sync instantly across tabs
- No manual page refresh required

### 4. Delete Operation Only Updating After Refresh

**Problem:** Delete appeared to work in the current tab but did not update other tabs until refresh.

**Root Cause:** `payload.old` was empty because replica identity was not set to FULL.

**Solution:**
- Executed `ALTER TABLE bookmarks REPLICA IDENTITY FULL;`
- Created explicit DELETE event listener in realtime subscription



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
