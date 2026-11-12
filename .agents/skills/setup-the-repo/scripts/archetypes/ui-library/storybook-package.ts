import type { PackageJson, PlanInput } from "../../types"
import { json } from "../shared"

/** The private Storybook app files. */
export function storybookPackage(input: PlanInput): Record<string, string> {
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

