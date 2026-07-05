# CLAUDE.md

@AGENTS.md

Claude Code specifics on top of AGENTS.md:

- **Design work:** this repo is impeccable-initialized. For any UI design/redesign/polish task, use the `/impeccable` skill — it reads `PRODUCT.md` + `DESIGN.md` from this repo root. Register is **product**.
- **Quality gate:** run `npm run typecheck` before declaring a task done. There is no test suite or linter here yet.
- **Environment:** Windows + PowerShell. Backend is the sibling repo `../pajak-simulator-backend` and must be running on :8000 for the app to work; `../dev.ps1` starts both.
- **Branding guardrail (repeat because it matters):** the UI mimics the national tax portal's UX, but never emit the real system's name or logos in UI strings, identifiers, or assets. Use "Sistem Pembelajaran Pajak Online" / "PajakSim".
