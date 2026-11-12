import type { Starter } from "./types"

/** The CLI starter: argv parsing, help, version and one command. */
export function cliStarter(packageName: string): Starter {
	const binName = packageName.split("/").pop() ?? "cli"
	const src = `#!/usr/bin/env node
/**
 * CLI entrypoint for ${packageName}.
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

if (import.meta.main) {
	process.exit(runCli(process.argv.slice(2)))
}
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
})
`
	return { src, test }
}
