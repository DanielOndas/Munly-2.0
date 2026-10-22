# MUN Helper

## Run locally

1. Install Node.js if it is not already installed.
2. Copy `.env.example` to `.env`.
3. In `.env`, enter your Supabase Project URL and publishable key from Supabase → Project Settings / API Keys.
4. In Terminal, from this project folder, run:

   ```bash
   npm install
   npm run dev
   ```

5. Open the local URL printed by Vite (usually http://localhost:5173).

## Supabase Auth setup

In Supabase → Authentication → URL Configuration, set the Site URL to your local app URL if the dashboard allows it, and add `http://localhost:5173/**` to Redirect URLs. For a deployed app, add its real URL too.

Email/password sign-up, sign-in, sign-out, and password-reset handling are implemented. Depending on your Supabase email-confirmation setting, new users may need to confirm their email before signing in.

The app's content pages are still UI placeholders: this change adds authentication only. It does not yet save motions, notes, conferences, or passport entries to the database.

Never commit `.env` or share it publicly. The publishable key is intended for browser use; never put a Supabase service-role key in a frontend app.
