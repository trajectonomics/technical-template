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
import { visualAdr } from "./visual-adr"
import { visualCopies } from "./visual-assets"
import { visualStoryTest } from "./visual-e2e"
import {
	svelteRule4Visual,
	VISUAL_BIOME_EXCLUDES,
	VISUAL_GITIGNORE_ADDITIONS,
	VISUAL_README_LINES,
} from "./visual-housekeeping"
import { visualHarness, visualRootScripts } from "./visual-tests"
import { visualWorkflow } from "./visual-workflow"

/** UI component library: private workspace, pure core, Svelte package, optional Storybook. */
export function planUiLibrary(input: PlanInput): Plan {
	const answers = input.answers
	const visual = answers.storybook
	const root = workspaceRoot(input)
	root.scripts = { ...rootScripts(), ...(visual ? visualRootScripts(answers.packageName) : {}) }
	const name = input.name.charAt(0).toLowerCase() + input.name.slice(1)
	const parts = {
		install: `## Installation\n\n\`\`\`bash\nbun add ${answers.packageName}\n\`\`\``,
		usage: `## Getting Started\n\n\`\`\`typescript\nimport { create${input.name} } from "${answers.packageName}"\n\nconst ${name} = create${input.name}({ id: "1", label: "Example" })\nconsole.log(${name})\n\`\`\``,
		extra: uiLibraryExtras(input),
		testCommand: "bun run test",
		...(visual ? { visualLines: VISUAL_README_LINES } : {}),
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
			"biome.json": biomeConfig(visual ? VISUAL_BIOME_EXCLUDES : []),
			".gitignore": visual ? gitignore(input, VISUAL_GITIGNORE_ADDITIONS) : gitignore(input),
			...commonWrites(input, parts, visual ? svelteRule4Visual() : SVELTE_RULE_4),
			...uiLibraryAdrs(input),
			...corePackage(input),
			...sveltePackage(input),
			...(visual ? visualHarness() : {}),
			...(visual ? visualStoryTest(input.name) : {}),
			...(visual ? visualWorkflow() : {}),
			...(visual ? visualAdr() : {}),
			...(visual ? storybookPackage(input) : {}),
		},
		...(visual ? { copies: visualCopies() } : {}),
		deletes,
	}
}
