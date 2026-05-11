# Gohan Diary

A personal recipe rating and collection site built with **SvelteKit** and **Supabase**.  
“Gohan” (ご飯) means rice / meal in Japanese.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Where it goes |
|----------|----------------|
| `PUBLIC_SUPABASE_URL` | Supabase → **Project Settings → API** → Project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Same page → `anon` **public** key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → **`service_role` secret** (server only; never expose to the browser or commit it) |
| `ADMIN_PASSWORD` | A secret passphrase you type on **Add recipe** (`/admin/new`) |
| `GEMINI_API_KEY` | Optional — enables **Format with AI** on `/admin/new` using [Google Gemini](https://aistudio.google.com/apikey) (generous **free tier**; server-only) |
| `GEMINI_MODEL` | Optional — override Gemini model (default `gemini-2.0-flash`) |

**Why `service_role`?** Supabase Row Level Security only allows signed-in users to insert recipes. This app does not use user accounts; the server verifies `ADMIN_PASSWORD`, then uses the service role **only on the server** to insert recipes, tags, and storage uploads.

### 3. Database schema

1. Open the **SQL Editor** for your Supabase project.
2. Paste `schema.sql` and run it once.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Recipe grid, search, tag chips |
| `/recipe/[id]` | Detail, tags, rating, comments (read-only) |
| `/admin/new` | Add recipe — **Site password** (`ADMIN_PASSWORD`). **Format with AI** needs `GEMINI_API_KEY` on the server. |

---

## Deploy on Netlify

1. Connect the repo in [Netlify](https://www.netlify.com).
2. Under **Site configuration → Environment variables**, add:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark as **secret**)
   - `ADMIN_PASSWORD` (secret)
   - `GEMINI_API_KEY` (secret, optional — **free tier** recipe paste / AI formatting; from [Google AI Studio](https://aistudio.google.com/apikey))

   Use the **same** `ADMIN_PASSWORD` value as in your local `.env`; never commit `.env` or paste secrets into the repo.

3. Deploy. `netlify.toml` is configured for `@sveltejs/adapter-netlify`.

---

## Tech stack

- [SvelteKit 2](https://kit.svelte.dev) + [Svelte 5](https://svelte.dev)
- [Supabase](https://supabase.com) (Postgres, Storage)
- [`@sveltejs/adapter-netlify`](https://github.com/sveltejs/kit/tree/main/packages/adapter-netlify)
- [Fredoka](https://fonts.google.com/specimen/Fredoka) & [Nunito](https://fonts.google.com/specimen/Nunito) — typography matched to the logo vibe
- Custom spoon cursor + scoop animation
