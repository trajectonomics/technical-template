import { describe, expect, it } from "bun:test"
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { buildPlan } from "./plan"
import { templateSnapshot, testAnswers } from "./testing"

/** Clock and randomness calls, with no other lint finding for Biome to report. */
const NONDETERMINISTIC = `export function timestamp(): number {
	return Date.now()
}

export function share(): number {
	return Math.random()
}
`

/** The repository's own Biome binary, or null when dependencies are not installed. */
function biomePath(): string | null {
	const path = join(process.cwd(), "node_modules", ".bin", "biome")
	return existsSync(path) ? path : null
}

/**
 * Lints fixture files in an external directory, under `config`, with the template's
 * `node_modules` symlinked in. Formatting is off: the test is about the lint rules.
 */
function lint(config: string, files: Record<string, string>): { code: number; output: string } {
	const biome = biomePath()
	if (!biome) throw new Error("node_modules/.bin/biome is missing; run `bun install` first.")
	const dir = mkdtempSync(join(tmpdir(), "setup-biome-"))
	try {
		symlinkSync(join(process.cwd(), "node_modules"), join(dir, "node_modules"), "dir")
		for (const [path, content] of Object.entries(files)) {
			mkdirSync(dirname(join(dir, path)), { recursive: true })
			writeFileSync(join(dir, path), content)
		}
		writeFileSync(join(dir, "biome.json"), config)
		const result = Bun.spawnSync({
			cmd: [biome, "ci", "--formatter-enabled=false", "--vcs-enabled=false", ...Object.keys(files)],
			cwd: dir,
			timeout: 120_000,
		})
		return {
			code: result.exitCode ?? 1,
			output: `${result.stdout.toString()}${result.stderr.toString()}`,
		}
	} finally {
		rmSync(dir, { recursive: true, force: true })
	}
}

/** The Biome config a generated core repository writes. */
function coreConfig(): string {
	const plan = buildPlan(testAnswers({ archetype: "core" }), templateSnapshot())
	return plan.writes["biome.json"] ?? ""
}

/** The generated core starter, as the plan writes it. */
function coreStarterFiles(): Record<string, string> {
	const plan = buildPlan(testAnswers({ archetype: "core" }), templateSnapshot())
	return {
		"src/index.ts": plan.writes["src/index.ts"] ?? "",
		"src/index.test.ts": plan.writes["src/index.test.ts"] ?? "",
	}
}

describe("the generated core repository's Biome config", () => {
	it("keeps the core starter lint-clean", () => {
		const result = lint(coreConfig(), coreStarterFiles())
		expect(result.output).not.toContain("Nondeterministic API")
		expect(result.code).toBe(0)
	})

	it("rejects Date.now and Math.random with the nondeterminism rule", () => {
		const result = lint(coreConfig(), { "src/nondeterministic.ts": NONDETERMINISTIC })
		expect(result.output).toContain("Nondeterministic API")
		expect(result.code).toBe(1)
	})

	it("accepts them under the template's base preset, the defect this fixes", () => {
		const base = readFileSync(join(process.cwd(), "biome.json"), "utf8")
		const result = lint(base, { "src/nondeterministic.ts": NONDETERMINISTIC })
		expect(result.code).toBe(0)
	})
})
