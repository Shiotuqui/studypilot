# CLAUDE.md — StudyPilot

## What this is
StudyPilot: a study planner (courses, assignments, exams). Midterm for ISM 6427C (FAU). The grader opens the public Netlify URL, so the live site must always work.

## Architecture
- Static site, no build step: `index.html`, `style.css`, `app.js`, `config.js`.
- supabase-js v2 from jsdelivr CDN. Vanilla JS, no framework.
- Supabase table `public.tasks` (see `schema.sql`) with RLS: users only touch rows where `user_id = auth.uid()`.
- Netlify deploys `main` automatically (`netlify.toml`, publish dir `.`).

## Rules
- Only the **publishable** Supabase key may appear in code. Never commit secret/service_role keys or tokens.
- Render user text with `textContent` / DOM nodes, never `innerHTML` (XSS).
- Any schema change goes in `schema.sql` and must keep RLS on.
- Plan first for anything that touches the database or auth; small UI tweaks can go straight in.
- Test sign-up, add, edit, complete and delete on the live URL after each deploy.
