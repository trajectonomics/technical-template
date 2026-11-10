import type { PlanInput } from "../../types"

/** The workspace-shape and tooling-split ADRs. */
export function uiLibraryAdrs(input: PlanInput): Record<string, string> {
	const answers = input.answers
	const svelteName = `${answers.packageName}-svelte`
	const storybookRow = answers.storybook
		? `| \`apps/storybook\` | \`${answers.packageName}-storybook\` | Private Storybook preview |\n`
		: ""
	return {
		"docs/adr/0001-workspace-shape.md": `# ADR 0001: Workspace Shape

## Status

Accepted

## Context

\`${answers.repoName}\` is a UI library: a pure core package plus Svelte components. A non-Svelte
consumer must be able to install the core alone, and the shared publish workflow publishes exactly
one package from the repository root, so a single flat package would force every consumer to take
every layer.

## Decision

The repository root is a private, unpublished Bun workspace over \`packages/*\` and \`apps/*\`.

| Folder            | Package                | Responsibility                     |
| ----------------- | ---------------------- | ---------------------------------- |
| \`packages/core\`   | \`${answers.packageName}\` | Pure core: deterministic, no I/O    |
| \`packages/svelte\` | \`${svelteName}\` | Svelte 5 components and logic      |
${storybookRow}
The Svelte package depends on the core package. Nothing depends on Svelte. The root package is never
published.

Publishing is off in this scaffold: the shared \`trajectonomics/cicd\` publish workflow publishes one
package from the repository root and cannot serve a workspace. Add one release workflow per package
when releasing is needed; \`trajectonomics/design-system\`'s \`release-*.yml\` files are the reference
until the shared multi-package pipeline lands.

## Consequences

- A non-Svelte consumer installs only \`${answers.packageName}\`.
- Every package needs its own Trusted Publisher entry and release workflow before it can publish.
- \`bun run check\` runs every package on every pull request, so cross-package breakage fails before merge.
`,
		"docs/adr/0002-tooling-split.md": `# ADR 0002: TypeScript, Lint and Test Tooling

## Status

Accepted

## Context

The shared tooling is strict: Biome as the universal linter, TypeScript 7, and \`bun test\` for pure
packages. A Svelte package breaks three assumptions: the Svelte tooling supports TypeScript 5 and 6
only, Biome cannot parse \`.svelte\` markup, and \`bun test\` has no Svelte compile step.

## Decision

- **TypeScript split.** The root and the core package stay on TypeScript 7. The Svelte package and
  the Storybook app pin TypeScript 6 locally because their tooling does not support 7 yet.
  \`tsconfig.base.json\` is not loosened.
- **Lint split.** Biome covers every \`.ts\` and \`.svelte.ts\` file. \`.svelte\` files are excluded from
  Biome and covered by \`svelte-check\` with warnings as errors plus Prettier with the Svelte plugin.
  Logic lives in \`.svelte.ts\`; markup lives in \`.svelte\`. No Biome rule is loosened.
- **Test runners.** The core keeps \`bun test\`. The Svelte package uses Vitest with Testing Library,
  started through \`bun run test\`, so the contributor-facing entry point stays the same.
- **Source resolution.** The Svelte package type-checks against the core source through TypeScript
  \`paths\` and a Vite alias, not the built \`dist\`, so typecheck passes before any build.
- **Package lint.** The Svelte package runs \`attw\` with the \`esm-only\` profile and ignores only
  \`internal-resolution-error\`, because generated declarations import \`.svelte\` files that Node16
  resolution cannot resolve without the Svelte toolchain.

## Consequences

- Two TypeScript versions coexist in the workspace. Package-level pins keep the split contained.
- Two test runners coexist. Root \`bun run test\` delegates per package.
- Formatting is split: Biome for TypeScript, Prettier for \`.svelte\` markup.
`,
	}
}

