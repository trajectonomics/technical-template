import { coreStarter } from "../starters"
import type { Plan, PlanInput } from "../types"
import {
	basePackage,
	commonWrites,
	json,
	singlePackageAdr,
	singlePackageTestTsconfig,
	TEMPLATE_ADR,
} from "./shared"

/** Pure Domain Library: deterministic core, dual ESM/CJS, optional npm publishing. */
export function planCore(input: PlanInput): Plan {
	const answers = input.answers
	const pkg = basePackage(input)
	if (!answers.enablePublish) delete pkg.publishConfig
	if (pkg.scripts) pkg.scripts["test"] = "bun test"
	const starter = coreStarter(answers.packageName, input.name, input.placeholder)
	const deletes = [TEMPLATE_ADR]
	if (!answers.enablePublish) deletes.push(".github/workflows/release.yml")

	return {
		writes: {
			...commonWrites(input, {
				install: `## Installation\n\n\`\`\`bash\nbun add ${answers.packageName}\n\`\`\``,
				usage: `## Getting Started\n\n\`\`\`typescript\nimport { create${input.name} } from "${answers.packageName}"\n\nconst ${input.name.charAt(0).toLowerCase() + input.name.slice(1)} = create${input.name}({ id: "1", label: "Example" })\nconsole.log(${input.name.charAt(0).toLowerCase() + input.name.slice(1)})\n\`\`\``,
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
