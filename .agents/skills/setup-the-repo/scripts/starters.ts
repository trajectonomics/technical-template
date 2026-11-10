/** The two starter files a generated repository gets. */
export interface Starter {
	readonly src: string
	readonly test: string
}

export function coreStarter(packageName: string, name: string, placeholder: boolean): Starter {
	const note = placeholder
		? "\n *\n * Placeholder name: `Example` came from a term that cannot be an\n * identifier. Rename it to your first glossary term.\n"
		: ""
	const src = `/**
 * Pure domain model for ${packageName}.
 * Invariant: All domain objects are frozen, deterministic, and free of I/O.${note} */

export enum DomainErrorCode {
	INVALID_ID = "INVALID_ID",
	INVALID_LABEL = "INVALID_LABEL",
}

export class DomainError extends Error {
	readonly code: DomainErrorCode

	constructor(code: DomainErrorCode, message: string) {
		super(\`[\${code}]: \${message}\`)
		this.name = "DomainError"
		this.code = code
	}
}

export interface ${name}Props {
	readonly id: string
	readonly label: string
}

export interface ${name} {
	readonly id: string
	readonly label: string
}

export function create${name}(props: ${name}Props): ${name} {
	const id = props.id.trim()
	if (id.length === 0) {
		throw new DomainError(DomainErrorCode.INVALID_ID, "${name} ID must be non-empty.")
	}
	return Object.freeze({ id, label: props.label.trim() })
}

export function format${name}Label(label: string): string {
	const trimmed = label.trim()
	if (trimmed.length === 0) {
		throw new DomainError(DomainErrorCode.INVALID_LABEL, "${name} label must be non-empty.")
	}
	return trimmed
}
`
	const test = `import { describe, expect, it } from "bun:test"
import { create${name}, DomainError, DomainErrorCode, format${name}Label } from "./index"

describe("create${name}", () => {
	it("creates a frozen ${name} with trimmed properties", () => {
		const ${name.charAt(0).toLowerCase() + name.slice(1)} = create${name}({ id: " id-1 ", label: " Example " })
		expect(${name.charAt(0).toLowerCase() + name.slice(1)}.id).toBe("id-1")
		expect(${name.charAt(0).toLowerCase() + name.slice(1)}.label).toBe("Example")
		expect(Object.isFrozen(${name.charAt(0).toLowerCase() + name.slice(1)})).toBe(true)
	})

	it("rejects an empty id with INVALID_ID", () => {
		const error = capture(() => create${name}({ id: "   ", label: "Test" }))
		expect(error).toBeInstanceOf(DomainError)
		expect((error as DomainError).code).toBe(DomainErrorCode.INVALID_ID)
	})
})

describe("format${name}Label", () => {
	it("trims a label", () => {
		expect(format${name}Label("  Example  ")).toBe("Example")
	})

	it("rejects an empty label with INVALID_LABEL", () => {
		const error = capture(() => format${name}Label("   "))
		expect((error as DomainError).code).toBe(DomainErrorCode.INVALID_LABEL)
	})
})

function capture(run: () => unknown): unknown {
	try {
		run()
		return null
	} catch (error) {
		return error
	}
}
`
	return { src, test }
}

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

export function serviceStarter(packageName: string): Starter {
	const src = `/**
 * Service handler for ${packageName}.
 */

export interface HealthStatus {
	readonly status: "ok" | "degraded"
	readonly service: string
	readonly uptimeSeconds: number
}

export function getHealthStatus(serviceName: string, startTime: number): HealthStatus {
	return Object.freeze({
		status: "ok",
		service: serviceName,
		uptimeSeconds: Math.max(0, Math.floor((Date.now() - startTime) / 1000)),
	})
}

export function handleRequest(urlPath: string, serviceName: string, startTime: number): Response {
	if (urlPath === "/health" || urlPath === "/healthz") {
		const body = JSON.stringify(getHealthStatus(serviceName, startTime))
		return new Response(body, {
			status: 200,
			headers: { "content-type": "application/json" },
		})
	}
	return new Response("Not Found", { status: 404 })
}
`
	const test = `import { describe, expect, it } from "bun:test"
import { type HealthStatus, getHealthStatus, handleRequest } from "./index"

describe("Service Handler", () => {
	it("returns operational health status", () => {
		const health = getHealthStatus("test-service", Date.now())
		expect(health.status).toBe("ok")
		expect(health.service).toBe("test-service")
	})

	it("handles /health route with 200 JSON", async () => {
		const res = handleRequest("/health", "test-service", Date.now())
		expect(res.status).toBe(200)
		const body = (await res.json()) as HealthStatus
		expect(body.service).toBe("test-service")
	})

	it("returns 404 for unknown route", () => {
		expect(handleRequest("/unknown", "test-service", Date.now()).status).toBe(404)
	})
})
`
	return { src, test }
}

export function minimalStarter(packageName: string): Starter {
	const src = `/**
 * Minimal module for ${packageName}.
 */

export function greeting(name: string = "World"): string {
	return \`Hello, \${name.trim()}!\`
}
`
	const test = `import { describe, expect, it } from "bun:test"
import { greeting } from "./index"

describe("greeting", () => {
	it("returns a formatted greeting", () => {
		expect(greeting("Trajectonomics")).toBe("Hello, Trajectonomics!")
		expect(greeting()).toBe("Hello, World!")
	})
})
`
	return { src, test }
}
