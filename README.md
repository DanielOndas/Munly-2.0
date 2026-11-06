# FinalMUN
### Your MUN journey, all in one place.

Welcome to **FinalMUN** — your personal space for everything Model United Nations.

Whether you're preparing for your first conference, writing a position paper, researching your country's policy or managing an entire conference, FinalMUN gives you the tools to stay organized, prepared and one step ahead.

No messy documents. No scattered notes. Just everything you need, in one place.

---

## What can you do with FinalMUN?

### Your Home
Your personal starting point. Keep track of your MUN journey, stay organized and access the things that matter most.

### Conferences
Keep all your conferences organized. Save dates, locations, committees and statuses so you always know what's coming up.

### Motions Library
Not sure what motion to raise? Browse 120 built-in procedural examples across eight categories. Save your favorites, add your own motions and customize suggested wording.

### MUN Passport
Your personal MUN history. Keep track of conferences you've attended, the roles you've taken and the experiences you've collected along the way.

### Research Workspace
Your research headquarters. Save sources, collect information, organize notes and keep everything connected to your conferences.

### Position Papers
Turn your research into a structured position paper. Start with a template and build your draft directly inside FinalMUN.

### Resolution Builder
Bring your ideas together. Organize preambulatory and operative clauses and work on your resolutions in one dedicated space.

### Speech Writer
Prepare for the floor with dedicated templates for:
- Opening speeches
- General Speakers' List speeches
- Moderated caucuses
- Closing speeches
- Responses and rebuttals

### Calendar
Keep track of important dates, upcoming conferences and everything happening in your MUN schedule.

### Personal Notes
A dedicated place for all your thoughts, ideas and quick notes.

### MUN Simulator
Practice your MUN skills in a solo simulation environment and keep track of your saved sessions.

---

## Designed to feel different

FinalMUN isn't another complicated productivity tool.

It's designed to feel clean, calm and enjoyable to use.

- A beautiful olive-green and creamy visual identity.
- Minimalist layouts with a modern feel.
- Smooth animations and subtle transitions.
- Carefully designed desktop and mobile experiences.
- Organized navigation that keeps everything within reach.

Every detail is designed to make preparing for MUN feel a little less stressful.

---

## Built with

FinalMUN is powered by:

- React
- Vite
- TypeScript
- Supabase
- PostgreSQL

## Getting started

Want to run FinalMUN locally? Here's how.

**1. Install dependencies**

```bash
npm install
```

**2. Set up your environment**

Copy `.env.example` to `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

**3. Set up your database**

Open your Supabase SQL Editor and run the migrations inside `supabase/migrations/`:

- `202610220001_create_motions.sql`
- `202610230001_create_workspace_items.sql`
- `202610240001_create_simulator_sessions.sql`

**4. Launch FinalMUN**

```bash
npm run dev
```

**5. Build for production**

```bash
npm run build
```

## Your workspace, your data

Your personal information and workspace records are protected using Supabase authentication and Row Level Security (RLS).

A few important things:
- Never commit your `.env` file.
- Never expose service-role keys.
- Only use your Supabase publishable/anon key in the frontend.
- Private workspace records are restricted to their owners.

## Exporting your work

Your documents shouldn't be stuck inside an app.

- **PDF:** Generate a print-ready document and save it as PDF through your browser.
- **Word:** Export saved text documents as Word-compatible `.doc` files.

Exports happen locally in your browser. Your document content isn't sent to an external export service.

## Notifications

You can manage your preferences for product updates through your account.

Actual announcement emails require a separately configured email provider and server-side sending function.

---

## The idea behind FinalMUN

MUN is about research, diplomacy, collaboration and finding your voice.

We think the tools you use should make that experience easier, not more complicated.

**Prepare better. Debate smarter. Make your mark.**

Welcome to FinalMUN.
