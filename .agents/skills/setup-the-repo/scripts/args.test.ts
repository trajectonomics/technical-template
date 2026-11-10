import { describe, expect, it } from "bun:test"
import { parseSetupArgs, parseTerms } from "./args"
import { errorOf } from "./testing"
import { SetupError } from "./types"

const defaults = {
	repoName: "trajectonomics/default",
	packageName: "@trajectonomics/default",
	description: "Default description",
}

describe("parseSetupArgs", () => {
	it("defaults to the core archetype and publishing on", () => {
		const parsed = parseSetupArgs([], defaults)
		expect(parsed.answers.archetype).toBe("core")
		expect(parsed.answers.enablePublish).toBe(true)
		expect(parsed.answers.storybook).toBe(false)
		expect(parsed.answers.domainTerms).toEqual([])
		expect(parsed.interactive).toBe(true)
	})

	it("rejects an unknown archetype instead of silently using core", () => {
		const error = errorOf(() => parseSetupArgs(["--archetype", "nope"], defaults))
		expect(error).toBeInstanceOf(SetupError)
		expect(error?.code).toBe("UNKNOWN_ARCHETYPE")
		expect(error?.field).toBe("archetype")
		expect(error?.message).toMatch(/core, cli, service, minimal, ui-library/)
	})

	it("parses every supported archetype", () => {
		for (const archetype of ["core", "cli", "service", "minimal", "ui-library"] as const) {
			expect(parseSetupArgs(["--archetype", archetype], defaults).answers.archetype).toBe(archetype)
		}
	})

	it("defaults publishing off for every non-core archetype", () => {
		for (const archetype of ["cli", "service", "minimal", "ui-library"] as const) {
			expect(parseSetupArgs(["--archetype", archetype], defaults).answers.enablePublish).toBe(false)
		}
	})

	it("rejects --publish true with ui-library and explains why", () => {
		const error = errorOf(() =>
			parseSetupArgs(["--archetype", "ui-library", "--publish", "true"], defaults),
		)
		expect(error?.code).toBe("PUBLISH_WORKSPACE_UNSUPPORTED")
		expect(error?.field).toBe("publish")
		expect(error?.message).toMatch(/shared publish workflow/)
	})

	it("accepts repeatable --term values in order", () => {
		const parsed = parseSetupArgs(
			["--term", "Invoice=A bill.", "--term", "Tax Rate=A percentage."],
			defaults,
		)
		expect(parsed.answers.domainTerms).toEqual([
			{ term: "Invoice", definition: "A bill." },
			{ term: "Tax Rate", definition: "A percentage." },
		])
	})

	it("invents no term when none is given", () => {
		expect(parseSetupArgs(["--non-interactive"], defaults).answers.domainTerms).toEqual([])
	})

	it("rejects an empty definition", () => {
		const error = errorOf(() => parseSetupArgs(["--term", "Invoice="], defaults))
		expect(error?.code).toBe("EMPTY_DEFINITION")
		expect(error?.field).toBe("term")
		expect(error?.message).toMatch(/needs a definition/)
		expect(errorOf(() => parseSetupArgs(["--term", "Invoice=   "], defaults))?.code).toBe(
			"EMPTY_DEFINITION",
		)
	})

	it("rejects a term without a definition separator", () => {
		const error = errorOf(() => parseSetupArgs(["--term", "Invoice"], defaults))
		expect(error?.code).toBe("MALFORMED_TERM")
		expect(error?.field).toBe("term")
		expect(error?.message).toMatch(/Name=Definition/)
	})

	it("rejects a term with an empty name", () => {
		const error = errorOf(() => parseSetupArgs(["--term", "=Definition"], defaults))
		expect(error?.code).toBe("INVALID_TERM")
		expect(error?.field).toBe("term")
	})

	it("rejects an unknown boolean value for a flag", () => {
		const error = errorOf(() => parseSetupArgs(["--publish", "maybe"], defaults))
		expect(error?.code).toBe("INVALID_FLAG")
		expect(error?.field).toBe("publish")
	})

	it("reads --storybook false and ignores it for other archetypes", () => {
		expect(
			parseSetupArgs(["--archetype", "ui-library", "--storybook", "false"], defaults).answers
				.storybook,
		).toBe(false)
		expect(parseSetupArgs(["--archetype", "ui-library"], defaults).answers.storybook).toBe(true)
		expect(parseSetupArgs(["--archetype", "core", "--storybook", "true"], defaults).answers.storybook).toBe(false)
	})

	it("reads --co-author repeatable and --no-commit", () => {
		const parsed = parseSetupArgs(
			["--co-author", "Ada Lovelace <ada@example.com>", "--co-author", "Bun <bun@example.com>", "--no-commit"],
			defaults,
		)
		expect(parsed.answers.coAuthors).toEqual([
			"Ada Lovelace <ada@example.com>",
			"Bun <bun@example.com>",
		])
		expect(parsed.noCommit).toBe(true)
	})

	it("forces a scripted run when --name is given", () => {
		const parsed = parseSetupArgs(["--name", "trajectonomics/thing"], defaults)
		expect(parsed.interactive).toBe(false)
		expect(parsed.answers.repoName).toBe("trajectonomics/thing")
	})
})

describe("parseTerms", () => {
	it("splits at the first equals sign", () => {
		expect(parseTerms(["Formula=Amount = price * quantity"])).toEqual([
			{ term: "Formula", definition: "Amount = price * quantity" },
		])
	})
})
