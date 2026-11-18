import type { Starter } from "./types"

/** The CLI starter: argv parsing, help, version and one command. */
export function cliStarter(packageName: string): Starter {
	const binName = packageName.split("/").pop() ?? "cli"
	const src = `/**
 * Command-line interface for ${packageName}.
 */

export interface ParsedCliArgs {
	readonly help: boolean
	readonly version: boolean
	readonly command: string | undefined
}

export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
	const help = argv.includes("--help") || argv.includes("-h")
	const version = argv.includes("--version") || argv.includes("-v")
	const command = argv.find((arg) => !arg.startsWith("-"))
	return Object.freeze({ help, version, command })
}

export function runCli(argv: readonly string[]): number {
	const args = parseCliArgs(argv)
	if (args.version) {
		console.log("0.0.0-development")
		return 0
	}
	if (args.help || !args.command) {
		console.log("Usage: ${binName} [command] [options]")
		console.log("\\nCommands:\\n  run            Execute command\\n\\nOptions:\\n  -h, --help     Show help\\n  -v, --version  Show version")
		return 0
	}
	console.log(\`Executed: \${args.command}\`)
	return 0
}
`
	const bin = `#!/usr/bin/env node
/**
 * Executable entry for ${packageName}: the process owns the exit code, the
 * library module only parses arguments.
 */
import { runCli } from "./index"

process.exit(runCli(process.argv.slice(2)))
`
	const test = `import { describe, expect, it } from "bun:test"
import { parseCliArgs, runCli } from "./index"

describe("CLI Parser", () => {
	it("parses --help and -h flags", () => {
		expect(parseCliArgs(["--help"]).help).toBe(true)
		expect(parseCliArgs(["-h"]).help).toBe(true)
	})

	it("parses --version and -v flags", () => {
		expect(parseCliArgs(["--version"]).version).toBe(true)
		expect(parseCliArgs(["-v"]).version).toBe(true)
	})

	it("executes CLI with 0 exit code", () => {
		expect(runCli(["--version"])).toBe(0)
		expect(runCli(["--help"])).toBe(0)
	})

	it("prints help from the executable entry", () => {
		const result = Bun.spawnSync({
			cmd: [process.execPath, import.meta.dir + "/bin.ts", "--help"],
			timeout: 20_000,
			stdout: "pipe",
			stderr: "pipe",
		})
		expect(result.exitCode).toBe(0)
		expect(result.stdout.toString()).toContain("Usage: ${binName} [command] [options]")
	})
})
`
	return { src, test, bin }
}
