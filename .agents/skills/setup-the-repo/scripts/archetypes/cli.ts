import { cliStarter } from "../starters"
import type { Plan, PlanInput } from "../types"
import {
	basePackage,
	commonWrites,
	json,
	singlePackageAdr,
	singlePackageTestTsconfig,
	TEMPLATE_ADR,
} from "./shared"

/** CLI Application: executable bin, private by default. */
export function planCli(input: PlanInput): Plan {
	const answers = input.answers
	const pkg = basePackage(input)
	const binName = answers.packageName.split("/").pop() ?? "cli"
	pkg.bin = { [binName]: "./dist/index.cjs" }
	if (pkg.scripts) {
		pkg.scripts["build"] = "tsdown"
		pkg.scripts["dev"] = "bun run src/index.ts"
		pkg.scripts["test"] = "bun test"
	}
	if (!answers.enablePublish) {
		delete pkg.publishConfig
		pkg.private = true
	}
	const starter = cliStarter(answers.packageName)
	const deletes = [TEMPLATE_ADR]
	if (!answers.enablePublish) deletes.push(".github/workflows/release.yml")

	return {
		writes: {
			...commonWrites(input, {
				install: `## Installation\n\n\`\`\`bash\nbun add -g ${answers.packageName}\n# Or run directly via bunx:\nbunx ${answers.packageName}\n\`\`\``,
				usage: `## CLI Usage\n\n\`\`\`bash\n${binName} --help\n\`\`\``,
			}),
			"package.json": json(pkg),
			"tsconfig.json": runtimeTsconfig(input),
			"tsconfig.test.json": singlePackageTestTsconfig(),
			"src/index.ts": starter.src,
			"src/index.test.ts": starter.test,
			"docs/adr/0001-core-architecture-decisions.md": singlePackageAdr(input),
		},
		deletes,
	}
}

/** Adds the Bun runtime types the CLI and service starters need. */
export function runtimeTsconfig(input: PlanInput): string {
	const raw = input.snapshot.files["tsconfig.json"]
	if (!raw) throw new Error("The template snapshot has no tsconfig.json.")
	const tsconfig = JSON.parse(raw) as {
		extends?: string
		compilerOptions?: Record<string, unknown>
		include?: string[]
		exclude?: string[]
	}
	tsconfig.compilerOptions = { ...tsconfig.compilerOptions, types: ["bun"] }
	return json(tsconfig)
}
