# Dentra.ph — Task Folder

This folder is the **single source of truth** for all planned work across MVP 1, MVP 2, and MVP 3.
Each markdown file describes one discrete work item: what it is, what "done" looks like, its current status, and which project task in the tracker covers it (if any).

---

## Folder structure

```
tasks/
  README.md          ← you are here
  PAGE_AUDIT.md       ← route inventory, gap summary, priority, and task links
  mvp1/              ← Foundation + Core Dental Operations (overview + numbered tasks)
  mvp2/              ← Complete Clinic Business Operations (overview + numbered tasks)
  mvp3/              ← Ecosystem + Scale (overview + numbered tasks)
```

---

## Status badges

Each task file carries one of these statuses at the top:

| Badge | Meaning |
|-------|---------|
| ✅ **Done** | Merged and live in the main branch |
| 🔵 **Active** | In the project task tracker, accepted or in progress |
| 📋 **Draft** | In the task tracker as a draft (not yet accepted) |
| 🔲 **Queued** | Scoped and ready — no tracker task created yet |
| 🔜 **Future** | MVP 2 or 3 — not started, not yet scoped in detail |

---

## Golden rule — any change needs a task

> **If you want to build, change, or remove anything — even small things — create a project task first.**

This applies to the agent, to you, and to any contributor working in this repo (Replit Agent, Codex, VS Code).

**Why:**
- Prevents two agents working on the same file simultaneously.
- Gives everyone a shared view of what is in flight.
- Keeps the git history meaningful and auditable.
- Avoids "mystery changes" that break dependent work.

**How:**
1. Find the relevant task file in this folder.
2. If no task exists yet, define the work in a new file here.
3. Then open the Replit task panel and create/propose a project task that points to the file.
4. Only start coding once the task is accepted and assigned.

If the work is a bug fix or a one-line correction with no risk of conflict, use your judgment — but when in doubt, file a task.

---

## Existing project task references

| Task ref | Title | Status |
|----------|-------|--------|
| #5 | Database foundation & migration workflow | ✅ Done |
| #9 | Super Admin panel — login, dashboard & navigation | ✅ Done |
| #10 | Clinic & Dentist dashboard variants | ✅ Done |
| #11 | Update README & add Developer setup guide | ✅ Done |
| #6 | Connect Replit PostgreSQL and apply the first migration | ✅ Done |
| #7 | Scaffold the Fastify API server (apps/api) | ✅ Done |
| #8 | Add authentication with Better Auth | ✅ Done |
| #12 | Let Super Admin see and search all clinics from one table | ✅ Done |
| #13 | Replace mock login with real Super Admin session on sign-in | ✅ Done |
