# .gitignore Plan

Add a ready-to-use `.gitignore` file to the project root.

## What will be included

- `node_modules/`, build outputs, and Vite/TanStack Start artifacts (`dist/`, `.output/`, `.vinxi/`)
- Environment variable files (`.env`, `.env.*`, excluding `.env.example` for reference)
- Local development files (`.DS_Store`, `*.log`, `.cache/`)
- IDE/editor files (`.vscode/`, `.idea/`, `*.swp`, `*.swo`)
- Firebase service account keys and local emulator data
- Operating system files (Thumbs.db, etc.)
- Test coverage and temporary directories
- Package manager lockfiles will be kept (not ignored) unless project wants to exclude them

## Deliverable

A single `.gitignore` file in the project root with the full, ready-to-use content.
