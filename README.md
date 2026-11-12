# @trajectonomics/technical-template

The official starter repository template for technical packages, libraries, and services across [Trajectonomics](https://github.com/trajectonomics).

## Highlights

- **Interactive Repo Setup**: Includes the single-use `/setup-the-repo` skill (or `bun run setup`) that interactively customizes package metadata, README, GLOSSARY, CI workflows, and starter code for your archetype — Pure Domain Library, CLI Tool, Service/Worker, Minimal Library, or a UI Component Library (Bun workspace with a pure core, Svelte 5 components and optional Storybook). A project that fits none of them is an agent-protocol answer (`Other`), not a forced choice. The skill self-destructs to leave a clean repo, and prompts setting up Matt Pocock's skills.
- **AI Agent Skills Ready**: Bundled with [Matt Pocock's skills](https://github.com/mattpocock/skills) (`ask-matt`, `tdd`, `implement`, `wayfinder`, `code-review`, etc.) and Trajectonomics [internal skills](https://github.com/trajectonomics/internal-skills) (`pick-the-issue`) managed via `skills-lock.json`. Compatible with Claude Code, Codex, OpenCode, Antigravity CLI, and Pi.
- **Bun First**: Built on [Bun](https://bun.sh) (`1.4.4`) for blazing fast testing, installs, and script execution.
- **Dual ESM + CJS Output**: Powered by [`tsdown`](https://github.com/sxzz/tsdown) with full `.d.ts` and `.d.mts` declaration generation.
- **Strict Verification Pipeline**: Biome linting and formatting (with strict file line ceilings and cognitive complexity limits), strict TypeScript compilation with `isolatedDeclarations`, tests via `bun test`, plus package export verification via [`publint`](https://publint.dev) and [`@arethetypeswrong/cli`](https://github.com/arethetypeswrong/arethetypeswrong).
- **Automated Semver & Releases**: Git-tag-driven version computation (`scripts/version.ts`), automated conventional commit PR title validation, and GitHub Actions publishing workflow.
- **The Whole CI Contract**: A new repository starts current, not with a copy of the rules. `.github/workflows/` carries all three shared callers — `ci.yml`, `pr-title.yml` and `drift.yml` — each a few lines calling a reusable workflow in [`trajectonomics/cicd`](https://github.com/trajectonomics/cicd) at `v1`. The third one is a weekly drift check that opens one issue when the `@trajectonomics/tooling` pin falls behind `latest` or the Biome config keeps rules of its own.
- **Domain Modeling & ADRs**: Pre-structured `GLOSSARY.md`, Architecture Decision Records (`docs/adr/`), and agent operational guides (`docs/agents/`).

---

## Quick Start

### 1. Create a Repository from this Template

Using GitHub CLI:
```bash
gh repo create trajectonomics/<new-repo-name> \
  --template trajectonomics/technical-template \
  --public \
  --clone
```

Or click **"Use this template"** on GitHub at [trajectonomics/technical-template](https://github.com/trajectonomics/technical-template).

### 2. Run Interactive Setup

Inside your newly cloned repository, run the interactive setup wizard:

```bash
bun install
bun run setup
```

*Or within an AI agent session (Claude Code, Antigravity, OpenCode, etc.):*
```
/setup-the-repo
```

The interactive wizard will:
1. Ask you for your repository coordinates, project description, archetype (Pure Domain Library, CLI Tool, Service/Worker, Minimal Library, UI Component Library, or Other), domain terms, and whether to enable publishing (UI Component Library ships with publishing off).
2. Customize `package.json`, `README.md`, `GLOSSARY.md`, `AGENTS.md`, `CODING_STANDARDS.md`, `docs/adr/`, and the starter code (for `ui-library`, a Bun workspace under `packages/` and `apps/`).
3. Check first, move off `main` onto `feat/bootstrap`, then verify your new repository via `bun run check`.
4. **Self-destruct**: automatically delete the single-use `setup-the-repo` bootstrap skill so your repository stays clean.
5. Remind you to push the branch and open a pull request, then run `/setup-matt-pocock-skills` to wire up GitHub Issues and triage labels!

If your project fits none of the Archetypes, choose **Other**. The script says plainly that it cannot scaffold an arbitrary description and points you to the agent protocol: run `/setup-the-repo` with an agent, describe the project, and the agent maps it to the nearest Archetype, shows you what it will adapt, runs the script with `--no-commit`, then commits once after adapting.

### 3. Scripted Setup

```bash
bun .agents/skills/setup-the-repo/scripts/setup.ts \
  --name "trajectonomics/my-project" \
  --pkg "@trajectonomics/my-project" \
  --description "Deterministic projection engine" \
  --archetype core \
  --term "Invoice=A bill sent to a customer" \
  --term "Tax Rate=A percentage of the amount" \
  --co-author "Agent Name <agent@example.com>"
```

Flags:

| Flag | Meaning |
| --- | --- |
| `--archetype core\|cli\|service\|minimal\|ui-library` | Project shape. An unknown value is an error that names the valid values. |
| `--storybook true\|false` | `ui-library` only; default `true`. `false` drops the preview app. |
| `--term "Name=Definition"` | Repeatable domain term. With none, `GLOSSARY.md` gets no invented placeholder. |
| `--publish true\|false` | Default `true` for `core`, `false` otherwise. `ui-library` is always off and `--publish true` is an error. |
| `--non-interactive` | Never prompt. Combine with the flags above. |
| `--no-commit` | Switch off `main` but leave the commit to the caller; useful for the agent protocol. |
| `--co-author "Name <email>"` | Repeatable `Co-Authored-By:` trailer for the bootstrap commit. |
| `--force` | Allow running on the template repository itself (testing only). |

Setup checks that it can proceed before changing anything. On `main` or `master` it switches to `feat/bootstrap`; a detached HEAD scaffolds without committing; a failed commit is reported instead of swallowed.

---

## Available Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `bun run setup` | `bun .agents/skills/setup-the-repo/scripts/setup.ts` | Interactive repository bootstrap wizard |
| `bun run verify:setup` | `bun .agents/skills/setup-the-repo/scripts/verify.ts` | Scaffold every Archetype in a throwaway directory and run its checks (needs network, not part of CI) |
| `bun run check` | Lint + Typecheck + Test + Build + Package Lint | Full CI verification pass |
| `bun run test` | `bun test ./src ./scripts ./.agents/skills/setup-the-repo/scripts` | Run test suite with Bun test runner, including the setup logic |
| `bun run typecheck` | `tsc -p tsconfig.json && tsc -p tsconfig.test.json` | Strict TypeScript typecheck |
| `bun run lint` | `biome ci --error-on-warnings .` | Check formatting and lint rules |
| `bun run format` | `biome check --write .` | Auto-format files and organize imports |
| `bun run build` | `tsdown` | Compile dual ESM/CJS build into `dist/` |
| `bun run lint:package`| `publint --strict && attw --pack . --profile node16` | Validate package exports & types |
| `bun run skills:check`| `bunx skills@latest check` | Verify installed agent skills against lockfile |
| `bun run skills:update`| `bunx skills@latest update` | Update installed skills to latest versions |

---

## Skills Architecture

Skills are pinned in `skills-lock.json`:
- Canonical skill files live in `.agents/skills/`.
- Claude Code symlinks live in `.claude/skills/`.
- Managed using the Vercel `skills` CLI:
  ```bash
  # Check skills status
  bun run skills:check

  # Update pinned skills
  bun run skills:update
  ```

---

## License

[MIT](./LICENSE)
