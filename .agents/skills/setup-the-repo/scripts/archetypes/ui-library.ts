import { coreStarter } from "../starters"
import { toKebabCase } from "../terms"
import type { PackageJson, Plan, PlanInput } from "../types"
import { basePackage, commonWrites, json, TEMPLATE_ADR } from "./shared"

const SVELTE_RULE_4 =
	"Bun only: `bun install`, `bun run <script>`. Do not add npm/pnpm/yarn lockfiles. " +
	"Svelte packages run Vitest through `bun run test`, so the contributor-facing test entry point stays `bun run test`."

/** The engine and package-manager fields every generated package keeps. */
function workspaceRoot(input: PlanInput): PackageJson {
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

function rootScripts(): Record<string, string> {
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

function biomeConfig(): string {
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

function gitignore(input: PlanInput): string {
	const original = (input.snapshot.files[".gitignore"] ?? "").replace(/\n+$/, "")
	const lines = original.split("\n")
	for (const addition of [".svelte-kit/", ".svelte-check/", "storybook-static/"]) {
		if (!lines.includes(addition)) lines.push(addition)
	}
	return `${lines.filter(Boolean).join("\n")}\n`
}

function corePackage(input: PlanInput): Record<string, string> {
	const answers = input.answers
	const starter = coreStarter(answers.packageName, input.name, input.placeholder)
	const pkg: PackageJson = {
		name: answers.packageName,
		version: "0.0.0-development",
		description: answers.description,
		license: "MIT",
		repository: {
			type: "git",
			url: `git+https://github.com/${answers.repoName}.git`,
			directory: "packages/core",
		},
		type: "module",
		sideEffects: false,
		engines: { node: ">=20.0.0" },
		main: "./dist/index.cjs",
		module: "./dist/index.mjs",
		types: "./dist/index.d.cts",
		exports: {
			".": {
				import: { types: "./dist/index.d.mts", default: "./dist/index.mjs" },
				require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
			},
			"./package.json": "./package.json",
		},
		files: ["dist"],
		publishConfig: { access: "public", provenance: true, tag: "latest" },
		scripts: {
			build: "tsdown",
			test: "bun test",
			typecheck: "tsc -p tsconfig.json && tsc -p tsconfig.test.json",
			lint: "biome ci --error-on-warnings .",
			"lint:package": "publint --strict && attw --pack . --profile node16",
		},
		devDependencies: { "@types/bun": "^1.4.4", typescript: "^7.0.2" },
	}
	return {
		"packages/core/package.json": json(pkg),
		"packages/core/tsconfig.json": json({
			extends: "../../tsconfig.base.json",
			compilerOptions: { lib: ["ES2022"], types: [] },
			include: ["src"],
			exclude: ["src/**/*.test.ts"],
		}),
		"packages/core/tsconfig.test.json": json({
			extends: "../../tsconfig.base.json",
			compilerOptions: { lib: ["ES2022"], types: ["bun"], isolatedDeclarations: false },
			include: ["src"],
		}),
		"packages/core/tsdown.config.ts": `import { defineConfig } from "tsdown"

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	sourcemap: true,
})
`,
		"packages/core/src/index.ts": starter.src,
		"packages/core/src/index.test.ts": starter.test,
	}
}

function sveltePackage(input: PlanInput): Record<string, string> {
	const answers = input.answers
	const svelteName = `${answers.packageName}-svelte`
	const kebab = toKebabCase(input.name)
	const dir = `packages/svelte/src/${kebab}`
	const aliasFind = answers.packageName.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
	const pkg: PackageJson = {
		name: svelteName,
		version: "0.0.0-development",
		description: `${answers.description} — Svelte components`,
		license: "MIT",
		repository: {
			type: "git",
			url: `git+https://github.com/${answers.repoName}.git`,
			directory: "packages/svelte",
		},
		type: "module",
		sideEffects: false,
		engines: { node: ">=20.0.0" },
		main: "./dist/index.js",
		module: "./dist/index.js",
		types: "./dist/index.d.ts",
		svelte: "./dist/index.js",
		exports: {
			".": {
				types: "./dist/index.d.ts",
				svelte: "./dist/index.js",
				default: "./dist/index.js",
			},
			"./package.json": "./package.json",
		},
		files: ["dist"],
		publishConfig: { access: "public", provenance: true, tag: "latest" },
		scripts: {
			build: "svelte-package -i src -o dist",
			test: "vitest run",
			"format:svelte":
				'prettier --plugin prettier-plugin-svelte --write --no-error-on-unmatched-pattern "src/**/*.svelte" "tests/**/*.svelte"',
			typecheck: "svelte-check --tsconfig ./tsconfig.json --fail-on-warnings",
			lint: 'biome ci --error-on-warnings . && prettier --plugin prettier-plugin-svelte --check --no-error-on-unmatched-pattern "src/**/*.svelte" "tests/**/*.svelte"',
			"lint:package":
				"publint --strict && attw --pack . --profile esm-only --ignore-rules internal-resolution-error",
		},
		dependencies: { [answers.packageName]: "workspace:*" },
		devDependencies: {
			"@sveltejs/package": "^3.0.2",
			"@sveltejs/vite-plugin-svelte": "^7.3.1",
			"@testing-library/jest-dom": "^7.0.1",
			"@testing-library/svelte": "^5.4.2",
			"@types/bun": "^1.4.4",
			jsdom: "^31.0.0",
			prettier: "^3.9.10",
			"prettier-plugin-svelte": "^4.1.1",
			svelte: "^5.57.3",
			"svelte-check": "^4.7.8",
			typescript: "~6.0.3",
			vite: "^8.3.6",
			vitest: "^5.1.0",
		},
	}
	return {
		"packages/svelte/package.json": json(pkg),
		"packages/svelte/svelte.config.js": `import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

export default {
	preprocess: vitePreprocess(),
}
`,
		"packages/svelte/.prettierrc.json": json({
			plugins: ["prettier-plugin-svelte"],
			useTabs: true,
			printWidth: 100,
			singleQuote: false,
			semi: false,
			trailingComma: "all",
		}),
		"packages/svelte/tsconfig.json": json({
			extends: "../../tsconfig.base.json",
			compilerOptions: {
				lib: ["ES2022", "DOM", "DOM.Iterable"],
				types: ["bun"],
				paths: { [answers.packageName]: ["../core/src/index.ts"] },
			},
			include: [
				"src/**/*.ts",
				"src/**/*.svelte",
				"src/**/*.svelte.ts",
				"tests/**/*.ts",
				"vitest-setup.ts",
				"vite.config.ts",
			],
		}),
		"packages/svelte/vite.config.ts": `import { svelte } from "@sveltejs/vite-plugin-svelte"
import { svelteTesting } from "@testing-library/svelte/vite"
import type { UserConfig } from "vite"
import { defineConfig } from "vitest/config"

const source = (path: string): string => new URL(path, import.meta.url).pathname

const config: UserConfig = defineConfig({
	plugins: [svelte(), svelteTesting()],
	resolve: {
		alias: [{ find: /^${aliasFind}$/, replacement: source("../core/src/index.ts") }],
	},
	test: {
		environment: "jsdom",
		setupFiles: ["./vitest-setup.ts"],
		include: ["tests/**/*.test.ts"],
	},
})

export default config
`,
		"packages/svelte/vitest-setup.ts": `import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/svelte"
import { afterEach } from "vitest"

afterEach(() => {
	cleanup()
})
`,
		"packages/svelte/src/index.ts": `export { ${input.name}, type ${input.name}Props } from "./${kebab}/index.js"
`,
		[`${dir}/index.ts`]: `import Root from "./${kebab}.svelte"
import { type ${input.name}Props, displayLabel } from "./${kebab}.svelte.js"

export { type ${input.name}Props, displayLabel, Root, Root as ${input.name} }
`,
		[`${dir}/${kebab}.svelte.ts`]: `import { format${input.name}Label } from "${answers.packageName}"

/** Props for \`${input.name}\`. */
export interface ${input.name}Props {
	readonly label: string
}

/** The text \`${input.name}\` renders: the label, trimmed through the core package. */
export function displayLabel(props: ${input.name}Props): string {
	return format${input.name}Label(props.label)
}
`,
		[`${dir}/${kebab}.svelte`]: `<script lang="ts" module>
	import type { ${input.name}Props as BaseProps } from "./${kebab}.svelte.js"

	// svelte2tsx drops imported types used only by $props(), so the public props
	// type is re-declared here to keep the generated .d.ts valid for consumers.
	/** Props for \`${input.name}\`. */
	export interface ${input.name}Props extends BaseProps {}
</script>

<script lang="ts">
	import { displayLabel } from "./${kebab}.svelte.js"

	let { label }: ${input.name}Props = $props()
</script>

<span class="${kebab}">{displayLabel({ label })}</span>

<style>
	.${kebab} {
		display: inline-block;
		font: inherit;
	}
</style>
`,
		[`packages/svelte/tests/${kebab}.test.ts`]: `import { render, screen } from "@testing-library/svelte"
import { describe, expect, it } from "vitest"
import ${input.name} from "../src/${kebab}/${kebab}.svelte"

describe("${input.name}", () => {
	it("renders the label trimmed by the core package", () => {
		render(${input.name}, { props: { label: "  Verified  " } })
		expect(screen.getByText("Verified")).toBeInTheDocument()
	})
})
`,
	}
}

function storybookPackage(input: PlanInput): Record<string, string> {
	const answers = input.answers
	const svelteName = `${answers.packageName}-svelte`
	const pkg: PackageJson = {
		name: `${answers.packageName}-storybook`,
		version: "0.0.0-development",
		private: true,
		type: "module",
		scripts: {
			build: "storybook build",
			dev: "storybook dev -p 6006",
			typecheck: "svelte-check --tsconfig ./tsconfig.json --fail-on-warnings",
			"format:svelte":
				'prettier --plugin prettier-plugin-svelte --write --no-error-on-unmatched-pattern "src/**/*.svelte"',
			lint: 'biome ci --error-on-warnings . && prettier --plugin prettier-plugin-svelte --check --no-error-on-unmatched-pattern "src/**/*.svelte"',
		},
		dependencies: { [answers.packageName]: "workspace:*", [svelteName]: "workspace:*" },
		devDependencies: {
			"@storybook/addon-a11y": "^10.6.6",
			"@storybook/svelte-vite": "^10.6.6",
			"@sveltejs/vite-plugin-svelte": "^7.3.1",
			"@types/bun": "^1.4.4",
			prettier: "^3.9.10",
			"prettier-plugin-svelte": "^4.1.1",
			storybook: "^10.6.6",
			svelte: "^5.57.3",
			"svelte-check": "^4.7.8",
			typescript: "~6.0.3",
			vite: "^8.3.6",
		},
	}
	return {
		"apps/storybook/package.json": json(pkg),
		"apps/storybook/svelte.config.js": `import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

export default {
	preprocess: vitePreprocess(),
}
`,
		"apps/storybook/.prettierrc.json": json({
			plugins: ["prettier-plugin-svelte"],
			useTabs: true,
			printWidth: 100,
			singleQuote: false,
			semi: false,
			trailingComma: "all",
		}),
		"apps/storybook/tsconfig.json": json({
			extends: "../../tsconfig.base.json",
			compilerOptions: {
				lib: ["ES2022", "DOM", "DOM.Iterable"],
				types: ["vite/client"],
				paths: {
					[answers.packageName]: ["../../packages/core/src/index.ts"],
					[svelteName]: ["../../packages/svelte/src/index.ts"],
				},
			},
			include: [".storybook/**/*.ts", "src/**/*.ts", "src/**/*.svelte"],
		}),
		"apps/storybook/.storybook/main.ts": `import type { StorybookConfig } from "@storybook/svelte-vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.ts"],
	addons: ["@storybook/addon-a11y"],
	framework: {
		name: "@storybook/svelte-vite",
		options: {},
	},
	viteFinal: async (viteConfig) => {
		viteConfig.plugins = [svelte(), ...(viteConfig.plugins ?? [])]
		return viteConfig
	},
}

export default config
`,
		"apps/storybook/.storybook/preview.ts": `import type { Preview } from "@storybook/svelte-vite"

const preview: Preview = {
	parameters: {
		layout: "centered",
		a11y: { test: "error" },
	},
}

export default preview
`,
		[`apps/storybook/src/${input.name}Story.svelte`]: `<script lang="ts" module>
	export interface ${input.name}StoryProps {
		readonly label?: string
	}
</script>

<script lang="ts">
	import { ${input.name} } from "${svelteName}"

	let { label = "${input.name}" }: ${input.name}StoryProps = $props()
</script>

<${input.name} {label} />
`,
		[`apps/storybook/src/${input.name}.stories.ts`]: `import type { Meta, StoryObj } from "@storybook/svelte-vite"
import ${input.name}Story from "./${input.name}Story.svelte"

const meta: Meta<typeof ${input.name}Story> = {
	title: "Components/${input.name}",
	component: ${input.name}Story,
	argTypes: {
		label: { control: "text" },
	},
}

export default meta

type Story = StoryObj<typeof ${input.name}Story>

export const Default: Story = {
	args: { label: "${input.name}" },
}
`,
	}
}

function uiLibraryAdrs(input: PlanInput): Record<string, string> {
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

function uiLibraryExtras(input: PlanInput): string {
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
export function planUiLibrary(input: PlanInput): Plan {
	const answers = input.answers
	const root = workspaceRoot(input)
	root.scripts = rootScripts()
	const name = input.name.charAt(0).toLowerCase() + input.name.slice(1)
	const parts = {
		install: `## Installation\n\n\`\`\`bash\nbun add ${answers.packageName}\n\`\`\``,
		usage: `## Getting Started\n\n\`\`\`typescript\nimport { create${input.name} } from "${answers.packageName}"\n\nconst ${name} = create${input.name}({ id: "1", label: "Example" })\nconsole.log(${name})\n\`\`\``,
		extra: uiLibraryExtras(input),
		testCommand: "bun run test",
	}
	const deletes = [
		TEMPLATE_ADR,
		".github/workflows/release.yml",
		"src/index.ts",
		"src/index.test.ts",
		"tsdown.config.ts",
		"tsconfig.json",
		"tsconfig.test.json",
		"scripts/version.ts",
		"scripts/version.test.ts",
	]

	return {
		writes: {
			"package.json": json(root),
			"tsconfig.base.json": json({
				extends: "@trajectonomics/tooling/tsconfig/web.json",
			}),
			"biome.json": biomeConfig(),
			".gitignore": gitignore(input),
			...commonWrites(input, parts, SVELTE_RULE_4),
			...uiLibraryAdrs(input),
			...corePackage(input),
			...sveltePackage(input),
			...(answers.storybook ? storybookPackage(input) : {}),
		},
		deletes,
	}
}
