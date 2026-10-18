<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent guide

SVSD is a Next.js (App Router) + React + TypeScript app styled with Tailwind CSS v4.

## Layout

- `src/app/` — routes, `layout.tsx`, `globals.css` (design tokens)
- `src/components/` — shared React components: `ui/` (buttons, inputs, cards) and `radio/` (the sync-calling console), each with a `*.stories.tsx`
- `src/stories/` — Storybook foundations (tokens, type) and full-screen compositions
- `public/fonts/` — self-hosted fonts
- `.claude/skills/` — skills pulled from design-to-code

## Commands

- `npm run dev` — local dev server at http://localhost:3000
- `npm run build` — production build (run before pushing)
- `npm run lint` — ESLint
- `npm run storybook` — component library at http://localhost:6006 (`npm run build-storybook` to check it builds)

## Design library

Design references come from [jhfyj/design-to-code](https://github.com/jhfyj/design-to-code). Follow its `AGENTS.md` to pull things in:

1. Read its `catalog.json` first and pick entries by `description` and `tags`. Don't crawl the folders.
2. **Brand**: copy its `DESIGN.md` to this repo's root and map its values onto the tokens in `src/app/globals.css`. Never ship the brand's logo or paid fonts.
3. **Skill**: copy the whole folder to `.claude/skills/<name>/`.
4. **Font**: copy files to `public/fonts/`, use the `@font-face` block from its README, and check `license`.
5. **Library**: install with the command in the entry and read its "Notes / gotchas".

Pull only what the task needs.

## Conventions

- Use the color, radius and font tokens (`bg-accent`, `text-muted`, `border-border`, `rounded-token`) instead of hardcoded values, so a brand swap only touches `globals.css`.
- Server Components by default; add `"use client"` only where interactivity needs it.
- Import with the `@/` alias (`@/components/...`).
- For new screens, follow `.claude/skills/canvas-first-design`: decide the design before writing project code.
