import { describe, expect, it } from "bun:test"
import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildPlan } from "./plan"
import type { Starter } from "./starters"
import { templateSnapshot, testAnswers } from "./testing"

const TSCONFIG = {
	compilerOptions: {
		target: "ES2022",
		lib: ["ES2022"],
		module: "ESNext",
		moduleResolution: "Bundler",
		strict: true,
		exactOptionalPropertyTypes: true,
		noUncheckedIndexedAccess: true,
		verbatimModuleSyntax: true,
		isolatedModules: true,
		skipLibCheck: true,
		noEmit: true,
		types: ["bun"],
	},
	include: ["index.ts", "index.test.ts"],
}

/** The repository's own tsc, or null when dependencies are not installed. */
function tscPath(): string | null {
	const path = join(process.cwd(), "node_modules", ".bin", "tsc")
	return existsSync(path) ? path : null
}

/** Compiles a generated starter and its test against the template's node_modules. */
function compileStarter(starter: Starter): { code: number; output: string } {
	const tsc = tscPath()
	if (!tsc) throw new Error("node_modules/.bin/tsc is missing; run `bun install` before the tests.")
	const dir = mkdtempSync(join(tmpdir(), "setup-starter-"))
	try {
		symlinkSync(join(process.cwd(), "node_modules"), join(dir, "node_modules"), "dir")
		writeFileSync(join(dir, "index.ts"), starter.src)
		writeFileSync(join(dir, "index.test.ts"), starter.test)
		writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(TSCONFIG))
		const result = Bun.spawnSync({ cmd: [tsc, "-p", join(dir, "tsconfig.json")] })
		return {
			code: result.exitCode ?? 1,
			output: `${result.stdout.toString()}${result.stderr.toString()}`,
		}
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

function starterOf(plan: ReturnType<typeof buildPlan>, src: string, test: string): Starter {
	return { src: plan.writes[src] ?? "", test: plan.writes[test] ?? "" }
}

describe("the generated core starter compiles", () => {
	const snapshot = templateSnapshot()

	it("compiles the starter and its test with a normal first term", () => {
		const plan = buildPlan(testAnswers({ archetype: "core" }), snapshot)
		const result = compileStarter(starterOf(plan, "src/index.ts", "src/index.test.ts"))
		expect(result.output).toBe("")
		expect(result.code).toBe(0)
	})

	it("compiles with the marked placeholder name", () => {
		const plan = buildPlan(
			testAnswers({
				archetype: "core",
				domainTerms: [{ term: "2FA", definition: "A second factor." }],
			}),
			snapshot,
		)
		const starter = starterOf(plan, "src/index.ts", "src/index.test.ts")
		expect(starter.src).toContain("Placeholder name")
		const result = compileStarter(starter)
		expect(result.output).toBe("")
		expect(result.code).toBe(0)
	})

	it("compiles inside the generated ui-library core package", () => {
		const plan = buildPlan(
			testAnswers({ archetype: "ui-library", enablePublish: false }),
			snapshot,
		)
		const result = compileStarter(
			starterOf(plan, "packages/core/src/index.ts", "packages/core/src/index.test.ts"),
		)
		expect(result.output).toBe("")
		expect(result.code).toBe(0)
	})
})
