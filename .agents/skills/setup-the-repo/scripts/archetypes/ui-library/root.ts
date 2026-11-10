import type { PackageJson, PlanInput } from "../../types"
import { basePackage, json } from "../shared"

export const SVELTE_RULE_4 =
	"Bun only: `bun install`, `bun run <script>`. Do not add npm/pnpm/yarn lockfiles. " +
	"Svelte packages run Vitest through `bun run test`, so the contributor-facing test entry point stays `bun run test`."

/** The private workspace root package and the root-level config files. */
export function workspaceRoot(input: PlanInput): PackageJson {
	const answers = input.answers
	const root = basePackage(input)
	root.name = `${answers.packageName}-workspace`
	root.description = `Workspace root for ${answers.packageName}. Never published.`
	root.private = true
	root.workspaces = ["packages/*", "apps/*"]
	delete root.main
	delete root.module
	delete root.types
	delete root.exports
	delete root.files
	delete root.publishConfig
	delete root.scripts
	return root
}

export function rootScripts(): Record<string, string> {
	return {
		lint: "biome ci --error-on-warnings . && bun run --filter '*' lint",
		format: "biome check --write . && bun run --filter '*' format:svelte",
		typecheck: "bun run --filter '*' typecheck",
		test: "bun run --filter '*' test",
		build: "bun run --filter '*' build",
		"lint:package": "bun run --filter '*' lint:package",
		check: "bun run lint && bun run typecheck && bun run test && bun run build && bun run lint:package",
		"skills:check": "bunx skills@latest check",
		"skills:update": "bunx skills@latest update",
	}
}

export function biomeConfig(): string {
	return json({
		$schema: "https://biomejs.dev/schemas/2.6.3/schema.json",
		root: true,
		extends: ["@trajectonomics/tooling/configs/web"],
		vcs: { enabled: true, clientKind: "git", useIgnoreFile: true },
		files: {
			includes: [
				"**",
				"!**/dist",
				"!**/coverage",
				"!**/*.md",
				"!**/skills-lock.json",
				"!**/*.svelte",
				"!**/.svelte-kit",
				"!**/.svelte-check",
				"!**/storybook-static",
				"!**/.agents",
				"!**/.claude",
			],
		},
	})
}

export function gitignore(input: PlanInput): string {
	const original = (input.snapshot.files[".gitignore"] ?? "").replace(/\n+$/, "")
	const lines = original.split("\n")
	for (const addition of [".svelte-kit/", ".svelte-check/", "storybook-static/"]) {
		if (!lines.includes(addition)) lines.push(addition)
	}
	return `${lines.filter(Boolean).join("\n")}\n`
}

export function uiLibraryExtras(input: PlanInput): string {
	const answers = input.answers
	const storybookRow = answers.storybook
		? `| \`apps/storybook\` | \`${answers.packageName}-storybook\` | Private Storybook preview |\n`
		: ""
	return `## Packages

| Folder | Package | Responsibility |
| --- | --- | --- |
| \`packages/core\` | \`${answers.packageName}\` | Pure core: deterministic, no I/O |
| \`packages/svelte\` | \`${answers.packageName}-svelte\` | Svelte 5 components |
${storybookRow}
## Releasing

Publishing is off in this scaffold. The shared publish workflow publishes one package from the
repository root and cannot serve a workspace. Until \`trajectonomics/cicd\` ships a multi-package
pipeline, add one release workflow per package; \`trajectonomics/design-system\`'s \`release-*.yml\`
files are the reference.
`
}

/** UI component library: private workspace, pure core, Svelte package, optional Storybook. */
