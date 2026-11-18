import { describe, expect, it } from "bun:test"
import { buildPlan } from "./plan"
import { errorOf, templateSnapshot, testAnswers } from "./testing"
import { ARCHETYPES, type Archetype } from "./types"

/** The top-level headings of a markdown file, in order. */
function headingsOf(markdown: string): string[] {
	return markdown.split("\n").filter((line) => line.startsWith("## "))
}

describe("the generated AGENTS.md", () => {
	const snapshot = templateSnapshot()
	const template = snapshot.files["AGENTS.md"] ?? ""
	/** The template's sections, with the setup checklist swapped for the repository answers. */
	const expectedHeadings = headingsOf(template).map((heading) =>
		heading === "## Checklist When Instantiating a New Repo" ? "## Repository Information" : heading,
	)

	it("rewords rule 4 for the Archetype that supplies one", () => {
		const plan = buildPlan(testAnswers({ archetype: "ui-library", storybook: true }), snapshot)
		expect(plan.writes["AGENTS.md"]).toContain("Vitest through `bun run test`")
	})

	it.each(ARCHETYPES)("keeps every section below the checklist for %s", (archetype) => {
		const plan = buildPlan(
			testAnswers({ archetype, enablePublish: false, storybook: true }),
			snapshot,
		)
		const agents = plan.writes["AGENTS.md"] ?? ""
		expect(headingsOf(agents)).toEqual(expectedHeadings)
		expect(agents).toContain(
			"gh api repos/trajectonomics/factory/contents/docs/dispatcher-runbook.md",
		)
		expect(agents).toContain("- Repository: https://github.com/trajectonomics/example")
		expect(agents).toContain("- Package: `@trajectonomics/example`")
		expect(agents).not.toContain("/setup-the-repo")
		expect(agents).not.toContain("bun run setup")
	})
})

describe("template AGENTS.md drift", () => {
	const snapshot = templateSnapshot()
	const template = snapshot.files["AGENTS.md"] ?? ""
	const cases: [string, Archetype, string | undefined][] = [
		["the intro line", "core", template.replace(/^Instructions for AI coding agents working in .*$/m, "")],
		["rule 4", "ui-library", template.replace(/^4\. Bun only: .*$/m, "")],
		[
			"the setup checklist",
			"core",
			template.replace("## Checklist When Instantiating a New Repo", "Checklist"),
		],
		["the bootstrap bullet", "core", template.replace(/^- \*\*Bootstrap Skill.*$/m, "")],
		["the file", "core", undefined],
	]

	it.each(cases)("fails when the template loses %s", (_name, archetype, content) => {
		const files: Record<string, string> = { ...snapshot.files }
		if (content === undefined) delete files["AGENTS.md"]
		else files["AGENTS.md"] = content
		const error = errorOf(() => buildPlan(testAnswers({ archetype }), { files }))
		expect(error?.code).toBe("TEMPLATE_AGENTS_DRIFT")
	})
})
