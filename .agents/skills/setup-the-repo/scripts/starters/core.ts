import type { Starter } from "./types"

/** The pure core starter, named from the first glossary term. */
export function coreStarter(packageName: string, name: string, placeholder: boolean): Starter {
	const note = placeholder
		? "\n *\n * Placeholder name: `Example` came from a term that cannot be an\n * identifier. Rename it to your first glossary term.\n"
		: ""
	const src = `/**
 * Pure domain model for ${packageName}.
 * Invariant: All domain objects are frozen, deterministic, and free of I/O.${note} */

/** One code per rule that can reject input. */
export enum DomainErrorCode {
	INVALID_ID = "INVALID_ID",
	INVALID_LABEL = "INVALID_LABEL",
}

/** A rejected rule, with the caller's input path that broke it. */
export class DomainError extends Error {
	readonly code: DomainErrorCode
	readonly field: string

	constructor(code: DomainErrorCode, field: string, message: string) {
		super(\`[\${code}]: \${message}\`)
		this.name = "DomainError"
		this.code = code
		this.field = field
	}
}

/** Input for \`create${name}\`. */
export interface ${name}Props {
	readonly id: string
	readonly label: string
}

/** A frozen \`${name}\` value. */
export interface ${name} {
	readonly id: string
	readonly label: string
}

/** Creates a frozen \`${name}\`, rejecting an empty id. */
export function create${name}(props: ${name}Props): ${name} {
	const id = props.id.trim()
	if (id.length === 0) {
		throw new DomainError(DomainErrorCode.INVALID_ID, "id", "${name} ID must be non-empty.")
	}
	return Object.freeze({ id, label: props.label.trim() })
}

/** Trims a \`${name}\` label, rejecting an empty one. */
export function format${name}Label(label: string): string {
	const trimmed = label.trim()
	if (trimmed.length === 0) {
		throw new DomainError(DomainErrorCode.INVALID_LABEL, "label", "${name} label must be non-empty.")
	}
	return trimmed
}
`
	const lower = name.charAt(0).toLowerCase() + name.slice(1)
	const test = `import { describe, expect, it } from "bun:test"
import { create${name}, DomainError, DomainErrorCode, format${name}Label } from "./index"

describe("create${name}", () => {
	it("creates a frozen ${name} with trimmed properties", () => {
		const ${lower} = create${name}({ id: " id-1 ", label: " Example " })
		expect(${lower}.id).toBe("id-1")
		expect(${lower}.label).toBe("Example")
		expect(Object.isFrozen(${lower})).toBe(true)
	})

	it("rejects an empty id with INVALID_ID", () => {
		const error = capture(() => create${name}({ id: "   ", label: "Test" }))
		expect(error).toBeInstanceOf(DomainError)
		expect((error as DomainError).code).toBe(DomainErrorCode.INVALID_ID)
		expect((error as DomainError).field).toBe("id")
	})
})

describe("format${name}Label", () => {
	it("trims a label", () => {
		expect(format${name}Label("  Example  ")).toBe("Example")
	})

	it("rejects an empty label with INVALID_LABEL", () => {
		const error = capture(() => format${name}Label("   "))
		expect((error as DomainError).code).toBe(DomainErrorCode.INVALID_LABEL)
		expect((error as DomainError).field).toBe("label")
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
