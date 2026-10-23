# MUNly — Supabase setup

## 1. Configure environment variables

Copy `.env.example` to `.env` in the project root and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Use only your Supabase publishable/anon key in frontend code. Never place a service-role key or email-provider secret in `.env` variables prefixed with `VITE_`, commit secrets, or share your `.env` file.

## 2. Create the database tables

In your Supabase project, open **SQL Editor** and run both migrations, in this order:

1. `supabase/migrations/202610220001_create_motions.sql`
2. `supabase/migrations/202610230001_create_workspace_items.sql`

The first creates the private Motions Library. The second creates the private workspace table for conferences, MUN Passport entries, notes, position papers, research documents, draft resolutions and speech drafts. Both migrations enable Row Level Security and restrict records to the signed-in user who owns them.

## 3. Install and run

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

## 4. Test

1. Sign in and create a motion, then refresh the page.
2. Create a conference, note, position paper, research note, resolution and speech draft.
3. Refresh the page and confirm the items remain saved.
4. Edit and delete test items.
5. If possible, use a second test account to confirm it cannot see the first account's private records.

If the app reports that a table does not exist, verify that both migrations were run in the correct Supabase project. If a request is denied, confirm that the user is signed in and the RLS policies are present.

## Export and email notes

PDF export opens the browser print dialog; choose **Save as PDF**. Word export downloads a simple Word-compatible `.doc` file (not a full `.docx`). The product-update setting stores a preference only; actual announcement delivery requires a separate trusted server-side email integration. Do not add email-provider secrets to frontend variables.
