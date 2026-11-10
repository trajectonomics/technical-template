import { serviceStarter } from "../starters"
import type { Plan, PlanInput } from "../types"
import { runtimeTsconfig } from "./cli"
import {
	basePackage,
	commonWrites,
	json,
	singlePackageAdr,
	singlePackageTestTsconfig,
	TEMPLATE_ADR,
} from "./shared"

/** Backend Service or Worker: private package with Bun runtime types. */
export function planService(input: PlanInput): Plan {
	const answers = input.answers
	const pkg = basePackage(input)
	delete pkg.publishConfig
	pkg.private = true
	if (pkg.scripts) pkg.scripts["test"] = "bun test"
	const starter = serviceStarter(answers.packageName)

	return {
		writes: {
			...commonWrites(input, {
				install: "## Installation & Deployment\n\n```bash\nbun install\nbun run build\n```",
				usage: `## Service Usage\n\n\`\`\`typescript\nimport { handleRequest } from "${answers.packageName}"\n\nconst response = handleRequest("/health", "${answers.packageName}", Date.now())\nconsole.log(response.status)\n\`\`\``,
			}),
			"package.json": json(pkg),
			"tsconfig.json": runtimeTsconfig(input),
			"tsconfig.test.json": singlePackageTestTsconfig(),
			"src/index.ts": starter.src,
			"src/index.test.ts": starter.test,
			"docs/adr/0001-core-architecture-decisions.md": singlePackageAdr(input),
		},
		deletes: [TEMPLATE_ADR, ".github/workflows/release.yml"],
	}
}
