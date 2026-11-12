import type { Starter } from "./types"

/** The minimal starter: one pure function and its test. */
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
