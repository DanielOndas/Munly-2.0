# MUNly

MUNly is a private workspace for Model United Nations preparation, built with React, Vite, TypeScript and Supabase. It uses a minimal soft-graphite interface with charcoal surfaces and cool grey accents.

## Features

- Supabase authentication: sign up, sign in, password reset and password update.
- Motions Library: 120 built-in procedure examples across eight categories, personal motions, suggested wording, favorites, editing and deletion. Conference rules can vary, so check your rulebook before using a preset.
- Bulk motion import: paste multiple motions, classify them with local keyword rules, review suggested categories and duplicates, then save selected entries. No AI service is used.
- Conferences: save conference dates, locations, committees and status.
- MUN Passport: keep a record of past conferences, roles and reflections.
- Personal notes and research workspace: save notes, source links, tags and research content.
- Position paper editor: structured starting template and editable draft.
- Resolution builder: organize preambulatory and operative clauses in a saved draft.
- Speech writer: editable templates for opening speeches, GSL, caucuses, closing speeches and responses.
- PDF export via the browser print dialog and Word-compatible `.doc` export for saved text documents.
- Notification preference for product updates. Actual announcement delivery requires a separately configured email provider and is not active by default.
- Responsive layouts for desktop, tablet and mobile. Full PWA installation is intentionally deferred.

## Requirements

- Node.js 18 or newer (Node.js 20+ recommended)
- A Supabase project

## Setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Fill in the Supabase project URL and publishable/anon key:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
   ```

4. In the Supabase SQL Editor, run all three migrations in `supabase/migrations/`:
   - `202610220001_create_motions.sql`
   - `202610230001_create_workspace_items.sql`
   - `202610240001_create_simulator_sessions.sql`
5. Start the development server with `npm run dev`.
6. Run `npm run build` to type-check and create the production build.

Never commit `.env`, service-role keys, or other secrets. The frontend should only use the Supabase publishable/anon key. Row Level Security policies in the migrations limit each user to their own records.

## Data model

- `motions`: private saved motions.
- `workspace_items`: private conference, passport, note, paper, research, resolution and speech records. Additional structured details are stored in a JSONB `metadata` field.
- `simulator_sessions`: private saved solo simulator sessions and their current game state.

If Supabase reports that a table does not exist, verify that both SQL migrations were applied successfully in the correct Supabase project.

## Export notes

- **PDF:** opens a print-ready view; choose “Save as PDF” in the browser print dialog.
- **Word:** downloads a Word-compatible `.doc` document. It uses a simple document layout and is not a full `.docx` package.
- Export is performed locally in the browser; no document content is sent to a third-party export service.

## Email notifications

The user's product-update preference is saved in Supabase user metadata. The app does not send announcement campaigns yet. Configure and test a trusted email provider and server-side sending function before enabling actual outbound announcements. Never put email-provider secrets in frontend environment variables.

## Interface polish update

This update removes redundant uppercase eyebrow labels from the main app and simulator, simplifies the graphite visual system, reduces decorative gradients and hover movement, standardizes common component radii, and improves small-screen padding. Authentication and existing feature logic were left in place.

### Verification

The source archive is valid, but a production build could not be verified in the current environment because `npm ci` timed out and left an incomplete `node_modules` directory. On a development machine, remove `node_modules`, run `npm install`, then `npm run build` before deploying.
