import type { Plan, PlanInput } from "../../types"
import { commonWrites, json, TEMPLATE_ADR } from "../shared"
import { uiLibraryAdrs } from "./adrs"
import { corePackage } from "./core-package"
import {
	biomeConfig,
	gitignore,
	rootScripts,
	SVELTE_RULE_4,
	uiLibraryExtras,
	workspaceRoot,
} from "./root"
import { storybookPackage } from "./storybook-package"
import { sveltePackage } from "./svelte-package"

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
