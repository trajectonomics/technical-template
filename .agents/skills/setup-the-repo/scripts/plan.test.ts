import { describe, expect, it } from "bun:test"
import { buildPlan, starterName } from "./plan"
import { templateSnapshot, testAnswers } from "./testing"
import { ARCHETYPES } from "./types"

describe("buildPlan", () => {
	const snapshot = templateSnapshot()

	it.each(ARCHETYPES)("writes a package.json and an ADR for %s", (archetype) => {
		const plan = buildPlan(
			testAnswers({ archetype, enablePublish: false, storybook: true }),
			snapshot,
		)
		expect(plan.writes["package.json"]).toBeDefined()
		expect(plan.writes["docs/adr/0001-template-architecture-decisions.md"]).toBeUndefined()
		expect(plan.deletes).toContain("docs/adr/0001-template-architecture-decisions.md")
		expect(plan.writes["GLOSSARY.md"]).toContain("### Invoice")
	})

	it.each(ARCHETYPES)("does not mention Entity for %s unless the term is Entity", (archetype) => {
		const plan = buildPlan(
			testAnswers({ archetype, enablePublish: false, storybook: true }),
			snapshot,
		)
		for (const content of Object.values(plan.writes)) {
			expect(content).not.toContain("Entity")
		}
	})

	it("keeps Entity when the user's first term is Entity", () => {
		const plan = buildPlan(
			testAnswers({
				archetype: "core",
				domainTerms: [{ term: "Entity", definition: "A domain object with identity." }],
			}),
			snapshot,
		)
		expect(plan.writes["src/index.ts"]).toContain("createEntity")
	})

	it("rewrites package scripts and the test tsconfig for single-package archetypes", () => {
		const plan = buildPlan(testAnswers({ archetype: "core" }), snapshot)
		const pkg = JSON.parse(plan.writes["package.json"] ?? "{}")
		expect(pkg.scripts.setup).toBeUndefined()
		expect(pkg.scripts["verify:setup"]).toBeUndefined()
		expect(pkg.scripts.test).toBe("bun test")
		const tsconfig = JSON.parse(plan.writes["tsconfig.test.json"] ?? "{}")
		expect(tsconfig.include).toEqual(["src", "scripts"])
	})

	it("gives the cli archetype a bin and a private package when publishing is off", () => {
		const plan = buildPlan(
			testAnswers({ archetype: "cli", packageName: "@trajectonomics/tool", enablePublish: false }),
			snapshot,
		)
		const pkg = JSON.parse(plan.writes["package.json"] ?? "{}")
		expect(pkg.bin).toEqual({ tool: "./dist/index.cjs" })
		expect(pkg.private).toBe(true)
		expect(plan.deletes).toContain(".github/workflows/release.yml")
	})

	it("keeps publishing when the core archetype publishes", () => {
		const plan = buildPlan(testAnswers({ archetype: "core", enablePublish: true }), snapshot)
		const pkg = JSON.parse(plan.writes["package.json"] ?? "{}")
		expect(pkg.publishConfig).toBeDefined()
		expect(plan.deletes).not.toContain(".github/workflows/release.yml")
	})

	it("makes the service archetype private", () => {
		const plan = buildPlan(testAnswers({ archetype: "service" }), snapshot)
		const pkg = JSON.parse(plan.writes["package.json"] ?? "{}")
		expect(pkg.private).toBe(true)
		expect(pkg.publishConfig).toBeUndefined()
	})

	it("derives the minimal starter from nothing but the package name", () => {
		const plan = buildPlan(testAnswers({ archetype: "minimal" }), snapshot)
		expect(plan.writes["src/index.ts"]).toContain("export function greeting")
	})
})

describe("ui-library plan", () => {
	const snapshot = templateSnapshot()
	const plan = buildPlan(
		testAnswers({ archetype: "ui-library", enablePublish: false, storybook: true }),
		snapshot,
	)

	it("writes a private workspace root with per-package scripts", () => {
		const root = JSON.parse(plan.writes["package.json"] ?? "{}")
		expect(root.private).toBe(true)
		expect(root.workspaces).toEqual(["packages/*", "apps/*"])
		expect(root.scripts.check).toContain("bun run lint")
		expect(root.scripts.typecheck).toBe("bun run --filter '*' typecheck")
		expect(plan.writes["tsconfig.base.json"]).toContain("tsconfig/web.json")
	})

	it("writes the core and Svelte packages, named after the first term", () => {
		expect(plan.writes["packages/core/package.json"]).toContain('"@trajectonomics/example"')
		expect(plan.writes["packages/svelte/package.json"]).toContain(
			'"@trajectonomics/example-svelte"',
		)
		expect(plan.writes["packages/svelte/src/invoice/invoice.svelte"]).toBeDefined()
		expect(plan.writes["packages/svelte/tests/invoice.test.ts"]).toBeDefined()
		expect(plan.writes["packages/core/src/index.ts"]).toContain("createInvoice")
	})

	it("writes the Storybook app when storybook is on", () => {
		expect(plan.writes["apps/storybook/package.json"]).toBeDefined()
		expect(plan.writes["apps/storybook/src/Invoice.stories.ts"]).toBeDefined()
	})

	it("leaves the Storybook app out when storybook is off", () => {
		const without = buildPlan(
			testAnswers({ archetype: "ui-library", enablePublish: false, storybook: false }),
			snapshot,
		)
		expect(without.writes["apps/storybook/package.json"]).toBeUndefined()
		expect(without.writes["packages/svelte/package.json"]).toBeDefined()
		expect(without.writes["README.md"]).not.toContain("apps/storybook")
	})

	it("deletes the single-package files the workspace replaces", () => {
		for (const path of [
			"src/index.ts",
			"src/index.test.ts",
			"tsdown.config.ts",
			"tsconfig.json",
			"tsconfig.test.json",
			"scripts/version.ts",
			"scripts/version.test.ts",
			".github/workflows/release.yml",
		]) {
			expect(plan.deletes).toContain(path)
		}
	})

	it("records its workspace and tooling decisions as ADRs", () => {
		expect(plan.writes["docs/adr/0001-workspace-shape.md"]).toContain("Bun workspace")
		expect(plan.writes["docs/adr/0002-tooling-split.md"]).toContain("Vitest")
	})

	it("rewords AGENTS.md rule 4 for Vitest", () => {
		expect(plan.writes["AGENTS.md"]).toContain("Vitest through `bun run test`")
	})
})

describe("starterName", () => {
	it("uses the first term", () => {
		expect(
			starterName(
				testAnswers({
					domainTerms: [
						{ term: "Tax Rate", definition: "A percentage." },
						{ term: "Invoice", definition: "A bill." },
					],
				}),
			),
		).toBe("TaxRate")
	})

	it("falls back when there are no terms", () => {
		expect(starterName(testAnswers({ domainTerms: [] }))).toBe("Example")
	})
})
