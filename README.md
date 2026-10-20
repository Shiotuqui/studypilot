# 🧭 StudyPilot

Plan your semester: track assignments, exams, projects and readings across all your courses, with deadlines sorted by urgency.

Midterm project for **ISM 6427C — Business Innovation with AI** (FAU), built with AI agents following *The Cognition Economy*, Chapters 0–8.

## Stack

| Layer | Tool | Role |
|---|---|---|
| Builder | **Claude Code** (agent) | Planned, wrote, reviewed and shipped the code |
| Code | **GitHub** | Source of truth; every push triggers a deploy |
| Data + Auth | **Supabase** | Postgres table `tasks`, email/password login, Row Level Security |
| Hosting | **Netlify** | Static hosting, auto-deploy from `main` |

## Features

- Email/password accounts (Supabase Auth) — each user sees only their own data (RLS)
- Add, edit, complete and delete tasks (course, type, due date, priority, notes)
- Dashboard: due in 7 days, overdue, open tasks, % completed
- Grouped flight plan: Overdue → Today → This week → This month → Later
- Filters by status and course; light/dark mode; mobile friendly

## Setup

1. In Supabase → **SQL Editor**, run [`schema.sql`](schema.sql).
2. Put the project URL and **publishable** key in [`config.js`](config.js) (never the secret key).
3. On Netlify: **Add new project → Import from Git → this repo**. No build command; publish directory `.`.
4. In Supabase → **Authentication → URL Configuration**, set the Site URL to the Netlify URL.

## How agents were used (book concepts)

- **Plan Mode (Ch. 6):** scope, data model and security were planned and approved before any code.
- **Page-and-prompt (Ch. 1):** the agent built from the official Supabase/Netlify docs and the course setup guides.
- **MCP / connectors (Ch. 3):** GitHub, Supabase and Netlify are wired to Claude.
- **Memory (Ch. 7):** `CLAUDE.md` gives every future agent session the project context.
- **Sub-agents:** a separate reviewer agent audited the code for bugs and security before launch.
