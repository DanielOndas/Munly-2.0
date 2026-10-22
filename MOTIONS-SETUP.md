# MUN Helper — Motions Library setup

## 1. Create the database table

1. Open your Supabase project.
2. Open **SQL Editor** and create a new query.
3. Copy the full contents of `supabase/migrations/202610220001_create_motions.sql` into the query.
4. Click **Run**.

The migration creates the private `public.motions` table, indexes, an `updated_at` trigger, and Row Level Security policies. Each signed-in user can only read, create, update, or delete their own motions. Anonymous users have no table access. The app does not need a service-role key.

## 2. Start the app

From the project folder, run:

```bash
npm install
npm run dev
```

Make sure your local `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never commit or share `.env`.

## 3. Test the feature

1. Sign in to MUN Helper.
2. Open **Motions Library** and create a motion.
3. Refresh the page; the motion should still be present.
4. Edit it, favorite it, search for it, and delete it.
5. If possible, sign in as a second test user and confirm that the first user's motions are not visible.

If the app reports that the motions table is missing, run the SQL migration first. If a request is denied after the migration, check that you are signed in and that the correct Supabase project URL is in `.env`.
