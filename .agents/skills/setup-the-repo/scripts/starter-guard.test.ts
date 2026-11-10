import { describe, expect, it } from "bun:test"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildPlan } from "./plan"
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
		isolatedDeclarations: true,
		declaration: true,
		noEmit: true,
		skipLibCheck: true,
		types: [],
	},
	include: ["index.ts"],
}

/** The repository's own tsc, or null when dependencies are not installed. */
function tscPath(): string | null {
	const path = join(process.cwd(), "node_modules", ".bin", "tsc")
	return existsSync(path) ? path : null
}

/** Compiles one generated starter file the way the generated package would. */
function compileStarter(source: string): { code: number; output: string } {
	const tsc = tscPath()
	if (!tsc) throw new Error("node_modules/.bin/tsc is missing; run `bun install` before the tests.")
	const dir = mkdtempSync(join(tmpdir(), "setup-starter-"))
	try {
		writeFileSync(join(dir, "index.ts"), source)
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

describe("the generated core starter compiles", () => {
	const snapshot = templateSnapshot()

	it("compiles with a normal first term", () => {
		const plan = buildPlan(testAnswers({ archetype: "core" }), snapshot)
		const result = compileStarter(plan.writes["src/index.ts"] ?? "")
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
		const source = plan.writes["src/index.ts"] ?? ""
		expect(source).toContain("Placeholder name")
		const result = compileStarter(source)
		expect(result.output).toBe("")
		expect(result.code).toBe(0)
	})

	it("compiles inside the generated ui-library core package", () => {
		const plan = buildPlan(
			testAnswers({ archetype: "ui-library", enablePublish: false }),
			snapshot,
		)
		const result = compileStarter(plan.writes["packages/core/src/index.ts"] ?? "")
		expect(result.output).toBe("")
		expect(result.code).toBe(0)
	})
})
