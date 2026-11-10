import { toKebabCase } from "../../terms"
import type { PackageJson, PlanInput } from "../../types"
import { json } from "../shared"

/** The Svelte package files: component, logic, tests and tooling config. */
export function sveltePackage(input: PlanInput): Record<string, string> {
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

