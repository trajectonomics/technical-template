import { minimalStarter } from "../starters"
import type { Plan, PlanInput } from "../types"
import {
	basePackage,
	commonWrites,
	json,
	singlePackageAdr,
	singlePackageTestTsconfig,
	TEMPLATE_ADR,
} from "./shared"

/** Minimal TypeScript Library: Bun, Biome and Bun Test only. */
export function planMinimal(input: PlanInput): Plan {
	const answers = input.answers
	const pkg = basePackage(input)
	if (!answers.enablePublish) {
		delete pkg.publishConfig
		pkg.private = true
	}
	if (pkg.scripts) pkg.scripts["test"] = "bun test"
	const starter = minimalStarter(answers.packageName)
	const deletes = [TEMPLATE_ADR]
	if (!answers.enablePublish) deletes.push(".github/workflows/release.yml")

	return {
		writes: {
			...commonWrites(input, {
				install: `## Installation\n\n\`\`\`bash\nbun add ${answers.packageName}\n\`\`\``,
				usage: `## Getting Started\n\n\`\`\`typescript\nimport { greeting } from "${answers.packageName}"\n\nconsole.log(greeting("Trajectonomics"))\n\`\`\``,
			}),
			"package.json": json(pkg),
			"tsconfig.test.json": singlePackageTestTsconfig(),
			"src/index.ts": starter.src,
			"src/index.test.ts": starter.test,
			"docs/adr/0001-core-architecture-decisions.md": singlePackageAdr(input),
		},
		deletes,
	}
}
