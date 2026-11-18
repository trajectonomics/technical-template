import { cliStarter } from "../starters"
import type { Plan, PlanInput } from "../types"
import {
	basePackage,
	commonWrites,
	json,
	SETUP_VERIFY_WORKFLOW,
	singlePackageAdr,
	singlePackageTestTsconfig,
	TEMPLATE_ADR,
} from "./shared"

/** CLI Application: executable bin, private by default. */
export function planCli(input: PlanInput): Plan {
	const answers = input.answers
	const pkg = basePackage(input)
	const binName = answers.packageName.split("/").pop() ?? "cli"
	pkg.bin = { [binName]: "./dist/bin.cjs" }
	if (pkg.scripts) {
		pkg.scripts["build"] = "tsdown"
		pkg.scripts["dev"] = "bun run src/bin.ts"
		pkg.scripts["test"] = "bun test"
	}
	if (!answers.enablePublish) {
		delete pkg.publishConfig
		pkg.private = true
	}
	const starter = cliStarter(answers.packageName)
	const deletes = [TEMPLATE_ADR, SETUP_VERIFY_WORKFLOW]
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
			"tsdown.config.ts": CLI_BUILD_CONFIG,
			"src/index.ts": starter.src,
			"src/index.test.ts": starter.test,
			...(starter.bin === undefined ? {} : { "src/bin.ts": starter.bin }),
			"docs/adr/0001-core-architecture-decisions.md": singlePackageAdr(input),
		},
		deletes,
	}
}

/** The build configuration a CLI scaffold needs: the library module and its entry. */
const CLI_BUILD_CONFIG = `import { defineConfig } from "tsdown"

export default defineConfig({
	entry: ["src/index.ts", "src/bin.ts"],
	format: ["esm", "cjs"],
	dts: true,
	clean: true,
	sourcemap: true,
})
`

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
