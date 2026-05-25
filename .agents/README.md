# `.agents/` — skills and repo guidelines

Editor-agnostic agent material for this repo. **Repo-specific** rules live in `AGENTS.md`. **Supabase, Postgres tuning, and React performance** live in `skills/` so they are not duplicated in `AGENTS.md`.

## Layout

```
.agents/
├── README.md          (this file)
├── AGENTS.md          (invoicing app: architecture, mobile, conventions, tasks)
└── skills/
    ├── supabase/
    │   └── SKILL.md
    ├── supabase-postgres-best-practices/
    │   └── SKILL.md
    └── vercel-react-best-practices/
        ├── SKILL.md
        ├── AGENTS.md
        ├── metadata.json
        └── rules/
```

## What to open

| Need | File |
|------|------|
| Where code lives, pages/hooks/lib layout, Capacitor, Edge Function names, env vars, task checklists | `AGENTS.md` |
| Any Supabase work (auth, RLS, client, migrations, Edge Functions, security) | `skills/supabase/SKILL.md` |
| SQL performance, indexes, pooling, RLS cost | `skills/supabase-postgres-best-practices/SKILL.md` |
| React performance, bundles, re-renders, async patterns | `skills/vercel-react-best-practices/SKILL.md` |

In Cursor, mention the skill (e.g. `@supabase`) when the task matches its description so the right `SKILL.md` is loaded.

## Editors

Copilot / Cursor / other tools that read `.agents/` should treat **`AGENTS.md` + invoked skills** as the full picture — not two parallel copies of the same Supabase or React guidance.

## Adding material

- **App-only** behavior, paths, or workflows → edit `AGENTS.md`.
- **Reusable** Supabase or React performance guidance → extend the corresponding skill under `skills/`, not a second copy in `AGENTS.md`.

## Links

- [VS Code agent skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Cursor skills](https://cursor.com/docs/skills)
- [GitHub Copilot agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
